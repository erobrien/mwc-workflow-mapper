# -*- coding: utf-8 -*-
"""
mwc.py — CLI over the migration database (db/mwc.db).

The database is the source of truth for executing the 38→16 consolidation. This CLI
is how Fable (and you) read state, capture preserved message copy, lint brand voice,
advance build status, and check gates. It never touches GHL — it manages the PLAN.

Usage:
  python db/mwc.py status                         overall dashboard
  python db/mwc.py wf [NN]                         workflow + its sources + messages
  python db/mwc.py messages [--channel sms|email] [--nn NN] [--origin spec|captured|builder]
  python db/mwc.py capture NN sms "T+1d" "body..." --from "Legacy Workflow Name"
  python db/mwc.py lint                            brand-voice check on all messages
  python db/mwc.py approve <message_id>            mark a message approved
  python db/mwc.py set-status NN <build_status>    advance a target workflow
  python db/mwc.py gate <phase> pass|fail "evidence"
  python db/mwc.py gates                           gate board
  python db/mwc.py export [dir]                    dump messages to markdown + csv
"""
import sqlite3, sys, os, csv, re

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "mwc.db")

def db():
    con = sqlite3.connect(DB); con.row_factory = sqlite3.Row; return con

def log(con, action, detail):
    con.execute("INSERT INTO audit_log(action,detail) VALUES(?,?)",(action,detail))

# ---- brand-voice rules (engine-enforced) ----
BRAND = [
 (r"\bfree\b", "use 'no-cost' not 'free'"),
 (r"\bpatients?\b", "use 'member' not 'patient' (note: 'patient/sold' tag is exempt)"),
 (r"\bclinics?\b", "use 'center' not 'clinic'"),
 (r"—", "no em-dashes in SMS/email copy — use commas or periods"),
 (r"\[.+?\]\(.+?\)", "no markdown links — plain URLs only"),
 (r"\b(limited time|tonight only|ASAP|hurry|act now)\b", "no urgency theatre"),
 (r"\bHey (buddy|guys)\b", "no 'Hey buddy'/'Hey guys' — use first name"),
]
def lint_body(body):
    issues = []
    for pat, msg in BRAND:
        if re.search(pat, body, re.I):
            issues.append(msg)
    # required footer on substantive SMS
    if "866-344-4955" not in body and "unsubscrib" not in body.lower():
        issues.append("missing required footer 'Men's Wellness 866-344-4955'")
    return issues

def cmd_status(con):
    c = con.cursor()
    n = lambda q: c.execute(q).fetchone()[0]
    print("=== MWC Migration DB ===")
    print(f"Target workflows : 16   |   sources mapped: "
          f"{n('SELECT count(*) FROM source_workflows WHERE target_nn IS NOT NULL')}/"
          f"{n('SELECT count(*) FROM source_workflows')}")
    print(f"Messages         : {n('SELECT count(*) FROM messages')}  "
          f"(approved: {n(chr(39).join(['SELECT count(*) FROM messages WHERE status=','approved','']))})")
    print(f"Email builders   : {n('SELECT count(*) FROM email_builder_templates')} preserved")
    print(f"Frozen tags      : {n('SELECT count(*) FROM frozen_tags')}")
    print("\nBuild status by workflow:")
    rows = c.execute("SELECT nn,name,slice,build_status FROM target_workflows ORDER BY nn").fetchall()
    for r in rows:
        nmsg = con.execute("SELECT count(*) FROM messages WHERE target_nn=?", (r['nn'],)).fetchone()[0]
        print(f"  {r['nn']}  [{r['slice']}]  {r['build_status']:<9}  {nmsg} msg  {r['name']}")
    print("\nGates:")
    for r in c.execute("SELECT phase,status FROM gates ORDER BY id").fetchall():
        mark = {'pending':'·','passed':'PASS','failed':'FAIL','waived':'waived'}[r['status']]
        print(f"  [{mark:>6}] {r['phase']}")

def cmd_wf(con, nn=None):
    c = con.cursor()
    rows = c.execute("SELECT * FROM target_workflows WHERE (?1 IS NULL OR nn=?1) ORDER BY nn",(nn,)).fetchall()
    for w in rows:
        print(f"\n=== {w['name']}   [slice {w['slice']} · {w['build_status']}]")
        print(f"    trigger: {w['trigger']}")
        srcs = con.execute("SELECT name,disposition FROM source_workflows WHERE target_nn=? ORDER BY disposition",(w['nn'],)).fetchall()
        print(f"    combines ({len(srcs)}):")
        for s in srcs:
            print(f"      [{s['disposition']:<10}] {s['name']}")
        msgs = con.execute("SELECT id,channel,timing,subject,origin,status,brand_ok FROM messages WHERE target_nn=? ORDER BY channel,id",(w['nn'],)).fetchall()
        print(f"    messages ({len(msgs)}):")
        for m in msgs:
            bk = {1:'ok',0:'FLAG',None:'?'}[m['brand_ok']]
            print(f"      #{m['id']} {m['channel']:<5} [{m['origin']}/{m['status']}/{bk}] {m['timing']}"
                  + (f"  «{m['subject']}»" if m['subject'] else ""))

def cmd_messages(con, args):
    c = con.cursor()
    where, params = [], []
    if "--channel" in args: where.append("channel=?"); params.append(args[args.index("--channel")+1])
    if "--nn" in args: where.append("target_nn=?"); params.append(args[args.index("--nn")+1])
    if "--origin" in args: where.append("origin=?"); params.append(args[args.index("--origin")+1])
    q = "SELECT * FROM messages" + (" WHERE "+" AND ".join(where) if where else "") + " ORDER BY target_nn,channel,id"
    for m in c.execute(q, params):
        print(f"\n#{m['id']} · {m['target_nn']} · {m['channel'].upper()} · {m['timing']} · {m['origin']}/{m['status']}")
        if m['subject']: print(f"  subject: {m['subject']}")
        print("  " + m['body'].replace("\n","\n  "))

