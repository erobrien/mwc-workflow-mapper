#!/usr/bin/env python3
"""Vendor conformance diff harness.

Compares a GoHighLevel (GHL) workflow extraction against the Men's Wellness
Centers (MWC) Target spec and emits a machine-readable conformance result
(JSON) plus a console summary.

The Target spec is embedded below as constants so this harness is portable and
can be run against any extraction directory. Source of truth for the constants:
the plan-workspace repo (data.json tobe_workflows / field_destinations /
decisions / guardrails, wf-diagrams.json, diagrams.json f/p, and the
SalesForm.tsx enum contract) at commit range 8a7e08b..e2c41ef.

Expected extraction directory layout (as produced by the capture tooling):
  sandbox_workflows_unique.json   list of {id, name, status, folder, updatedAt}
  full_<id>.json                  {workflowData, permissionMeta, triggers, ...}
  def_<id>.json                   {templates: [ ...step graph nodes... ]}

Usage:
  python3 scripts/vendor_diff.py <extraction_dir> [--json out.json] [--quiet]
"""

import argparse
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

# --------------------------------------------------------------------------- #
# Canonical Target spec (embedded; see module docstring for source)           #
# --------------------------------------------------------------------------- #

WF_OWNERS = {
    "WF-01": "Lead Capture and Attribution",
    "WF-02": "Non-Booked Recovery",
    "WF-03": "Booking Confirmation and Reminders",
    "WF-04": "Medical Intake Chase",
    "WF-05": "Clinic Outcome Router",
    "WF-06": "Post-Visit Won and Onboarding",
    "WF-07": "Post-Visit No-Sale Nurture",
    "WF-08": "No-Show and Cancel Recovery",
    "WF-09": "Long-Term Nurture",
    "WF-10": "Feedback Survey",
    "WF-11": "Compliance and Errors",
    "WF-12": "Call Disposition Handler",
    "WF-13": "Ad-Platform Conversions",
    "WF-14": "Ambassador Program",
    "WF-15": "PCC Referral Routing",
    "WF-16": "Comms Edge",
}

# The one canonical set of 35 Opportunity custom fields. monetary_value is a
# native GHL field and is intentionally NOT in this set.
CANONICAL_OPP_FIELDS = {
    "sale_outcome", "sale_type", "appt_status", "patient_care_consultant_id",
    "provider", "product_sold_1", "product_sold_2", "product_sold_3",
    "term_1", "term_2", "term_3", "price_1", "price_2", "price_3",
    "total_program_amount", "consultation_fee", "money_down", "discount_value",
    "discount_type", "pay_type", "nosale_reason", "nosale_reason_other",
    "referred_by", "consult_notes", "location", "emr_visit_id", "renewal_date",
    "visit_feedback_score", "call_disposition", "outcome_processed_at",
    "utm_source", "utm_campaign", "gclid", "fbclid", "lead_source",
}

# Enum contract (SalesForm.tsx). Values are the canonical codes.
ENUM_CONTRACT = {
    "sale_outcome": {"sold", "nosale", "mut", "mar"},
    "sale_type": {"new", "renewal"},
    "appt_status": {"showed", "no-show", "cancel", "reschedule"},
}

# Prose / legacy values that stand in for a canonical sale_outcome or
# appt_status code. Presence of any of these in an if/else condition, tag, or
# field write means the enum contract is not being honored.
PROSE_OUTCOME_VALUES = {
    "sold": "sale_outcome",
    "won": "sale_outcome",
    "no sale": "sale_outcome",
    "a&d": "sale_outcome",
    "a&d (advised and declined)": "sale_outcome",
    "advised and declined": "sale_outcome",
    "mut (medically untreatable)": "sale_outcome",
    "medically untreatable": "sale_outcome",
    "not qualified / mu": "sale_outcome",
    "medically unqualified": "sale_outcome",
    "mar (medically approved reserve)": "sale_outcome",
}
PROSE_APPT_VALUES = {
    "showed", "no show", "no-show", "cancelled", "canceled",
    "rescheduled", "reschedule",
}

