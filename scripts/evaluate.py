# Evaluate routed circuit.json files: per-check DRC (bun scripts/drc.ts) + gerber shorts.
# Each step runs with a timeout so a stalled checker cannot block the sweep.
# Usage: python3 scripts/evaluate.py dist/<name>/circuit.json [...]
import os, re, subprocess, sys

env = dict(os.environ, PATH=f"{os.getcwd()}/node_modules/.bin:{os.environ['PATH']}")

def run(cmd, timeout):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
        return p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        return "TIMEOUT"

for f in sys.argv[1:]:
    if not os.path.exists(f):
        print(f"{f}: missing")
        continue
    drc = run(["bun", "scripts/drc.ts", f], 240)
    crashes = re.findall(r"CRASH (\w+)", drc)
    verdict = drc.strip().splitlines()[-1] if drc != "TIMEOUT" else "DRC TIMEOUT"
    shorts = run(["tsci", "check", "shorts", f], 240)
    n_shorts = "TIMEOUT" if shorts == "TIMEOUT" else len(re.findall(r"^\d+\. ", shorts, re.M))
    print(f"{f}: {verdict} | shorts={n_shorts} | crashed checks={crashes}")
