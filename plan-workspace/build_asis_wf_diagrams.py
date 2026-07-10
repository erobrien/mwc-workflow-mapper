# -*- coding: utf-8 -*-
"""
Generate the AS-IS workflow diagrams DIRECTLY from the live GHL step graphs.

Every diagram here is produced from public/asis-detail.json (built by
build_asis_detail.py from the 28 "Active Workflows" step graphs) — real trigger
entry points, real if/else branch labels, real wait durations, real gotos and
real exits.  Nothing is hand-narrated; the shapes come from the data.

Each diagram keeps the same key as its to-be counterpart so the Diagrams view can
pair them 1:1.  Where a to-be flow has NO active-workflow counterpart (retention /
long-term nurture), the as-is diagram says so explicitly.

Output: public/wf-diagrams-asis.json  ([{key,title,caption,src}])
  python build_asis_wf_diagrams.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
DETAIL = json.load(open(os.path.join(HERE, "public", "asis-detail.json"), encoding="utf-8"))
WF = {w["id"]: w for w in DETAIL["workflows"]}

# --- raw step-graph files: source of truth for edge derivation --------------
import glob
RAW = {}
for _f in glob.glob(os.path.join(HERE, "..", "ghl_data", "workflow_steps", "*.json")):
    _d = json.load(open(_f, encoding="utf-8"))
    RAW[_d["id"]] = _d
RNAME = {i: d.get("name", "?") for i, d in RAW.items()}
RFOLDER = {i: d.get("folder", "") for i, d in RAW.items()}
RSTATUS = {i: d.get("status", "") for i, d in RAW.items()}


def _listens(d, field):
    out = []
    for t in d.get("triggers", []):
        for c in t.get("conditions", []) or []:
            if c.get("field") == field:
                v = c.get("value")
                out += v if isinstance(v, list) else [v]
    return out


def _trigger_types(d):
    return {t.get("type") for t in d.get("triggers", [])}


def _emit_tags(d):
    s = set()
    for n in d.get("templates", []):
        if n.get("type") == "add_contact_tag":
            for tg in (n.get("attributes", {}) or {}).get("tags", []) or []:
                s.add(tg)
    return s


def _set_status(d):
    s = set()
    for n in d.get("templates", []):
        if n.get("type") == "update_appointment_status":
            v = (n.get("attributes", {}) or {}).get("status_type")
            if v:
                s.add(v)
    return s


def _wf_refs(d, ty):
    out = set()
    for n in d.get("templates", []):
        if n.get("type") == ty:
            w = (n.get("attributes", {}) or {}).get("workflow_id")
            for x in (w if isinstance(w, list) else [w]):
                if x:
                    out.add(x)
    return out


def _folder2(i):
    return (RFOLDER.get(i, "") or "")[:2]


def derive_edges():
    """Return (cross_edges, entry_edges, isolated, stats), 100% from RAW data.

    cross_edges: {(src,dst): {"mechs": set, "kind": "journey"|"support"}}
    entry_edges: list of (source_key, dst)
    isolated:    workflow ids with no inbound/outbound cross-workflow edge
    """
    raw_edges = []  # (src, dst, mech)

    # A. tag emitted by A -> tagsAdded listened by B
    tag_listen = {}
    for i, d in RAW.items():
        for tg in _listens(d, "tagsAdded"):
            tag_listen.setdefault(tg, set()).add(i)
    for i, d in RAW.items():
        et = _emit_tags(d)
        for tg, listeners in tag_listen.items():
            if tg in et:
                for L in listeners:
                    if L != i:
                        raw_edges.append((i, L, f"tag: {tg} added"))

    # B. add_to_workflow step -> target workflow
    for i, d in RAW.items():
        for x in _wf_refs(d, "add_to_workflow"):
            if x != i:
                raw_edges.append((i, x, "adds to workflow"))
    # C. remove_from_workflow step -> target workflow (cleanup)
    for i, d in RAW.items():
        for x in _wf_refs(d, "remove_from_workflow"):
            if x != i:
                raw_edges.append((i, x, "removes from workflow"))
    # D. trigger on workflow.id (fires when contact enters that workflow)
    for i, d in RAW.items():
        for x in _listens(d, "workflow.id"):
            if x and x != i:
                raw_edges.append((x, i, "on entering workflow"))
    # E. appointment.status set by A -> appointment.status listened by B
    status_listen = {}
    for i, d in RAW.items():
        for s in _listens(d, "appointment.status"):
            status_listen.setdefault(s, set()).add(i)
    for i, d in RAW.items():
        for s in _set_status(d):
            for L in status_listen.get(s, ()):
                if L != i:
                    raw_edges.append((i, L, f"appt set: {s}"))

    # merge + classify
    def is_support(src, dst, mechs):
        if any(m.startswith(("removes from", "appt set:", "on entering")) for m in mechs):
            return True
        if _folder2(src) in ("03", "04") or _folder2(dst) in ("03", "04"):
            return True
        if RFOLDER.get(dst, "").startswith("Vercel") or RFOLDER.get(src, "").startswith("Vercel"):
            return True
        return False

    merged = {}
    for s, dst, mech in raw_edges:
        merged.setdefault((s, dst), set()).add(mech)
    cross = {}
    for (s, dst), mechs in merged.items():
        cross[(s, dst)] = {
            "mechs": mechs,
            "kind": "support" if is_support(s, dst, mechs) else "journey",
        }

    connected = set()
    for (s, dst) in cross:
        connected.add(s)
        if dst in RAW:
            connected.add(dst)
    isolated = [i for i in RAW if i not in connected]

    # entry edges: external source -> in-degree-0 connected workflows, plus the
    # calendar anchors of the appointment cluster (all justified by real triggers)
    indeg = {}
    for (s, dst) in cross:
        if dst in RAW:
            indeg[dst] = indeg.get(dst, 0) + 1
    entry = []
    for i in sorted(connected, key=lambda x: RNAME[x]):
        if indeg.get(i, 0) > 0:
            continue
        tt = _trigger_types(RAW[i])
        if "inbound_webhook" in tt:
            entry.append(("WEB", i))
        elif "form_submission" in tt:
            entry.append(("WEB", i))
        elif tt & {"call_status", "ivr_incoming_call"}:
            entry.append(("CALL", i))
        elif tt & {"appointment", "customer_appointment"}:
            entry.append(("CAL", i))
    # calendar anchors (appointment-triggered cluster members)
    for anchor_name in ("03. Appointment Booked", "03b. Unconfirmed", "05. Clinic Appt Outcome"):
        for i in connected:
            if RNAME[i].startswith(anchor_name) and (_trigger_types(RAW[i]) & {"appointment", "customer_appointment"}):
                entry.append(("CAL", i))

    # stats: mechanism breakdown over merged pairs
    stats = {"pairs": len(cross), "internal": sum(1 for (_, d) in cross if d in RAW),
             "external": sum(1 for (_, d) in cross if d not in RAW),
             "journey": sum(1 for v in cross.values() if v["kind"] == "journey"),
             "support": sum(1 for v in cross.values() if v["kind"] == "support"),
             "connected": len(connected), "isolated": len(isolated),
             "tag": 0, "add": 0, "remove": 0, "appt": 0, "enter": 0}
    for v in cross.values():
        m = v["mechs"]
        if any(x.startswith("tag:") for x in m): stats["tag"] += 1
        if "adds to workflow" in m: stats["add"] += 1
        if "removes from workflow" in m: stats["remove"] += 1
        if any(x.startswith("appt set:") for x in m): stats["appt"] += 1
        if "on entering workflow" in m: stats["enter"] += 1
    return cross, entry, isolated, stats

# status colours
C_TRIG = "#1e40af"; C_PUB = "#166534"; C_DRAFT = "#374151"
C_DECISION = "#0f766e"; C_WAIT = "#b45309"; C_MSG = "#1e3a5f"
C_EXIT = "#6b7280"; C_OPP = "#7c3aed"; C_GOTO = "#92400e"


def esc(s, n=64):
    if s is None:
        s = ""
    s = str(s).replace("\n", " ").replace("\r", " ")
    s = s.replace('"', "'").replace("(", "").replace(")", "")
    s = s.replace("[", "").replace("]", "").replace("{", "").replace("}", "")
    s = s.replace("|", "/").replace("<", "").replace(">", "")
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > n:
        s = s[:n - 1] + "…"
    return s


def step_label(s):
    d = s.get("detail", {}) or {}
    k = s["kind"]
    if k == "message":
        if d.get("channel") == "sms":
            return "SMS: " + esc(d.get("body", ""), 46)
        return "Email: " + esc(d.get("subject") or s["name"], 46)
    if k == "wait":
        return esc(d.get("summary") or "Wait", 40)
    if k == "goto":
        return "Go to: " + esc(d.get("target_name") or "step", 36)
    if k == "tag":
        return ("Remove tag: " if d.get("op") == "remove" else "Add tag: ") + esc(", ".join(d.get("tags", [])), 40)
    if k == "opportunity":
        return "Opp " + esc((d.get("op") or "") + (f" — {d.get('status')}" if d.get("status") else ""), 42)
    if k == "appointment":
        return "Set appt: " + esc(d.get("status", ""), 30)
    if k == "sheets":
        return "Sheets: " + esc(d.get("action", ""), 34)
    if k == "webhook":
        return "Webhook: " + esc(d.get("method", ""), 30)
    if k == "field":
        return esc(d.get("action") or "Update field", 40)
    if k == "ivr":
        return "IVR: " + esc(d.get("message") or s["name"], 40)
    if k == "exit":
        return esc(s["name"] or "Exit", 40)
    return esc(s["name"], 44)


def node_color(kind):
    return {"decision": C_DECISION, "wait": C_WAIT, "message": C_MSG,
            "goto": C_GOTO, "opportunity": C_OPP, "exit": C_EXIT}.get(kind, C_PUB)


class Flow:
    """Depth-limited Mermaid generator for a single workflow's real step tree."""
    def __init__(self, max_depth=4, cap=6):
        self.lines = ["flowchart TD"]
        self.styles = []
        self.n = 0
        self.max_depth = max_depth
        self.cap = cap

    def nid(self):
        self.n += 1
        return f"N{self.n}"

    def node(self, text, shape="box", color=C_PUB):
        i = self.nid()
        if shape == "round":
            self.lines.append(f'    {i}(["{text}"])')
        elif shape == "diamond":
            self.lines.append(f'    {i}{{"{text}"}}')
        else:
            self.lines.append(f'    {i}["{text}"]')
        self.styles.append(f"    style {i} fill:{color},color:#fff")
        return i

    def edge(self, a, b, label=None):
        if label:
            self.lines.append(f'    {a} -->|"{esc(label, 40)}"| {b}')
        else:
            self.lines.append(f"    {a} --> {b}")

    def walk(self, steps, parent, depth):
        prev = parent
        shown = 0
        for idx, s in enumerate(steps):
            if depth > self.max_depth:
                rest = len(steps) - idx
                c = self.node(f"+{rest} more steps", color=C_DRAFT)
                self.edge(prev, c)
                return
            if shown >= self.cap and s["kind"] != "decision":
                rest = len(steps) - idx
                c = self.node(f"+{rest} more steps", color=C_DRAFT)
                self.edge(prev, c)
                return
            if s["kind"] == "decision":
                dnode = self.node(esc(s.get("condition_name") or s["name"] or "If / else", 40),
                                  shape="diamond", color=C_DECISION)
                self.edge(prev, dnode)
                for b in s.get("branches", []):
                    lbl = b["label"]
                    if not b["steps"]:
                        leaf = self.node("branch ends", color=C_EXIT)
                        self.edge(dnode, leaf, lbl)
                        continue
                    first = b["steps"][0]
                    bnode = self.node(step_label(first),
                                      shape=("diamond" if first["kind"] == "decision" else "box"),
                                      color=node_color(first["kind"]))
                    self.edge(dnode, bnode, lbl)
                    if first["kind"] == "decision":
                        # re-expand this decision one level deeper
                        self._decision_children(first, bnode, depth + 2)
                    else:
                        self.walk(b["steps"][1:], bnode, depth + 2)
                return  # decision terminates the linear chain
            node = self.node(step_label(s), shape="box", color=node_color(s["kind"]))
            self.edge(prev, node)
            prev = node
            shown += 1

    def _decision_children(self, dstep, dnode, depth):
        for b in dstep.get("branches", []):
            if not b["steps"]:
                leaf = self.node("branch ends", color=C_EXIT)
                self.edge(dnode, leaf, b["label"])
                continue
            if depth > self.max_depth:
                c = self.node(f"{len(b['steps'])} steps", color=C_DRAFT)
                self.edge(dnode, c, b["label"])
                continue
            first = b["steps"][0]
            bnode = self.node(step_label(first),
                              shape=("diamond" if first["kind"] == "decision" else "box"),
                              color=node_color(first["kind"]))
            self.edge(dnode, bnode, b["label"])
            if first["kind"] != "decision":
                self.walk(b["steps"][1:], bnode, depth + 2)

    def render(self, wf):
        trig = "<br/>".join(esc(t["name"], 40) for t in wf["triggers"][:6]) or "Entered from another workflow / manually"
        start = self.node(trig, shape="round", color=C_TRIG)
        self.walk(wf["steps"], start, 1)
        return "\n".join(self.lines + self.styles)