# Tag registry conventions. Deny substrings / patterns indicate a legacy or
# off-registry tag. The registry uses snake_case outcome_* / source_* etc.
TAG_DENY_SUBSTRINGS = ["patient/", "patient ", "a&d", "advised"]
TAG_DENY_EXACT = {"status-sold", "status_sold", "ad", "ad_conversion"}
# Legacy objection tags replaced by the nosale_reason field in the Target.
TAG_LEGACY_PREFIXES = ["objection_"]

# Brand copy rules (member-facing SMS/email bodies).
BRAND_BANNED_WORDS = [
    (r"\bfree\b", 'the word "free"'),
    (r"\bguys?\b", 'the word "guy/guys"'),
    (r"\bpatients?\b", 'the word "patient/patients" (use "members")'),
]
# Symptom / clinical language that should not appear in SMS.
SYMPTOM_TERMS = [
    "testosterone", "low t", "low-t", "erectile", "\bed\b", "libido",
    "hormone", "weight loss", "semaglutide", "trt", "blood test", "lab result",
]
EMDASH = "—"
ENDASH = "–"
STOP_MARKERS = ["reply stop", "text stop", "txt stop", "stop to opt", "reply 'stop'"]

# --------------------------------------------------------------------------- #
# Owner mapping                                                               #
# --------------------------------------------------------------------------- #

# Ordered (regex, wf) rules. First match wins. Tuned for both the vendor's
# organized folders (00-07) and the legacy names parked in "09 Other".
OWNER_RULES = [
    (r"capi|conversion[s]?\s*api|conversions?\b.*meta|qualified\s*meta|unqualified", "WF-13"),
    (r"ambassador|reward notification|slug \+ welcome|enrollment", "WF-14"),
    (r"\breferral\b|referrer|affiliate lead|pcc referral|referral activation|referral qualification", "WF-15"),
    (r"disposition router|clinic appt outcome|clinic appointment outcome|appt outcome|outcome router|price calculator", "WF-05"),
    (r"softphone|call disposition|disposition [–-] workflow|dispositions relevant tag", "WF-12"),
    (r"\bintake\b", "WF-04"),
    (r"non[\s-]?booked|48 hour recovery", "WF-02"),
    (r"no[\s-]?show|missed clinic|missed appointment|no-show recovery|cancelled appointments|\bcancel", "WF-08"),
    (r"confirm|booking|appointment booked|unconfirmed|auto confirm|reminder|update appointment status", "WF-03"),
    (r"feedback|survey|review", "WF-10"),
    (r"retention|renewal", "WF-06"),
    (r"long[\s-]?term nurture|nurture (cold|warm|hot)|status_nurture_longterm|long term follow", "WF-09"),
    (r"post-visit|showed opportunities|onboarding|\bwon\b", "WF-06"),
    (r"a&d|advised and declined|no[\s-]?sale|nosale|objection|\bmut\b|medically untreatable|\bmu\b|medically unqualified", "WF-07"),
    (r"dnc|\bdnd\b|bounce|email error|sms & call error|call error|out of office|compliance|system_mut|remove all workflows|stop", "WF-11"),
    (r"ivr|missed call|text[\s-]?back|chat widget|internal notification|contact center|tag assign", "WF-16"),
    (r"lead capture|new lead|form and source|attribution|click id|source with click|qualification form|funnel page 1", "WF-01"),
]

FOLDER_HINT = {
    "00": "WF-01", "01": "WF-01", "02": "WF-03", "03": "WF-03",
    "04": "WF-08", "05": "WF-05", "06": "WF-06", "07": "WF-01",
}

LOCATION_RE = re.compile(
    r"\b(newport news|newport|npn|richmond|rva|virginia beach|va beach|vba|virtual)\b", re.I)
UNNAMED_RE = re.compile(r"new workflow\s*[:#]", re.I)


def is_legacy_folder(folder):
    f = (folder or "").strip().lower()
    return f.startswith("09 other") and "affiliate" not in f


def is_affiliate_folder(folder):
    return "affiliate" in (folder or "").lower()


def map_owner(name, folder):
    """Return (wf_key_or_None, confidence, reason)."""
    n = (name or "").lower()
    for pat, wf in OWNER_RULES:
        if re.search(pat, n):
            return wf, "name", "matched /%s/" % pat
    # fall back to the numbered folder prefix for the organized build
    f = (folder or "").strip()
    m = re.match(r"(\d\d)", f)
    if m and m.group(1) in FOLDER_HINT:
        return FOLDER_HINT[m.group(1)], "folder", "folder prefix %s" % m.group(1)
    return None, "none", "no rule matched"


