# -*- coding: utf-8 -*-
"""
Seed the MWC migration database (db/mwc.db) from:
  - the build-book data model (16 target workflows, their source maps, and message copy)
  - live API snapshots already in the repo (workflows.json, pipelines.json, email_builders.json)
  - the frozen engine tag surface

Idempotent: safe to re-run (uses INSERT OR REPLACE / OR IGNORE).
Run:  python db/seed.py
"""
import json, os, sqlite3, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DB = os.path.join(HERE, "mwc.db")

def J(path):
    p = os.path.join(ROOT, path)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None

# ---- The build book: 16 targets, sources (published-only), and message copy ----
# Mirrors diff-site/index.html DATA.wf, kept here as the executable source of truth.
TARGETS = [
 ("01","01. Lead Capture & Attribution","Form submit / inbound lead","C"),
 ("02","02. Non-Booked Recovery","Lead created, no appointment within 1h","E"),
 ("03","03. Appointment Reminders","Appointment booked (all 3 calendars)","B"),
 ("04","04. Medical Intake Chase","Appointment booked · stops on intake submit","B"),
 ("05","05. Appointment Outcome Router","Outcome reported","D"),
 ("06","06. Post-Visit Won — Onboarding & Review","Sale Outcome = Sold","D"),
 ("07","07. Post-Visit No-Sale Nurture","Sale Outcome = No-Sale (lostReason)","D"),
 ("08","08. No-Show & Cancellation Recovery","Appointment no-show or cancelled","D"),
 ("09","09. Long-Term Nurture","Tag status_nurture_longterm","E"),
 ("10","10. Feedback Survey","Post-visit","A"),
 ("11","11. Compliance & Errors","STOP / DND / bounce / MUT","A"),
 ("12","12. Call Disposition Handler","Softphone call disposition","A"),
 ("13","13. Ad-Platform Conversions","Stage → Booked / Won","C"),
 ("14","14. Ambassador Program","Ambassador signup","E"),
 ("15","15. PCC Referral Routing","PCC referral lead","E"),
 ("16","16. Comms Edge","IVR / chat / inbound","E"),
]

# (target_nn, source_name, disposition)  — published-only
SOURCES = [
 ("01","01A. Home Form and Source with Click ID","merge"),
 ("01","01B. Richmond Form and Source with Click ID","merge"),
 ("01","01C. VA Beach Form and Source with Click ID","merge"),
 ("01","01D. NPN Form and Source with Click ID","merge"),
 ("01","01E. Consultation Form and Source with Click ID","merge"),
 ("01","Form Submission — Internal Notification","merge"),
 ("02","02. NON BOOKED NEWLEADS","merge"),
 ("03","03. Appointment Booked","merge"),
 ("03","3a. Auto Confirm","retire"),
 ("03","03b. Unconfirmed Appointment – Confirmation Required","retire"),
 ("03","03c. Unconfirmed Reply Handler","retire"),
 ("03","03d. Update Appointment Status","retire"),
 ("04","04a. Intake Form Response","merge"),
 ("05","05. Clinic Appt Outcome","keep"),
 ("06","07. POST-VISIT - SHOWED Opportunities and For Review/Referral","merge"),
 ("07","(net-new — objection drafts excluded)","standalone"),
 ("08","Cancelled Appointments","merge"),
 ("08","Nurture: Missed Clinic Appointment","merge"),
 ("09","(net-new — nurture drafts excluded)","standalone"),
 ("10","After Appointment Feedback Survey Send","merge"),
 ("11","2. DNC/wrong number/SMS & Call Errors","merge"),
 ("11","3. Email Bounce","merge"),
 ("11","08. MUT (Medically Untreatable)","merge"),
 ("12","4a. Softphone Call Disposition – Workflow","merge"),
 ("12","4b. Disposition – Workflow (active)","merge"),
 ("12","Contact Center - Tag Assign","merge"),
 ("13","CAPI - Send Booked Call Data Back to Meta (Leads Moved To Booked Call)","merge"),
 ("13","Facebook CAPI - Send Booked Call Data Back to Meta","merge"),
 ("13","GHL Form Submitted - Google Ads","merge"),
 ("13","GHL Phone Call - Google Ads","merge"),
 ("13","GHL Website Chat - Google Ads","merge"),
 ("14","Ambassador Onboarding (Slug + Welcome)","merge"),
 ("14","Ambassador Patient Routing","merge"),
 ("14","Ambassador Reward Notification","merge"),
 ("14","Ambassador — In-Center Signup","merge"),
 ("15","PCC Referral Lead Routing","keep"),
 ("16","1. IVR - simultaneous","merge"),
 ("16","Chat Widget Out of Office Hours","merge"),
]

