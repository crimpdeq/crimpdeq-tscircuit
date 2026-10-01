# Compare the routed copper in dist/index/circuit.json against the accepted
# routing (scripts/routing.expected.json). The router is deterministic for a
# given design and pinned tool versions, so any difference means the routing
# changed: re-check it with `npm run verify` and accept it with --update.
# Usage: python3 scripts/routing.py [--update] [circuit.json]
import hashlib, json, math, sys
from collections import Counter

BASELINE = "scripts/routing.expected.json"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
cj = json.load(open(args[0] if args else "dist/index/circuit.json"))

def point(p):
    # through_pad: a layer change through a plated hole or via, given as start/end
    if p.get("route_type") == "through_pad":
        return (round(p["start"]["x"], 4), round(p["start"]["y"], 4), p["start_layer"], p["end_layer"])
    return (round(p["x"], 4), round(p["y"], 4), p.get("layer"))


traces = sorted((e["pcb_trace_id"], [point(p) for p in e["route"]]) for e in cj if e["type"] == "pcb_trace")
length = Counter()
for e in cj:
    if e["type"] != "pcb_trace":
        continue
    for a, b in zip(e["route"], e["route"][1:]):
        if a.get("route_type") == b.get("route_type") == "wire" and a["layer"] == b["layer"]:
            length[a["layer"]] += math.hypot(a["x"] - b["x"], a["y"] - b["y"])

current = {
    "fingerprint": hashlib.md5(json.dumps(traces).encode()).hexdigest(),
    "traces": len(traces),
    "vias": sum(1 for e in cj if e["type"] == "pcb_via"),
    "copper_length_mm": {k: round(v, 1) for k, v in sorted(length.items())},
}

if "--update" in sys.argv:
    json.dump(current, open(BASELINE, "w"), indent=1)
    open(BASELINE, "a").write("\n")
    print(f"routing baseline updated: {current['traces']} traces, {current['vias']} vias")
    sys.exit(0)

expected = json.load(open(BASELINE))
if current["fingerprint"] == expected["fingerprint"]:
    print("routing matches baseline")
    sys.exit(0)
print("ROUTING CHANGED")
for key in ("traces", "vias", "copper_length_mm"):
    if current[key] != expected[key]:
        print(f"  {key}: {expected[key]} -> {current[key]}")
print("If intended, check the result (npm run verify, renders) and run: python3 scripts/routing.py --update")
sys.exit(1)