# --------------------------------------------------------------------------- #
# Node traversal helpers                                                       #
# --------------------------------------------------------------------------- #

def iter_conditions(attributes):
    for b in (attributes.get("branches") or []):
        for seg in (b.get("segments") or []):
            for c in (seg.get("conditions") or []):
                yield c


def collect_nodes(templates):
    """Bucket a template list by node type for easy checking."""
    buckets = defaultdict(list)
    for t in templates or []:
        buckets[t.get("type")].append(t)
    return buckets


def html_to_text(html):
    txt = re.sub(r"<[^>]+>", " ", html or "")
    txt = txt.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", txt).strip()


def message_bodies(buckets):
    """Yield (channel, text, raw_node) for every sms/email in the workflow."""
    for n in buckets.get("sms", []):
        yield "sms", (n.get("attributes") or {}).get("body") or "", n
    for n in buckets.get("email", []):
        a = n.get("attributes") or {}
        body = html_to_text(a.get("html") or "") + " " + (a.get("subject") or "")
        yield "email", body.strip(), n


# --------------------------------------------------------------------------- #
# Loader                                                                       #
# --------------------------------------------------------------------------- #

def load_extraction(ext_dir):
    idx_path = os.path.join(ext_dir, "sandbox_workflows_unique.json")
    if not os.path.isfile(idx_path):
        # tolerate other index names
        cands = glob.glob(os.path.join(ext_dir, "*workflows*unique*.json")) or \
                glob.glob(os.path.join(ext_dir, "*workflows*.json"))
        if not cands:
            raise SystemExit("No workflow index JSON found in %s" % ext_dir)
        idx_path = cands[0]
    index = json.load(open(idx_path))
    workflows = []
    for meta in index:
        wid = meta.get("id")
        def_path = os.path.join(ext_dir, "def_%s.json" % wid)
        full_path = os.path.join(ext_dir, "full_%s.json" % wid)
        templates = []
        if os.path.isfile(def_path):
            try:
                templates = (json.load(open(def_path)) or {}).get("templates", [])
            except (ValueError, OSError):
                templates = []
        triggers = []
        if os.path.isfile(full_path):
            try:
                triggers = (json.load(open(full_path)) or {}).get("triggers", [])
            except (ValueError, OSError):
                triggers = []
        workflows.append({
            "id": wid,
            "name": meta.get("name", ""),
            "status": meta.get("status", ""),
            "folder": meta.get("folder", ""),
            "updatedAt": meta.get("updatedAt", ""),
            "templates": templates,
            "triggers": triggers,
            "buckets": collect_nodes(templates),
        })
    return workflows


# --------------------------------------------------------------------------- #
# Findings                                                                     #
# --------------------------------------------------------------------------- #

SEV_ORDER = {"blocker": 0, "major": 1, "minor": 2}


def finding(check, sev, wf, wname, wid, what, evidence, fix):
    return {
        "check": check, "severity": sev, "wf": wf,
        "workflow": wname, "workflow_id": wid,
        "issue": what, "evidence": evidence, "fix": fix,
    }


# --------------------------------------------------------------------------- #
# Check A: structure & anti-patterns                                          #
# --------------------------------------------------------------------------- #