FOOT = "Men's Wellness, 866-344-4955"
# (target_nn, channel, timing, subject, body, origin)  origin='spec'
MESSAGES = [
 ("02","sms","T+1h",None,"Hi {{contact.first_name}}, it's Men's Wellness. You started booking a consultation but didn't finish. Grab a time here: bookmwc.com — "+FOOT,"spec"),
 ("02","sms","T+4h",None,"{{contact.first_name}}, still want to get scheduled? Same-week times are open at your nearest center: bookmwc.com — "+FOOT,"spec"),
 ("02","email","T+1d","Your consultation isn't booked yet","Hi {{contact.first_name}},\n\nYou're one step away. Pick a time that works and we'll take care of the rest.\n\nbookmwc.com\n\n"+FOOT,"spec"),
 ("02","sms","T+3d",None,"Last note from us, {{contact.first_name}} — your nearest center still has openings this week: bookmwc.com — "+FOOT,"spec"),
 ("03","sms","T-24h",None,"Hi {{contact.first_name}}, reminder of your Men's Wellness visit tomorrow at {{appointment.time}}, {{appointment.location}}. Reply if you need to reschedule. "+FOOT,"spec"),
 ("03","sms","T-4h",None,"See you today at {{appointment.time}}, {{contact.first_name}}. {{appointment.location}}. "+FOOT,"spec"),
 ("03","sms","T-1h",None,"Your visit is in about an hour, {{contact.first_name}}. We're at {{appointment.address}}. "+FOOT,"spec"),
 ("04","sms","On booking",None,"Hi {{contact.first_name}}, thanks for booking with Men's Wellness. Please complete your medical intake before your visit so we can prepare: bookmwc.com/intake — "+FOOT,"spec"),
 ("04","sms","T+1d",None,"{{contact.first_name}}, your intake isn't finished yet. It takes about 5 minutes and helps your provider get ready: bookmwc.com/intake — "+FOOT,"spec"),
 ("04","email","T+2d","Finish your medical intake before your visit","Hi {{contact.first_name}},\n\nYour provider prepares from your intake answers, so please complete it before you arrive. It takes about 5 minutes.\n\nbookmwc.com/intake\n\n"+FOOT,"spec"),
 ("04","sms","Morning of",None,"See you today, {{contact.first_name}}. Please finish your intake before you arrive: bookmwc.com/intake — "+FOOT,"spec"),
 ("06","sms","Day 0",None,"Welcome to Men's Wellness, {{contact.first_name}}! Your care team is set. Anything you need before you start, just reply. "+FOOT,"spec"),
 ("06","email","Day 0","Welcome to Men's Wellness","Hi {{contact.first_name}},\n\nWelcome aboard. Here's what to expect next and how to reach your care team.\n\n"+FOOT,"spec"),
 ("06","sms","Day 2",None,"{{contact.first_name}}, how was your experience with Men's Wellness? A quick rating helps us a lot: {{review_link}} — "+FOOT,"spec"),
 ("07","sms","Cost",None,"{{contact.first_name}}, we hear you on cost. There are flexible options most members don't realize — want me to walk you through them? "+FOOT,"spec"),
 ("07","sms","Timing",None,"No rush, {{contact.first_name}}. When you're ready to revisit your plan, we're here. "+FOOT,"spec"),
 ("07","sms","Partner",None,"{{contact.first_name}}, happy to share info you can review with your partner — just reply and I'll send it. "+FOOT,"spec"),
 ("08","sms","No-show +1h",None,"{{contact.first_name}}, we missed you today at Men's Wellness. Let's get you rescheduled — pick a new time: bookmwc.com — "+FOOT,"spec"),
 ("08","sms","Cancel +0",None,"No problem, {{contact.first_name}}. When you're ready, rebooking takes a minute: bookmwc.com — "+FOOT,"spec"),
 ("08","email","+1d","Let's get you rescheduled","Hi {{contact.first_name}},\n\nWe'd still love to see you. Here's the link to grab a new time at your nearest center.\n\nbookmwc.com\n\n"+FOOT,"spec"),
 ("09","sms","Hot",None,"{{contact.first_name}}, ready when you are — your nearest Men's Wellness center has openings this week: bookmwc.com — 866-344-4955","spec"),
 ("09","email","Warm","Still thinking it over?","Hi {{contact.first_name}},\n\nWhenever the timing's right, we're here to help. Here's what membership looks like.\n\n"+FOOT,"spec"),
 ("10","sms","Post-visit",None,"Thanks for visiting Men's Wellness, {{contact.first_name}}. One quick question on how we did: {{survey_link}} — "+FOOT,"spec"),
 ("11","sms","STOP",None,"You're unsubscribed and won't get further texts from Men's Wellness. Reply START to resume.","spec"),
 ("14","sms","Welcome",None,"Welcome to the Men's Wellness Ambassador program, {{contact.first_name}}! Your referral link: {{ambassador_link}} — 866-344-4955","spec"),
 ("16","sms","Missed call",None,"Sorry we missed your call! This is Men's Wellness — how can we help? Reply here and we'll get right back to you. 866-344-4955","spec"),
]