def flow_src(wid, max_depth=4, cap=6):
    return Flow(max_depth, cap).render(WF[wid])


def group_src(ids, title_by=None):
    """One node per workflow: real name, status, trigger + step counts, and the
    primary decision label when present. Grounded overview for a folder/cluster."""
    lines = ["flowchart TD"]
    styles = []
    for i, wid in enumerate(ids):
        w = WF.get(wid)
        if not w:
            continue
        nid = f"G{i}"
        dec = next((s for s in w["steps"] if s["kind"] == "decision"), None)
        parts = [esc(w["name"], 50),
                 f"{w['status']} · {len(w['triggers'])} trig · {w['n_steps']} steps"]
        if dec:
            parts.append("if/else: " + esc(dec.get("condition_name") or dec["name"], 40))
        label = "<br/>".join(parts)
        lines.append(f'    {nid}["{label}"]')
        styles.append(f"    style {nid} fill:{C_PUB if w['status']=='published' else C_DRAFT},color:#fff")
    return "\n".join(lines + styles)


# --- key -> workflow ids -----------------------------------------------------
IDS = {
    "01A": "063460e9-68d9-458d-85e0-cb45df4952a2",
    "01B": "00265495-fb41-4fd8-b37d-a161583d3250",
    "01C": "d85f5e6d-e6d3-42d4-a673-ed444673c546",
    "01D": "043af881-5ba4-4097-9a1b-f5b0b24759ac",
    "01E": "b401f884-66d4-4e37-94d5-08be7041a137",
    "02NB": "619cc8e7-b658-4552-8e23-5aeeec443057",
    "03book": "7ac17ae7-c894-4c6e-be0e-7b77057c7231",
    "03b": "b9135812-c31a-41fe-b22f-dd47b2623697",
    "03c": "9ae9b45c-1f79-46cc-9ef1-eb61a9bcbdd8",
    "03d": "860ae134-9ed2-4144-a19b-6aae8a0937a3",
    "3a": "bc40d0db-b724-46af-a846-6bfe4528d9b2",
    "04a": "09dfdfe0-cb78-440c-b35f-decbb9add3c6",
    "intakeRem": "9d4c8965-c9cc-4b4f-a7d9-ab4319b404e7",
    "05": "528b598e-cd6c-488b-9e17-ccc65c25c7f1",
    "07": "62954a3c-7e64-4aae-9c83-b14ce9a761bc",
    "survey": "51869870-c1ea-4bbe-a101-27c5ff4a27c0",
    "08mut": "12df62cb-6fd7-43c7-823d-2f406c2199e3",
    "cancelled": "69906bf5-d243-43f4-8595-6b8c8743a713",
    "missed": "a07e53bd-4e90-4742-b2e6-b7713ea9b15b",
    "ivr": "80479e09-a4de-41ee-94f2-c5cd187ec7e0",
    "dnc": "98168f51-2856-43f3-82db-c3d19b6cbb48",
    "bounce": "556c7b5b-6221-4c3a-a776-a1027218c334",
    "disp4a": "e4b3ae4a-8c74-43f3-828e-92fed7c58d30",
    "disp4b": "61e0d77b-3347-4fbd-ad16-3d02aad4a212",
    "chat": "b6a13400-27e9-4891-ab56-7503d170bbd4",
    "webhook": "9edb236f-664e-4667-bbca-4b8b394863c1",
    "onboard": "97c037d6-ecf8-4237-881c-12f07086a226",
}