def check_structure(workflows):
    findings = []
    for w in workflows:
        name, folder = w["name"], w["folder"]
        legacy = is_legacy_folder(folder)
        # per-location clones in the organized 00 / 04 folders
        fpref = re.match(r"(\d\d)", folder.strip())
        if not legacy and fpref and fpref.group(1) in ("00", "04") and LOCATION_RE.search(name):
            wf = "WF-01" if fpref.group(1) == "00" else "WF-08"
            findings.append(finding(
                "A-structure", "blocker", wf, name, w["id"],
                "Per-location workflow clone violates the %s consolidation" % wf,
                'Folder "%s" / name "%s"' % (folder, name),
                "Delete the per-location clones and run a single parameterized %s that "
                "reads opportunity.location; do not clone by city." % wf))
        # unnamed workflow
        if UNNAMED_RE.search(name):
            sev = "blocker" if not legacy else "minor"
            findings.append(finding(
                "A-structure", sev, None, name, w["id"],
                "Unnamed workflow (auto-generated placeholder name)",
                'name "%s", status=%s, folder "%s"' % (name, w["status"], folder),
                "Name it to its WF-01..16 owner or delete it. Confirm intent before "
                "retiring if it is published."))
    # 09 Other legacy import census
    legacy = [w for w in workflows if is_legacy_folder(w["folder"])]
    if legacy:
        pub = sum(1 for w in legacy if w["status"] == "published")
        findings.append(finding(
            "A-structure", "major", None, "09 Other (%d workflows)" % len(legacy), None,
            "Large legacy import block parked in '09 Other' pollutes the account",
            "%d workflows in '09 Other' (%d published, %d draft); sample names include "
            "numbered legacy imports like '01. NON BOOKED NEWLEADS', '05. Clinic Appt "
            "Outcome', '08. MUT (Medically Untreatable)'" % (len(legacy), pub, len(legacy) - pub),
            "Confirm which (if any) are live dependencies, then archive or delete the "
            "legacy import block so only the WF-01..16 build remains."))
    return findings


# --------------------------------------------------------------------------- #
# Check B: enum contract                                                       #
# --------------------------------------------------------------------------- #

def check_enums(workflows):
    findings = []
    for w in workflows:
        seen_prose = []
        contact_outcome = []
        for n in w["buckets"].get("if_else", []):
            for c in iter_conditions(n.get("attributes") or {}):
                val = str(c.get("conditionValue") or "").strip()
                ctype = c.get("conditionType")
                low = val.lower()
                if low in PROSE_OUTCOME_VALUES:
                    seen_prose.append((val, ctype))
                    if ctype == "contact_detail":
                        contact_outcome.append(val)
        # de-dupe
        uniq = sorted(set(v for v, _ in seen_prose))
        if uniq:
            findings.append(finding(
                "B-enum", "blocker",
                map_owner(w["name"], w["folder"])[0], w["name"], w["id"],
                "Sale outcome branched on prose values, not the canonical codes "
                "sold|nosale|mut|mar",
                "if/else conditions test %s" % ", ".join('"%s"' % v for v in uniq[:6]),
                "Rewrite the opportunity field sale_outcome to store codes "
                "(sold|nosale|mut|mar) and branch on those codes."))
        if contact_outcome:
            findings.append(finding(
                "B-enum", "blocker",
                map_owner(w["name"], w["folder"])[0], w["name"], w["id"],
                "Sale outcome is read from a CONTACT field (the defect the Target kills)",
                "contact_detail condition on outcome value(s) %s" %
                ", ".join('"%s"' % v for v in sorted(set(contact_outcome))[:4]),
                "Move sale_outcome to the Opportunity; the PCC Sales Form is the sole "
                "writer. Branch on the opportunity field, never a contact field."))
    # WF-05 must gate on appt_status first
    routers = [w for w in workflows
               if map_owner(w["name"], w["folder"])[0] == "WF-05"
               and not is_legacy_folder(w["folder"])]
    for w in routers:
        first_conds = []
        for n in w["buckets"].get("if_else", []):
            for c in iter_conditions(n.get("attributes") or {}):
                first_conds.append(c)
        gates_appt = any(
            (c.get("conditionType") == "appointment") or
            ("appt" in str(c.get("conditionValue")).lower()) or
            (str(c.get("conditionValue")).lower() in PROSE_APPT_VALUES)
            for c in first_conds)
        if not gates_appt:
            findings.append(finding(
                "B-enum", "blocker", "WF-05", w["name"], w["id"],
                "WF-05 does not gate on appt_status before routing outcome",
                "no appointment / appt_status condition found among %d if/else "
                "conditions" % len(first_conds),
                "Gate first on appt_status: showed -> outcome routing; no-show/cancel "
                "-> WF-08; reschedule -> WF-03. Only then read sale_outcome."))
    return findings


# --------------------------------------------------------------------------- #
# Check C: field model                                                         #
# --------------------------------------------------------------------------- #

CONTACT_SALE_TOKENS = [
    "total_program_amount", "sale_outcome", "product_sold", "treatment_cost",
    "pay_type", "consultation_fee", "sale_type", "money_down", "renewal_date",
]


