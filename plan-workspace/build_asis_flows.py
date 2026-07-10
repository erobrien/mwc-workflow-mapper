# -*- coding: utf-8 -*-
"""
Generate ONE full-fidelity AS-IS Mermaid flowchart PER active workflow (all 28).

Every diagram is produced directly from public/asis-detail.json (built by
build_asis_detail.py from the 28 live "Active Workflows" step graphs) — real
trigger entry points, the complete ordered step flow, real if/else branch labels
and conditions, real wait durations, gotos naming their target, labelled SMS /
email steps, tag ops, opportunity moves, webhooks / sheets / IVR, and explicit
end nodes.  Nothing is summarised or depth-capped: the full graph is emitted so
the per-workflow page and the /workflow/:id embed are 100% faithful to the live
configuration.

Output: public/asis-flows.json
  { "location_id", "folders":[{name,count}], "flows":[
      {key,id,name,folder,status,n_steps,n_triggers,n_branches,n_sms,n_email,
       n_waits,n_gotos,n_opps,title,desc,src} ] }

  python build_asis_flows.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
DETAIL = json.load(open(os.path.join(HERE, "public", "asis-detail.json"), encoding="utf-8"))
WF = {w["id"]: w for w in DETAIL["workflows"]}

# status / kind colours (mirror the to-be + area-diagram palette)
C_TRIG = "#1e40af"; C_PUB = "#166534"; C_DRAFT = "#374151"
C_DECISION = "#0f766e"; C_WAIT = "#b45309"; C_MSG = "#1e3a5f"
C_EXIT = "#6b7280"; C_OPP = "#7c3aed"; C_GOTO = "#92400e"
C_END = "#4b5563"


def esc(s, n=70):
    if s is None:
        s = ""
    s = str(s).replace("\n", " ").replace("\r", " ")
    s = s.replace("&", " and ")
    s = s.replace('"', "'").replace("(", "").replace(")", "")
    s = s.replace("[", "").replace("]", "").replace("{", "").replace("}", "")
    s = s.replace("|", "/").replace("<", "").replace(">", "")
    s = s.replace("#", "no.").replace(";", ",")
    s = s.replace("“", "'").replace("”", "'").replace("’", "'").replace("‘", "'")
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > n:
        s = s[:n - 1] + "…"
    return s


def step_label(s):
    d = s.get("detail", {}) or {}
    k = s["kind"]
    if k == "message":
        if d.get("channel") == "sms":
            return "SMS: " + esc(d.get("body", ""), 54)
        return "Email: " + esc(d.get("subject") or s["name"], 54)
    if k == "wait":
        return "⏱ " + esc(d.get("summary") or "Wait", 48)
    if k == "goto":
        return "↪ Go to: " + esc(d.get("target_name") or "step", 44)
    if k == "tag":
        return ("Remove tag: " if d.get("op") == "remove" else "Add tag: ") + esc(", ".join(d.get("tags", [])), 46)
    if k == "opportunity":
        bits = (d.get("op") or "").strip()
        if d.get("status"):
            bits += f" — {d['status']}"
        return "Opp: " + esc(bits or (d.get("name") or "opportunity"), 48)
    if k == "appointment":
        return "Appt status: " + esc(d.get("status", ""), 40)
    if k == "sheets":
        return "Sheets: " + esc((d.get("action") or "") + (f" · {d.get('sheet')}" if d.get("sheet") else ""), 44)
    if k == "webhook":
        return "Webhook: " + esc((d.get("method") or "") + " " + (d.get("url") or ""), 46)
    if k == "field":
        return esc(d.get("action") or ("Update field: " + ", ".join(d.get("fields", []))) or "Update field", 48)
    if k == "ivr":
        return "IVR: " + esc(d.get("message") or s["name"], 48)
    if k == "note":
        return "Note: " + esc(d.get("body_text") or s["name"], 46)
    if k == "dnd":
        return "DND: " + esc((d.get("mode") or "") + " " + (d.get("direction") or ""), 40)
    if k == "exit":
        return "⏹ " + esc(s["name"] or d.get("action") or "Exit", 44)
    return esc(s["name"], 50)


def node_color(kind):
    return {"decision": C_DECISION, "wait": C_WAIT, "message": C_MSG,
            "goto": C_GOTO, "opportunity": C_OPP, "exit": C_EXIT}.get(kind, C_PUB)


class Flow:
    """Full-fidelity Mermaid generator for one workflow's real step tree."""
    def __init__(self):
        self.lines = ["flowchart TD"]
        self.styles = []
        self.n = 0

    def nid(self):
        self.n += 1
        return f"N{self.n}"

    def node(self, text, shape="box", color=C_PUB):
        i = self.nid()
        t = text if text else " "
        if shape == "round":
            self.lines.append(f'    {i}(["{t}"])')
        elif shape == "stadium":
            self.lines.append(f'    {i}(["{t}"])')
        elif shape == "diamond":
            self.lines.append(f'    {i}{{"{t}"}}')
        else:
            self.lines.append(f'    {i}["{t}"]')
        self.styles.append(f"    style {i} fill:{color},color:#fff")
        return i

    def edge(self, a, b, label=None):
        if label:
            self.lines.append(f'    {a} -->|"{esc(label, 44)}"| {b}')
        else:
            self.lines.append(f"    {a} --> {b}")

    def walk(self, steps, parent):
        """Render a linear list of steps; decisions fan out and terminate the chain."""
        prev = parent
        for idx, s in enumerate(steps):
            if s["kind"] == "decision":
                dnode = self.node(
                    esc(s.get("condition_name") or s.get("name") or "If / else", 46),
                    shape="diamond", color=C_DECISION)
                self.edge(prev, dnode)
                for b in s.get("branches", []):
                    lbl = b.get("label") or ""
                    if not b.get("steps"):
                        leaf = self.node("branch ends", shape="round", color=C_END)
                        self.edge(dnode, leaf, lbl)
                        continue
                    self.walk_branch(b["steps"], dnode, lbl)
                return  # a decision ends this linear chain
            node = self.node(step_label(s), shape="box", color=node_color(s["kind"]))
            self.edge(prev, node)
            prev = node
            # a goto jumps away and never has a follower; it terminates the chain.
            # `exit` is NOT terminal here — GHL "remove from workflow" / Goal steps
            # are mid-flow actions that other steps follow.
            if s["kind"] == "goto":
                return
        # linear chain fell off the end with no explicit terminator -> add End
        if prev is not parent:
            end = self.node("End", shape="round", color=C_END)
            self.edge(prev, end)

    def walk_branch(self, steps, dnode, label):
        """First step of a branch carries the branch label on its edge, then linear."""
        first = steps[0]
        if first["kind"] == "decision":
            dn = self.node(
                esc(first.get("condition_name") or first.get("name") or "If / else", 46),
                shape="diamond", color=C_DECISION)
            self.edge(dnode, dn, label)
            for b in first.get("branches", []):
                lbl = b.get("label") or ""
                if not b.get("steps"):
                    leaf = self.node("branch ends", shape="round", color=C_END)
                    self.edge(dn, leaf, lbl)
                    continue
                self.walk_branch(b["steps"], dn, lbl)
            return
        bnode = self.node(step_label(first), shape="box", color=node_color(first["kind"]))
        self.edge(dnode, bnode, label)
        if first["kind"] == "goto":
            return
        self.walk(steps[1:], bnode)

    def render(self, wf):
        trig = wf.get("triggers", [])
        if trig:
            names = "<br/>".join(f"{esc(t['name'], 42)} · {esc(t['type'], 22)}" for t in trig[:8])
            if len(trig) > 8:
                names += f"<br/>+{len(trig) - 8} more triggers"
            start = self.node(names, shape="stadium", color=C_TRIG)
        else:
            start = self.node("Entered from another workflow / manually", shape="stadium", color=C_TRIG)
        if wf.get("steps"):
            self.walk(wf["steps"], start)
        else:
            end = self.node("Trigger-only — no action steps", shape="round", color=C_END)
            self.edge(start, end)
        return "\n".join(self.lines + self.styles)