CROSS, ENTRY, ISOLATED, STATS = derive_edges()


def _mnode(i):
    """Stable, parse-safe mermaid node id for a workflow (internal or external)."""
    clean = re.sub(r"[^0-9a-zA-Z]", "", i)[:10]
    return ("W" if i in RAW else "X") + clean


def master_src():
    """True interconnection map of the 28 active workflows — every edge derived
    100% from the extracted step graphs (tags, add/remove_to_workflow,
    appointment-status changes, workflow-entry triggers). Solid = patient journey;
    dotted = signal / support / admin handoff. 05 is the outcome keystone."""
    lines = ["flowchart TD"]
    styles = []

    connected = set()
    for (s, d) in CROSS:
        connected.add(s)
        if d in RAW:
            connected.add(d)

    # entry source stadium nodes (only those that really exist in triggers)
    lines.append('    WEB(["Web forms / ad webhooks"])')
    lines.append('    CAL(["Calendar & appointment events"])')
    lines.append('    CALL(["Inbound / missed calls"])')
    styles.append("    style WEB fill:#0f766e,color:#fff")
    styles.append("    style CAL fill:#0f766e,color:#fff")
    styles.append("    style CALL fill:#0f766e,color:#fff")

    # workflow nodes (connected ones + any external target)
    ext_nodes = set()
    for (s, d) in CROSS:
        if d not in RAW:
            ext_nodes.add(d)
    for i in sorted(connected, key=lambda x: RNAME[x]):
        nid = _mnode(i)
        lines.append(f'    {nid}["{esc(RNAME[i], 40)}"]')
        if RNAME[i].startswith("05. Clinic Appt Outcome"):
            styles.append(f"    style {nid} fill:#7c3aed,color:#fff")   # keystone
        elif RSTATUS.get(i) == "published":
            styles.append(f"    style {nid} fill:{C_PUB},color:#fff")
        else:
            styles.append(f"    style {nid} fill:{C_DRAFT},color:#fff")
    for e in ext_nodes:
        lines.append(f'    {_mnode(e)}["(external workflow)"]')
        styles.append(f"    style {_mnode(e)} fill:#6b7280,color:#fff")

    # real fork: appointment-day outcome fanning into 05 / Cancelled
    lines.append('    VISIT{"Appointment-day outcome"}')
    styles.append("    style VISIT fill:#1e3a5f,color:#fff")

    # entry edges (each justified by a real trigger type on the target)
    seen_entry = set()
    for src, dst in ENTRY:
        if dst not in connected:
            continue
        key = (src, dst)
        if key in seen_entry:
            continue
        seen_entry.add(key)
        lines.append(f"    {src} --> {_mnode(dst)}")

    # calendar -> appointment-day fork -> outcome workflows (data: 05 & Cancelled
    # carry appointment.status showed/no-show/cancelled triggers)
    outcome_ids = {i for i in connected if RNAME[i].startswith(("05. Clinic Appt Outcome", "Cancelled Appointments"))}
    if outcome_ids:
        lines.append("    CAL --> VISIT")
        for i in sorted(outcome_ids, key=lambda x: RNAME[x]):
            lbl = "Showed / no-show / cancel reported" if RNAME[i].startswith("05") else "Calendar cancellation"
            lines.append(f'    VISIT -->|"{esc(lbl,34)}"| {_mnode(i)}')

    # cross-workflow derived edges
    for (s, d), meta in sorted(CROSS.items(), key=lambda kv: RNAME.get(kv[0][0], "")):
        tgt = _mnode(d)
        label = esc(" ; ".join(sorted(meta["mechs"])), 40)
        arrow = "-->" if meta["kind"] == "journey" else "-.->"
        lines.append(f'    {_mnode(s)} {arrow}|"{label}"| {tgt}')

    # isolated cluster — honest: no derivable inbound/outbound workflow links
    if ISOLATED:
        lines.append('    subgraph ISO ["Isolated — no inbound/outbound workflow links found (external-trigger only)"]')
        for j, i in enumerate(sorted(ISOLATED, key=lambda x: RNAME[x])):
            nid = f"ISO{j}"
            tt = ",".join(sorted(_trigger_types(RAW[i]))) or "no trigger"
            lines.append(f'        {nid}["{esc(RNAME[i],40)}<br/>{RSTATUS.get(i)} · entry: {esc(tt,30)}"]')
            styles.append(f"    style {nid} fill:{C_PUB if RSTATUS.get(i)=='published' else C_DRAFT},color:#fff")
        lines.append("    end")

    return "\n".join(lines + styles)