def check_fields(workflows):
    findings = []
    for w in workflows:
        b = w["buckets"]
        # create_opportunity pulling sale data from the contact (aggregate per workflow)
        hits = set()
        node_count = 0
        for n in b.get("create_opportunity", []) + b.get("internal_create_opportunity", []):
            a = n.get("attributes") or {}
            blob = json.dumps(a)
            node_hits = [tok for tok in CONTACT_SALE_TOKENS
                         if ("{{contact.%s" % tok) in blob or ("contact.%s" % tok) in blob]
            if node_hits:
                node_count += 1
                hits.update(node_hits)
        if hits:
            findings.append(finding(
                "C-field", "major",
                map_owner(w["name"], w["folder"])[0], w["name"], w["id"],
                "Opportunity populated from contact-level sale fields",
                '%d opportunity node(s) reference %s' %
                (node_count, ", ".join("{{contact.%s}}" % t for t in sorted(hits)[:5])),
                "Store the sale on the Opportunity; the PCC Sales Form writes the "
                "35 canonical fields directly. Do not copy sale data off the Contact."))
    # WF-05 idempotency + renewal_date; WF-01 attribution copy at create
    def owner_wfs(wf):
        return [w for w in workflows
                if map_owner(w["name"], w["folder"])[0] == wf
                and not is_legacy_folder(w["folder"])]

    for w in owner_wfs("WF-05"):
        blob = json.dumps(w["templates"])
        if "outcome_processed_at" not in blob:
            findings.append(finding(
                "C-field", "major", "WF-05", w["name"], w["id"],
                "No outcome_processed_at idempotency stamp in the outcome router",
                "token 'outcome_processed_at' not found in the step graph",
                "Check outcome_processed_at at entry; skip re-routing and CAPI if set; "
                "stamp it after processing so edits do not double-fire."))
        if "renewal_date" not in blob:
            findings.append(finding(
                "C-field", "major", "WF-05", w["name"], w["id"],
                "Won branch does not set renewal_date",
                "token 'renewal_date' not found in the step graph",
                "On every Won, set renewal_date = Won date + term_1."))
    for w in owner_wfs("WF-01"):
        has_create = bool(w["buckets"].get("create_opportunity") or
                          w["buckets"].get("internal_create_opportunity"))
        blob = json.dumps(w["templates"]).lower()
        copies_attr = any(tok in blob for tok in ["utm_source", "gclid", "fbclid", "lead_source"])
        if has_create and not copies_attr:
            findings.append(finding(
                "C-field", "major", "WF-01", w["name"], w["id"],
                "Attribution not copied onto the Opportunity at create",
                'creates an opportunity but no utm_source/gclid/fbclid/lead_source '
                'write found',
                "Copy utm_source, utm_campaign, gclid, fbclid, lead_source onto the "
                "Opportunity at create so win/loss rolls up by campaign."))
    return findings


# --------------------------------------------------------------------------- #
# Check D: journey mechanics                                                   #
# --------------------------------------------------------------------------- #

def _sends_messages(b):
    return bool(b.get("sms") or b.get("email"))


def _windowed_waits(b):
    good, bad = 0, 0
    for n in b.get("wait", []):
        win = (n.get("attributes") or {}).get("window") or {}
        if win.get("start") and win.get("end"):
            good += 1
            days = win.get("days") or []
            if set(days) and not ({0, 6} & set(days)):
                bad += 1  # weekday-only window
    return good, bad