FROZEN_TAGS = ["chatbot_lead","src:bf-web","sniper_unconfirmed","sniper_failed_no_response",
               "funnel_entry_home_page","funnel_consultation_booked","appt_confirmed",
               "unconfirmed_appt","patient/sold","location_rva","location_vba","location_npn"]

GATES = [
 ("0.1","Revenue-integrity dashboard","3 consecutive clean daily snapshots"),
 ("0.2","Snapshot + write-scope probe","Full export saved; write scopes confirmed"),
 ("1.1","Foundation objects","14 fields + 3 pipelines + lost reasons verified; existing untouched"),
 ("2.1","Backfill dry-run","CSV reviewed, ≥20 rows spot-checked, reconciliation balances"),
 ("2.2","Backfill write","Post-write Σ-revenue matches approved CSV; dashboard clean next day"),
 ("slice-A","Slice A soak","1 week; dashboard clean; no member complaints"),
 ("slice-B","Slice B soak","1 week; show rate within 10% of baseline; intake completion visible"),
 ("slice-C","Slice C parity","5 consecutive days lead-count + conversion parity"),
 ("slice-D","Slice D regression","SHOWED never creates Won A&D; won-with-$0 trends to 0"),
 ("slice-E","Slice E soak","1 week; all 16 published; sources paused"),
 ("4.1","Dormant-engine check","Frozen tag-surface diff vs snapshot is clean"),
 ("5.1","Cleanup","Object counts hit target: 3 pipelines / 16 wf / ~9 forms / ~120 tags"),
]

def main():
    con = sqlite3.connect(DB)
    con.executescript(open(os.path.join(HERE,"schema.sql"),encoding="utf-8").read())
    c = con.cursor()

    # target workflows
    for nn,name,trig,slc in TARGETS:
        c.execute("INSERT OR REPLACE INTO target_workflows(nn,name,trigger,slice,updated_at) "
                  "VALUES(?,?,?,?,datetime('now'))",(nn,name,trig,slc))

    # source workflows — seed from API snapshot, then apply the map
    wf = J("audit/workflows.json")
    by_name = {}
    if wf:
        for w in wf.get("workflows",[]):
            if w.get("status")=="published":
                c.execute("INSERT OR REPLACE INTO source_workflows(id,name,status) VALUES(?,?,?)",
                          (w["id"],w["name"],w["status"]))
                by_name[w["name"]] = w["id"]
    # map dispositions (match by exact name where present; otherwise store name-only row)
    for nn,sname,disp in SOURCES:
        sid = by_name.get(sname)
        if sid:
            c.execute("UPDATE source_workflows SET target_nn=?,disposition=? WHERE id=?",(nn,disp,sid))
        else:
            c.execute("INSERT OR IGNORE INTO source_workflows(id,name,status,target_nn,disposition) "
                      "VALUES(?,?,?,?,?)",("syn:"+sname[:40],sname,"published",nn,disp))

    # messages
    for nn,ch,timing,subj,body,origin in MESSAGES:
        c.execute("INSERT OR IGNORE INTO messages(target_nn,channel,timing,subject,body,origin,status) "
                  "VALUES(?,?,?,?,?,?, 'draft')",(nn,ch,timing,subj,body,origin))

    # email builder templates
    eb = J("db/email_builders.json")
    if eb:
        for i,b in enumerate(eb.get("builders",[])):
            c.execute("INSERT OR REPLACE INTO email_builder_templates(id,name,last_updated,preview_url,raw_json) "
                      "VALUES(?,?,?,?,?)",(b.get("id") or f"eb{i}", b.get("name"),
                       b.get("lastUpdated"), b.get("previewUrl"), json.dumps(b)))

    # frozen tags
    for t in FROZEN_TAGS:
        c.execute("INSERT OR IGNORE INTO frozen_tags(tag) VALUES(?)",(t,))

    # gates
    for ph,name,crit in GATES:
        c.execute("INSERT OR IGNORE INTO gates(phase,name,criteria) VALUES(?,?,?)",(ph,name,crit))

    c.execute("INSERT INTO audit_log(action,detail) VALUES('seed','database seeded/refreshed')")
    con.commit()

    # summary
    def n(q): return c.execute(q).fetchone()[0]
    print("seeded db/mwc.db")
    print("  target_workflows :", n("SELECT count(*) FROM target_workflows"))
    print("  source_workflows :", n("SELECT count(*) FROM source_workflows"))
    print("  messages         :", n("SELECT count(*) FROM messages"),
          "(sms:", n("SELECT count(*) FROM messages WHERE channel='sms'"),
          "email:", n("SELECT count(*) FROM messages WHERE channel='email'"),")")
    print("  email_builders   :", n("SELECT count(*) FROM email_builder_templates"))
    print("  frozen_tags      :", n("SELECT count(*) FROM frozen_tags"))
    print("  gates            :", n("SELECT count(*) FROM gates"))
    con.close()

if __name__=="__main__":
    main()