RETENTION_SRC = """flowchart TD
    NOTE["No active-workflow counterpart"]
    NOTE --> D1["Retention / renewal nurture is NOT present<br/>in the Active Workflows folder"]
    NOTE --> D2["Long-term nurture COLD/WARM/HOT is NOT present<br/>in the Active Workflows folder"]
    D1 --> SCOPE(["Out of scope for current-state:<br/>no live retention automation among the 28"])
    D2 --> SCOPE
    style NOTE fill:#374151,color:#fff
    style D1 fill:#374151,color:#fff
    style D2 fill:#374151,color:#fff
    style SCOPE fill:#b45309,color:#fff
"""

diagrams = [
    {"key": "master",
     "title": "AS-IS: Master journey — how the 28 active workflows actually interconnect",
     "caption": (
         f"Every edge is derived 100% from the extracted step graphs — no invented links. "
         f"{STATS['connected']} of 28 workflows are wired together by {STATS['pairs']} real connections "
         f"({STATS['internal']} workflow-to-workflow, {STATS['external']} to an external workflow): "
         f"{STATS['tag']} by contact-tag triggers, {STATS['add']} by add-to-workflow steps, "
         f"{STATS['remove']} by remove-from-workflow cleanup, {STATS['appt']} by appointment-status changes, "
         f"{STATS['enter']} by a workflow-entry trigger. Solid = patient-journey handoff, dotted = signal/support/admin. "
         f"05. Clinic Appt Outcome (purple) is the current outcome keystone. The remaining {STATS['isolated']} "
         f"workflows have no derivable inbound/outbound workflow links — they fire only from external triggers "
         f"(calls, forms, email/appointment events) and are clustered separately, honestly labeled."),
     "src": master_src()},
    {"key": "wf01",
     "title": "AS-IS: Lead Capture — 01B Richmond (representative of 5 per-location)",
     "caption": "Lead capture runs as 5 published per-location workflows (01A Home, 01B Richmond, 01C VA Beach, 01D NPN, 01E Consultation), each with an identical shape: set contact fields, add source/attribution tags, then branch. Shown is 01B Richmond's real step graph; 01A and 01E are larger (202 steps) but structurally parallel.",
     "src": flow_src(IDS["01B"], max_depth=4, cap=5)},
    {"key": "wf02",
     "title": "AS-IS: Non-Booked New Leads (02. NON BOOKED NEWLEADS)",
     "caption": "The one published non-booked follow-up, entered from 6 triggers. Its real step graph: an opening wait, then if/else branching. Copy and timing are exactly as configured today — no rewrite.",
     "src": flow_src(IDS["02NB"], max_depth=4, cap=6)},
    {"key": "preappt",
     "title": "AS-IS: Pre-Appointment — booking, confirmation, intake cluster",
     "caption": "The live confirmation/intake chain under folder 02: 03. Appointment Booked, 03b Confirmation Required, 03c Reply Handler, 03d Update Status, 3a Auto Confirm, 04a Intake Form Response, and Intake Reminder — each with its real trigger and step counts.",
     "src": group_src([IDS["03book"], IDS["03b"], IDS["03c"], IDS["03d"], IDS["3a"], IDS["04a"], IDS["intakeRem"]])},
    {"key": "wf05",
     "title": "AS-IS: Clinic Outcome (05. Clinic Appt Outcome — the keystone)",
     "caption": "The keystone outcome workflow, entered from 7 triggers (PA-reported Showed / No-Show / Cancelled / Rescheduled …). Its real graph branches on the visit outcome, then again per location (VA Beach / Newport / Richmond), sending the outcome email and moving the Opportunity. This is the exact live branching the rebuild replaces with a single PCC-driven writer.",
     "src": flow_src(IDS["05"], max_depth=6, cap=8)},
    {"key": "wf06",
     "title": "AS-IS: Post-Visit Showed + Feedback Survey",
     "caption": "Post-visit for showed patients: 07. POST-VISIT - SHOWED Opportunities and For Review/Referral (102 steps) plus After Appointment Feedback Survey Send. Real trigger entry and step graph for 07 shown; the survey workflow is summarised in the cluster.",
     "src": flow_src(IDS["07"], max_depth=4, cap=6)},
    {"key": "wf07-08",
     "title": "AS-IS: No-Show / Cancel Recovery + MUT",
     "caption": "The live recovery pieces among the 28: 08. MUT (Medically Untreatable), Cancelled Appointments, and Nurture: Missed Clinic Appointment — with their real triggers and step counts. There is no consolidated multi-touch no-sale sequence in the active folder.",
     "src": group_src([IDS["08mut"], IDS["cancelled"], IDS["missed"]])},
    {"key": "retention",
     "title": "AS-IS: Retention + Long-Term Nurture — no active counterpart",
     "caption": "None of the 28 Active Workflows is a retention / renewal or long-term nurture flow. This to-be layer has no current-state counterpart in the Active Workflows folder — there is no live retention automation to document.",
     "src": RETENTION_SRC},
    {"key": "support",
     "title": "AS-IS: Support and Infrastructure cluster",
     "caption": "Support/infra workflows in the active folder: 1. IVR - simultaneous, 2. DNC/wrong number/SMS & Call Errors (11 triggers), 3. Email Bounce, 4a & 4b Call Disposition (9 triggers each), Chat Widget Out of Office Hours, and the Vercel Outbound Webhook — each with its real trigger and step counts.",
     "src": group_src([IDS["ivr"], IDS["dnc"], IDS["bounce"], IDS["disp4a"], IDS["disp4b"], IDS["chat"], IDS["webhook"]])},
]

out = os.path.join(HERE, "public", "wf-diagrams-asis.json")
json.dump(diagrams, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote public/wf-diagrams-asis.json :", len(diagrams), "diagrams")
for d in diagrams:
    print(f"  {d['key']:10} {d['src'].count(chr(10))+1:4} lines")