def check_journey(workflows):
    findings = []
    for w in workflows:
        wf = map_owner(w["name"], w["folder"])[0]
        b = w["buckets"]
        legacy = is_legacy_folder(w["folder"])
        blob = json.dumps(w["templates"]).lower()
        # quiet hours on messaging workflows
        if _sends_messages(b) and not legacy:
            good, weekday_only = _windowed_waits(b)
            if good == 0:
                findings.append(finding(
                    "D-journey", "major", wf, w["name"], w["id"],
                    "Messaging workflow has no quiet-hours send window",
                    "%d SMS + %d email sends, 0 waits carry an 08:00-21:00 window" %
                    (len(b.get("sms", [])), len(b.get("email", []))),
                    "Put an 8:00 AM to 9:00 PM Contact Timezone window on every "
                    "messaging step (TCPA quiet hours)."))
            elif weekday_only:
                findings.append(finding(
                    "D-journey", "minor", wf, w["name"], w["id"],
                    "Quiet-hours window is weekday-only",
                    "send window days exclude weekends",
                    "Quiet hours apply every day; include weekends unless a business "
                    "rule says otherwise."))
        # WF-08 early-exit on rebook
        if wf == "WF-08" and not legacy:
            has_exit = bool(b.get("workflow_goal") or b.get("remove_from_workflow")) or \
                ("booked" in blob or "rebook" in blob or "goal" in blob)
            if not has_exit:
                findings.append(finding(
                    "D-journey", "major", "WF-08", w["name"], w["id"],
                    "No early-exit when the member rebooks",
                    "no workflow goal / remove-from-workflow / rebook trigger found",
                    "Add a goal that exits the recovery sequence the moment a new "
                    "appointment is booked, and hand back to WF-03."))
        # WF-03 cancel-exit
        if wf == "WF-03" and not legacy:
            handles_cancel = ("cancel" in blob) or any(
                (n.get("attributes") or {}).get("status_type") in ("cancelled", "canceled")
                for n in b.get("update_appointment_status", []))
            if not handles_cancel:
                findings.append(finding(
                    "D-journey", "major", "WF-03", w["name"], w["id"],
                    "No cancel-exit path in booking/confirmation",
                    "no cancel handling found in the step graph",
                    "Halt reminders on cancel and hand off to WF-08."))
    # STOP / DND handling should exist somewhere in the build
    any_dnd = any(w["buckets"].get("dnd_contact") for w in workflows
                  if not is_legacy_folder(w["folder"]))
    if not any_dnd:
        findings.append(finding(
            "D-journey", "major", "WF-11", "(build-wide)", None,
            "No DND action found in the organized build",
            "no dnd_contact node in folders 00-07",
            "WF-11 must own DND/STOP; enable DND on opt-out and honor it everywhere."))
    return findings


# --------------------------------------------------------------------------- #
# Check E: copy / brand                                                        #
# --------------------------------------------------------------------------- #

def check_copy(workflows):
    findings = []
    for w in workflows:
        wf = map_owner(w["name"], w["folder"])[0]
        legacy = is_legacy_folder(w["folder"])
        sms_texts = []
        for channel, text, node in message_bodies(w["buckets"]):
            if not text:
                continue
            low = text.lower()
            if channel == "sms":
                sms_texts.append(text)
            # banned brand words
            for pat, label in BRAND_BANNED_WORDS:
                if re.search(pat, low):
                    findings.append(finding(
                        "E-copy", "minor" if legacy else "major", wf, w["name"], w["id"],
                        "Off-brand copy: %s in %s body" % (label, channel),
                        '"%s"' % _quote(text, pat),
                        'Replace with brand-approved wording ("members", not "patients"; '
                        'drop "free" and "guys").'))
            # em / en dashes
            if EMDASH in text or ENDASH in text:
                findings.append(finding(
                    "E-copy", "minor", wf, w["name"], w["id"],
                    "Em-dash / en-dash in %s body" % channel,
                    '"%s"' % _quote_char(text, EMDASH if EMDASH in text else ENDASH),
                    "Use commas, colons, or periods; no em-dashes in member copy."))
            # symptom language in SMS
            if channel == "sms":
                for term in SYMPTOM_TERMS:
                    if re.search(term, low):
                        findings.append(finding(
                            "E-copy", "major", wf, w["name"], w["id"],
                            "Clinical / symptom language in SMS",
                            'term "%s" in "%s"' % (term.strip("\\b"), text[:90]),
                            "Keep SMS free of clinical/symptom detail for privacy; keep "
                            "it generic and compliant."))
        # missing Reply STOP anywhere in an SMS sequence
        if sms_texts and not legacy:
            joined = " ".join(sms_texts).lower()
            if not any(m in joined for m in STOP_MARKERS):
                findings.append(finding(
                    "E-copy", "major", wf, w["name"], w["id"],
                    "No opt-out language in the SMS sequence",
                    "%d SMS bodies, none contain a Reply STOP notice" % len(sms_texts),
                    'Include "Reply STOP to opt out" in the first SMS of every sequence.'))
    return findings


