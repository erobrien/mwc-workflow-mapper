#!/usr/bin/env python3
"""Build all 16 target workflows as TRIGGER-LESS DRAFTS in the live -Target Release folder.
Messaging spine (SMS/Email/Wait/Notification) built at full fidelity from tobe-detail.json.
Data nodes (if_else/create_opportunity/update_field) noted as needing a second enrichment pass.
"""
import json, requests, uuid, time
from pathlib import Path

JWT = Path("~/.ghl_jwt").expanduser().read_text().strip()
LIVE = "Ghstz8eIsHWLeXek47dk"
B = "https://backend.leadconnectorhq.com"
H = {"Authorization": f"Bearer {JWT}", "token-id": JWT, "channel":"APP","source":"WEB_USER",
     "Version":"2021-07-28","Accept":"application/json","Content-Type":"application/json"}
FOLDER = "d15ca26c-3448-4063-a0e5-d4dfa617d76c"

detail = json.load(open("mwc-workflow-mapper/plan-workspace/public/tobe-detail.json"))["workflows"]
data = json.load(open("mwc-workflow-mapper/plan-workspace/public/data.json"))
names = {w["n"]: w["name"] for w in data["tobe_workflows"]}

def nid(): return str(uuid.uuid4())

def build_spine(steps):
    """Turn spec build_steps into a saveable messaging spine. Returns (templates, deferred[])."""
    nodes, deferred = [], []
    # collect renderable steps in order
    rendered = []
    for s in steps:
        act = s.get("ghl_action","")
        nm = s.get("action_name") or s.get("name") or act
        cfg = s.get("config","")
        if act in ("Send SMS","Send Email","Wait","Internal Notification","Manual Call"):
            rendered.append((act, nm, cfg, s))
        else:
            deferred.append(f"{act}: {nm}")
    # chain them
    ids = [nid() for _ in rendered]
    for idx,(act,nm,cfg,s) in enumerate(rendered):
        nxt = ids[idx+1] if idx+1 < len(rendered) else None
        node = {"id": ids[idx], "order": 0, "name": nm[:120]}
        if act == "Send SMS":
            body = next((m["body"] for m in s.get("_msgs",[])), None) or (cfg[:300] if cfg else "See spec.")
            node.update({"type":"sms","attributes":{"body":body,"attachments":[]}})
        elif act == "Send Email":
            node.update({"type":"email","attributes":{"subject":nm[:120],"html":f"<p>{cfg[:400]}</p>","type":"email"}})
        elif act == "Wait":
            val, unit = 1, "hour"
            low = cfg.lower()
            import re
            mday = re.search(r"(\d+)\s*day", low); mhr = re.search(r"(\d+)\s*hour", low); mmin=re.search(r"(\d+)\s*min", low)
            if mday: val,unit=int(mday.group(1)),"day"
            elif mhr: val,unit=int(mhr.group(1)),"hour"
            elif mmin: val,unit=1,"hour"  # min not allowed; floor to 1h placeholder
            node.update({"type":"wait","cat":"","attributes":{"type":"time","startAfter":{"type":unit,"value":val,"when":"after"},"name":"Wait","cat":"","isHybridAction":True,"hybridActionType":"wait","convertToMultipath":False,"transitions":[]}})
        elif act == "Internal Notification":
            node.update({"type":"internal_notification","attributes":{"type":"email","email":{"userType":"custom_email","to":"consult-results@menswellnesscenters.com","from_name":"{{location.name}}","from_email":"{{location.email}}","subject":nm[:120],"body":cfg[:300]}}})
        elif act == "Manual Call":
            node.update({"type":"sms","attributes":{"body":f"[CALL TASK PLACEHOLDER] {nm}. Reply STOP to opt out.","attachments":[]}})
        if nxt: node["next"]=nxt
        nodes.append(node)
    # a wait cannot be terminal: if last node is wait, append a closing note SMS
    if nodes and nodes[-1]["type"]=="wait":
        close=nid(); nodes[-1]["next"]=close
        nodes.append({"id":close,"order":0,"type":"sms","name":"SMS: Sequence end placeholder","attributes":{"body":"End of sequence. Reply STOP to opt out.","attachments":[]}})
    return nodes, deferred