def count_kind(steps, kind, acc=0):
    for s in steps:
        if s["kind"] == kind:
            acc += 1
        for b in s.get("branches", []) or []:
            acc = count_kind(b.get("steps", []), kind, acc)
    return acc


def desc_for(wf):
    nt = len(wf.get("triggers", []))
    nb = count_kind(wf["steps"], "decision")
    nw = count_kind(wf["steps"], "wait")
    ng = count_kind(wf["steps"], "goto")
    no = count_kind(wf["steps"], "opportunity")
    parts = [f"{nt} trigger{'s' if nt != 1 else ''}",
             f"{wf['n_steps']} steps"]
    if nb: parts.append(f"{nb} branch{'es' if nb != 1 else ''}")
    if wf.get("sms"): parts.append(f"{wf['sms']} SMS")
    if wf.get("email"): parts.append(f"{wf['email']} email")
    if nw: parts.append(f"{nw} wait{'s' if nw != 1 else ''}")
    if ng: parts.append(f"{ng} goto")
    if no: parts.append(f"{no} opp move{'s' if no != 1 else ''}")
    return {"n_triggers": nt, "n_branches": nb, "n_waits": nw, "n_gotos": ng,
            "n_opps": no, "desc": " · ".join(parts)}


FOLDER_ORDER = [
    "01. WP Lead Capture", "02. Appointments & Visit Journey",
    "03. Call Routing & Dispositions", "04. System Admin & Error Handling",
    "Onboarding", "Vercel",
]


def folder_rank(name):
    return FOLDER_ORDER.index(name) if name in FOLDER_ORDER else 99


flows = []
for wf in sorted(DETAIL["workflows"], key=lambda w: (folder_rank(w["folder"]), w["name"])):
    m = desc_for(wf)
    flows.append({
        "key": wf["id"],
        "id": wf["id"],
        "name": wf["name"],
        "folder": wf["folder"],
        "status": wf["status"],
        "n_steps": wf["n_steps"],
        "n_sms": wf.get("sms", 0),
        "n_email": wf.get("email", 0),
        "n_triggers": m["n_triggers"],
        "n_branches": m["n_branches"],
        "n_waits": m["n_waits"],
        "n_gotos": m["n_gotos"],
        "n_opps": m["n_opps"],
        "title": wf["name"],
        "desc": m["desc"],
        "src": Flow().render(wf),
    })

out = {
    "location_id": DETAIL.get("location_id", ""),
    "folders": DETAIL.get("folders", []),
    "flows": flows,
}
path = os.path.join(HERE, "public", "asis-flows.json")
json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote public/asis-flows.json :", len(flows), "flows")
for f in flows:
    print(f"  {f['id'][:8]} {f['status']:9} {f['src'].count(chr(10))+1:5} lines  {f['name'][:44]}")