def _quote(text, pat):
    m = re.search(pat, text, re.I)
    if not m:
        return text[:80]
    s = max(0, m.start() - 30)
    e = min(len(text), m.end() + 30)
    return ("..." if s > 0 else "") + text[s:e].strip() + ("..." if e < len(text) else "")


def _quote_char(text, ch):
    i = text.find(ch)
    s = max(0, i - 30)
    e = min(len(text), i + 30)
    return ("..." if s > 0 else "") + text[s:e].strip() + ("..." if e < len(text) else "")


# --------------------------------------------------------------------------- #
# Check F: tags / pipelines                                                    #
# --------------------------------------------------------------------------- #

def check_tags(workflows):
    findings = []
    for w in workflows:
        wf = map_owner(w["name"], w["folder"])[0]
        legacy = is_legacy_folder(w["folder"])
        bad = []
        for n in w["buckets"].get("add_contact_tag", []) + w["buckets"].get("remove_contact_tag", []):
            for tag in (n.get("attributes") or {}).get("tags", []):
                t = str(tag).strip()
                tl = t.lower()
                if tl in TAG_DENY_EXACT or \
                   any(s in tl for s in TAG_DENY_SUBSTRINGS) or \
                   any(tl.startswith(p) for p in TAG_LEGACY_PREFIXES):
                    bad.append(t)
        if bad:
            findings.append(finding(
                "F-tags", "minor" if legacy else "major", wf, w["name"], w["id"],
                "Off-registry / legacy tag names",
                ", ".join('"%s"' % t for t in sorted(set(bad))[:8]),
                "Use registry snake_case outcome_* tags (outcome_sold, outcome_nosale, "
                'outcome_mut, outcome_mar); drop "patient/..." and legacy objection_* tags.'))
        # opportunity_status prose / A&D pipeline references
        for n in w["buckets"].get("create_opportunity", []):
            a = n.get("attributes") or {}
            nm = str(n.get("name") or "")
            if re.search(r"a&d", nm, re.I):
                findings.append(finding(
                    "F-tags", "major", wf, w["name"], w["id"],
                    "Opportunity written into a legacy A&D pipeline/stage",
                    'node "%s"' % nm,
                    "Route to the Target pipelines (Sales - Lead to Close; Retention "
                    "and Renewals; Referrals). Retire the A&D pipeline."))
    return findings


# --------------------------------------------------------------------------- #
# Scorecard                                                                    #
# --------------------------------------------------------------------------- #

def build_scorecard(workflows, findings):
    by_wf_findings = defaultdict(list)
    for f in findings:
        if f["wf"]:
            by_wf_findings[f["wf"]].append(f)
    mapped = defaultdict(list)
    legacy_mapped = defaultdict(list)
    for w in workflows:
        wf = map_owner(w["name"], w["folder"])[0]
        if not wf:
            continue
        if is_legacy_folder(w["folder"]):
            legacy_mapped[wf].append(w)
        else:
            mapped[wf].append(w)
    scorecard = {}
    for wf, title in WF_OWNERS.items():
        built = mapped.get(wf, [])
        legacy = legacy_mapped.get(wf, [])
        blocking = [f for f in by_wf_findings.get(wf, [])
                    if f["severity"] in ("blocker", "major")]
        if built:
            status = "built_wrong" if blocking else "built"
        elif legacy:
            status = "missing_legacy_only"
        else:
            status = "missing"
        scorecard[wf] = {
            "title": title,
            "status": status,
            "built_by": [w["name"] for w in built],
            "legacy_candidates": [w["name"] for w in legacy],
            "issue_count": len(by_wf_findings.get(wf, [])),
            "blocking_count": len(blocking),
        }
    return scorecard


# --------------------------------------------------------------------------- #
# Main                                                                         #
# --------------------------------------------------------------------------- #

def _dedup(findings):
    """Collapse identical findings (same check/sev/workflow/issue)."""
    seen = set()
    out = []
    for f in findings:
        key = (f["check"], f["severity"], f["workflow_id"], f["wf"], f["issue"])
        if key in seen:
            continue
        seen.add(key)
        out.append(f)
    return out


