"""Skyforge control-tower projection V000001. Authoritative reviewed source: publishing Google Doc.
No calendar scheduling, actual progress, resource leveling or construction approval is inferred.
Input is a privacy-reduced project model and its registered planning-control settings.
"""
import json
import sys
from collections import deque
def slot(value):
    if not isinstance(value, str) or not value.startswith("R+") or not value[2:].isdigit():
        return None
    return int(value[2:])
def analyse(model):
    acts = model["activities"]
    links = model["relationships"]
    ids = {a["id"]: a for a in acts}
    incoming = {k: [] for k in ids}
    outgoing = {k: [] for k in ids}
    for r in links:
        incoming[r["to"]].append(r)
        outgoing[r["from"]].append(r)
    roots = [k for k in ids if not incoming[k]]
    terminals = [k for k in ids if not outgoing[k]]
    degree = {k: len(v) for k, v in incoming.items()}
    queue = deque(roots)
    order = []
    while queue:
        k = queue.popleft()
        order.append(k)
        for r in outgoing[k]:
            j = r["to"]
            degree[j] -= 1
            if degree[j] == 0:
                queue.append(j)
    mismatches = sum(1 for a in acts if slot(a["start"]) is not None
                     and slot(a["finish"]) is not None and a["duration"] is not None
                     and slot(a["finish"]) - slot(a["start"]) != a["duration"])
    incompatible = sum(1 for r in links if r["lag"] != 0 and r["basis"].lower().strip() not in ("workday", "workdays", "working day", "working days"))
    reasons = []
    if not acts:
        reasons.append("No admitted activities")
    if len(order) != len(acts):
        reasons.append("Relationship cycle detected")
    if any(a["duration"] is None or a["duration"] < 0 or a["unit"].lower().strip() not in ("workday", "workdays", "working day", "working days") for a in acts):
        reasons.append("Missing or incompatible workday duration")
    if incompatible:
        reasons.append("Nonzero lag uses elapsed or unspecified units; reconcile before a work-slot calculation")
    if len(acts) > 1 and not links:
        reasons.append("No admitted activity relationships")
    result = {
        "activity_count": len(acts), "relationship_count": len(links),
        "roots": len(roots), "terminals": len(terminals),
        "relative_span_mismatches": mismatches,
        "non_workday_nonzero_lags": incompatible,
        "cycle": len(order) != len(acts),
        "approved_critical_path": False, "baseline_approved": False,
        "progress_verified": False, "resource_loading_verified": False,
        "scenario": {"state": "HELD" if reasons else "WORK_SLOT_DIAGNOSTIC",
                     "reasons": reasons, "finish": None, "activities": []}
    }
    if reasons:
        return result
    # Independent shared-slot forward/backward pass. Units are abstract work slots;
    # excludes civil calendar, constraints, actual progress and resource leveling.
    d = {k: ids[k]["duration"] for k in ids}
    def weight(r):
        p, s, lag = r["from"], r["to"], r["lag"]
        return {"FS": d[p]+lag, "SS": lag, "FF": d[p]+lag-d[s], "SF": lag-d[s]}[r["type"]]
    es = {}
    for k in order:
        es[k] = max([0] + [es[r["from"]] + weight(r) for r in incoming[k]])
    finish = max(es[k]+d[k] for k in ids)
    ls = {}
    for k in reversed(order):
        ls[k] = min([finish-d[k]] + [ls[r["to"]]-weight(r) for r in outgoing[k]])
    result["scenario"]["finish"] = finish
    result["scenario"]["activities"] = [{"id": k, "early_start": es[k], "early_finish": es[k]+d[k],
        "late_start": ls[k], "total_float": ls[k]-es[k], "zero_float": abs(ls[k]-es[k]) < 1e-9} for k in order]
    return result
if __name__ == "__main__":
    json.dump(analyse(json.load(sys.stdin)), sys.stdout, allow_nan=False)