def cmd_capture(con, args):
    # capture NN channel timing body --from "Legacy WF"
    nn, channel, timing, body = args[0], args[1], args[2], args[3]
    src = args[args.index("--from")+1] if "--from" in args else None
    subj = args[args.index("--subject")+1] if "--subject" in args else None
    con.execute("""INSERT INTO messages(target_nn,channel,timing,subject,body,origin,source_workflow,status)
                   VALUES(?,?,?,?,?, 'captured', ?, 'draft')""",
                (nn,channel,timing,subj,body,src))
    log(con, "capture", f"{nn}/{channel}/{timing} from {src}")
    con.commit()
    print(f"captured message for {nn} ({channel}, {timing}) from «{src}». "
          "Brand lint:", lint_body(body) or "clean")

def cmd_lint(con):
    c = con.cursor()
    flagged = 0
    rows = c.execute("SELECT * FROM messages ORDER BY target_nn,id").fetchall()
    for m in rows:
        body = m['body']
        # exempt the literal protected tag token
        check = body.replace("patient/sold","")
        issues = lint_body(check)
        ok = 0 if issues else 1
        con.execute("UPDATE messages SET brand_ok=? WHERE id=?",(ok,m['id']))
        if issues:
            flagged += 1
            print(f"  FLAG #{m['id']} {m['target_nn']}/{m['channel']}/{m['timing']}: {'; '.join(issues)}")
    con.commit()
    total = c.execute("SELECT count(*) FROM messages").fetchone()[0]
    print(f"\nbrand-voice lint: {total-flagged}/{total} clean, {flagged} flagged")

def cmd_approve(con, mid):
    con.execute("UPDATE messages SET status='approved' WHERE id=?", (mid,))
    log(con,"approve",f"message {mid}"); con.commit()
    print(f"message #{mid} approved")

def cmd_set_status(con, nn, status):
    con.execute("UPDATE target_workflows SET build_status=?, updated_at=datetime('now') WHERE nn=?", (status,nn))
    log(con,"set-status",f"{nn} -> {status}"); con.commit()
    print(f"{nn} build_status = {status}")

def cmd_gate(con, phase, result, evidence=""):
    st = {'pass':'passed','fail':'failed','waive':'waived'}.get(result, result)
    con.execute("UPDATE gates SET status=?, evidence=?, decided_at=datetime('now') WHERE phase=?", (st,evidence,phase))
    log(con,"gate",f"{phase} -> {st}: {evidence}"); con.commit()
    print(f"gate {phase} = {st}")

def cmd_gates(con):
    for r in con.execute("SELECT * FROM gates ORDER BY id"):
        print(f"  [{r['status']:>7}] {r['phase']:<9} {r['name']}")
        print(f"            criteria: {r['criteria']}")
        if r['evidence']: print(f"            evidence: {r['evidence']}")

def cmd_export(con, outdir):
    os.makedirs(outdir, exist_ok=True)
    c = con.cursor()
    # markdown
    md = ["# MWC Message Library (preserved)\n"]
    for w in c.execute("SELECT * FROM target_workflows ORDER BY nn").fetchall():
        msgs = con.execute("SELECT * FROM messages WHERE target_nn=? ORDER BY channel,id",(w['nn'],)).fetchall()
        if not msgs: continue
        md.append(f"\n## {w['name']}\n")
        for m in msgs:
            md.append(f"**{m['channel'].upper()} · {m['timing']}** · _{m['origin']}/{m['status']}_"
                      + (f" · {m['source_workflow']}" if m['source_workflow'] else ""))
            if m['subject']: md.append(f"Subject: {m['subject']}")
            md.append("\n> " + m['body'].replace("\n","\n> ") + "\n")
    open(os.path.join(outdir,"messages.md"),"w",encoding="utf-8").write("\n".join(md))
    # csv
    with open(os.path.join(outdir,"messages.csv"),"w",newline="",encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["id","target_nn","channel","timing","subject","body","origin","source_workflow","status","brand_ok"])
        for m in c.execute("SELECT * FROM messages ORDER BY target_nn,id"):
            wr.writerow([m['id'],m['target_nn'],m['channel'],m['timing'],m['subject'],m['body'],
                         m['origin'],m['source_workflow'],m['status'],m['brand_ok']])
    print(f"exported messages.md + messages.csv to {outdir}")

def main():
    a = sys.argv[1:]
    if not a: print(__doc__); return
    con = db(); cmd = a[0]
    if cmd=="status": cmd_status(con)
    elif cmd=="wf": cmd_wf(con, a[1] if len(a)>1 else None)
    elif cmd=="messages": cmd_messages(con, a[1:])
    elif cmd=="capture": cmd_capture(con, a[1:])
    elif cmd=="lint": cmd_lint(con)
    elif cmd=="approve": cmd_approve(con, a[1])
    elif cmd=="set-status": cmd_set_status(con, a[1], a[2])
    elif cmd=="gate": cmd_gate(con, a[1], a[2], a[3] if len(a)>3 else "")
    elif cmd=="gates": cmd_gates(con)
    elif cmd=="export": cmd_export(con, a[1] if len(a)>1 else os.path.join(HERE,"export"))
    else: print("unknown command:", cmd); print(__doc__)
    con.close()

if __name__=="__main__":
    main()