def run(ext_dir):
    workflows = load_extraction(ext_dir)
    # Checks B-F evaluate the vendor's actual build (organized folders 00-07 plus
    # the affiliate folders). The 68 legacy imports parked in "09 Other" are
    # reported once by check_structure as a census, not scanned line-by-line, so
    # legacy noise cannot inflate counts or misattribute WF owners.
    build = [w for w in workflows if not is_legacy_folder(w["folder"])]
    findings = []
    findings += check_structure(workflows)
    findings += check_enums(build)
    findings += check_fields(build)
    findings += check_journey(build)
    findings += check_copy(build)
    findings += check_tags(build)
    findings = _dedup(findings)
    findings.sort(key=lambda f: (SEV_ORDER.get(f["severity"], 9), f["check"], f["wf"] or "zz"))

    scorecard = build_scorecard(workflows, findings)
    status_counts = Counter(v["status"] for v in scorecard.values())
    sev_counts = Counter(f["severity"] for f in findings)
    folders = Counter(w["folder"] for w in workflows)
    stats = {
        "workflows_total": len(workflows),
        "published": sum(1 for w in workflows if w["status"] == "published"),
        "draft": sum(1 for w in workflows if w["status"] == "draft"),
        "legacy_09_other": sum(1 for w in workflows if is_legacy_folder(w["folder"])),
        "affiliate": sum(1 for w in workflows if is_affiliate_folder(w["folder"])),
        "organized_00_07": sum(1 for w in workflows
                               if not is_legacy_folder(w["folder"])
                               and not is_affiliate_folder(w["folder"])),
        "folders": dict(folders),
    }
    result = {
        "spec_source": "plan-workspace @ 8a7e08b..e2c41ef",
        "extraction_dir": os.path.abspath(ext_dir),
        "stats": stats,
        "scorecard": scorecard,
        "severity_counts": dict(sev_counts),
        "status_counts": dict(status_counts),
        "findings": findings,
    }
    return result


def print_summary(result):
    s = result["stats"]
    print("=" * 70)
    print("VENDOR CONFORMANCE DIFF")
    print("spec:", result["spec_source"])
    print("extraction:", result["extraction_dir"])
    print("=" * 70)
    print("workflows: %d total  (%d published / %d draft)" %
          (s["workflows_total"], s["published"], s["draft"]))
    print("folders: organized(00-07)=%d  affiliate=%d  legacy(09 Other)=%d" %
          (s["organized_00_07"], s["affiliate"], s["legacy_09_other"]))
    print("-" * 70)
    print("SCORECARD (WF-01..16)")
    for wf in sorted(result["scorecard"]):
        v = result["scorecard"][wf]
        print("  %-6s %-34s %-18s issues=%d block=%d" %
              (wf, v["title"][:34], v["status"], v["issue_count"], v["blocking_count"]))
    sc = result["status_counts"]
    print("  status totals:", ", ".join("%s=%d" % (k, sc[k]) for k in sorted(sc)))
    print("-" * 70)
    sev = result["severity_counts"]
    print("FINDINGS: %d total  (%s)" %
          (len(result["findings"]),
           ", ".join("%s=%d" % (k, sev.get(k, 0)) for k in ("blocker", "major", "minor"))))
    for f in result["findings"][:40]:
        print("  [%-7s] %-9s %-22s %s" %
              (f["severity"], f["wf"] or "-", (f["workflow"] or "")[:22], f["issue"]))
    if len(result["findings"]) > 40:
        print("  ... %d more (see JSON)" % (len(result["findings"]) - 40))
    print("=" * 70)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Vendor conformance diff harness")
    ap.add_argument("extraction_dir", help="directory with the GHL extraction")
    ap.add_argument("--json", help="write machine-readable result to this path")
    ap.add_argument("--quiet", action="store_true", help="suppress console summary")
    args = ap.parse_args(argv)

    result = run(args.extraction_dir)
    if args.json:
        with open(args.json, "w") as fh:
            json.dump(result, fh, indent=2)
        if not args.quiet:
            print("wrote", args.json)
    if not args.quiet:
        print_summary(result)
    # non-zero exit if any blocker so the harness is CI-friendly
    return 1 if result["severity_counts"].get("blocker") else 0


if __name__ == "__main__":
    sys.exit(main())