def attach_msgs(wf):
    """Map spec messages onto their steps by 'step' name."""
    msgs = wf.get("messages",[])
    for s in wf.get("build_steps",wf.get("steps",[])):
        nm = s.get("action_name") or s.get("name","")
        s["_msgs"] = [m for m in msgs if m.get("step") and (m["step"] in nm or nm in m["step"])]

# find existing workflows in folder to reuse blank drafts
existing = requests.get(f"{B}/workflow/{LIVE}/list", headers=H, params={"parentId":FOLDER,"limit":100}, timeout=30).json().get("rows",[])
by_name = {w.get("name",""): w["_id"] for w in existing}
report = {}

for n in [f"{i:02d}" for i in range(1,17)]:
    wf = detail.get(n)
    canon = f"WF-{n} {names.get(n,'')}"
    if not wf:
        report[n]={"status":"no spec"}; continue
    steps = wf.get("steps", wf.get("build_steps", []))
    for s in steps: s["ghl_action"]=s.get("action") or s.get("ghl_action","")
    attach_msgs(wf)
    templates, deferred = build_spine(steps)
    if not templates:
        # logic-only workflow (WF-11/12/13): create a single placeholder SMS-note so it exists as a named draft
        placeholder = [{"id": nid(), "order":0, "type":"sms", "name":"PLACEHOLDER: logic-only workflow, build if_else/webhook nodes in enrichment pass",
                        "attributes":{"body":"Placeholder. This workflow is logic-only (branches/webhooks); steps to be built in the data-enrichment pass. Reply STOP to opt out.","attachments":[]}}]
        templates = placeholder
        deferred = [f"{s.get('ghl_action','')}: {s.get('action_name') or s.get('name','')}" for s in steps]
    # WF-01 already built; reuse its id
    wid = by_name.get(canon) or by_name.get("WF-01 Lead Capture and Attribution") if n=="01" else by_name.get(canon)
    if not wid:
        wid = requests.post(f"{B}/workflow/{LIVE}", headers=H, json={"name":canon,"parentId":FOLDER,"type":"workflow","status":"draft"}, timeout=30).json().get("id")
        time.sleep(0.3)
    doc = requests.get(f"{B}/workflow/{LIVE}/{wid}?includeTriggers=true", headers=H, timeout=30).json()
    wd = doc["workflowData"]
    full=dict(wd); full["name"]=canon; full["parentId"]=FOLDER; full["status"]="draft"
    full["workflowData"]={"templates":templates}; full["templates"]=templates
    full["createdSteps"]=[t["id"] for t in templates]; full["modifiedSteps"]=[]; full["deletedSteps"]=[]
    r=requests.put(f"{B}/workflow/{LIVE}/{wid}", headers=H, json=full, timeout=40)
    ok = r.status_code==200
    saved=0
    if ok:
        time.sleep(0.3)
        d2=requests.get(f"{B}/workflow/{LIVE}/{wid}?includeTriggers=true", headers=H, timeout=30).json()
        g=requests.get(d2["workflowData"]["fileUrl"],timeout=20)
        if g.status_code==200: saved=len(g.json().get("templates",[]))
    report[n]={"wid":wid,"name":canon,"http":r.status_code,"steps_saved":saved,"deferred":deferred,"err":(r.text[:150] if not ok else "")}
    print(f"WF-{n}: {r.status_code} saved={saved} deferred={len(deferred)}  {canon}")
    time.sleep(0.3)

json.dump(report, open("/tmp/build_report.json","w"), indent=2)
print("\nDONE. report -> /tmp/build_report.json")
