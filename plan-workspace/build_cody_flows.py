# -*- coding: utf-8 -*-
"""
Generate one full-fidelity Mermaid flowchart per Cody-build workflow.

Reuses build_asis_flows.py verbatim by source-patching its input/output paths
(the generator is a flat script keyed to asis-detail.json). Diagrams therefore
render with exactly the same fidelity rules as the Current State flows.

Output: public/cody-flows.json
  python build_cody_flows.py
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "build_asis_flows.py"), encoding="utf-8").read()
src = src.replace('"public", "asis-detail.json"', '"public", "cody-detail.json"')
src = src.replace('"public", "asis-flows.json"', '"public", "cody-flows.json"')
src = src.replace('wrote public/asis-flows.json', 'wrote public/cody-flows.json')
exec(compile(src, "build_asis_flows.py(cody)", "exec"), {"__file__": os.path.join(HERE, "build_asis_flows.py")})
