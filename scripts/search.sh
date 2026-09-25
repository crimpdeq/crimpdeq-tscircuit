#!/bin/bash
# Re-roll autorouting: build perturbed copies of index.circuit.tsx (4 in parallel)
# and evaluate each with per-check DRC + gerber shorts.
# Usage: scripts/search.sh "<name>:<python stmt using mv(ref, dx, dy)>" ...
cd "$(dirname "$0")/.." && export PATH=$PWD/node_modules/.bin:$PATH
for spec in "$@"; do
  name=${spec%%:*}; expr=${spec#*:}
  python3 - "$name" "$expr" <<'PY'
import re, sys
name, expr = sys.argv[1:]
import os
s = open(os.environ.get("BASE", "index.circuit.tsx")).read()
def mv(ref, dx=0, dy=0):
    global s
    m = re.search(r'name="%s"\n(.*?)\n(\s+/>)' % ref, s, re.S)
    b = m.group(1)
    b = re.sub(r'pcbX=\{(-?[\d.]+)\}', lambda k: f'pcbX={{{round(float(k.group(1))+dx,3)}}}', b)
    b = re.sub(r'pcbY=\{(-?[\d.]+)\}', lambda k: f'pcbY={{{round(float(k.group(1))+dy,3)}}}', b)
    s = s[:m.start(1)] + b + s[m.end(1):]
exec(expr)
open(f"srch_{name}.circuit.tsx", "w").write(s)
PY
done
names=(); for spec in "$@"; do names+=("${spec%%:*}"); done
for ((i=0; i<${#names[@]}; i+=4)); do
  # hard 8-minute cap per build (SIGKILL): some variants hang after routing
  for n in "${names[@]:i:4}"; do
    (
      tsci build srch_$n.circuit.tsx --ignore-warnings --autorouter-timeout 300s > /tmp/log_srch_$n.txt 2>&1 &
      pid=$!
      ( sleep 480 && kill -9 $pid 2>/dev/null ) &
      watchdog=$!
      wait $pid
      kill $watchdog 2>/dev/null
    ) &
  done
  wait
done
python3 scripts/evaluate.py $(for n in "${names[@]}"; do echo dist/srch_$n/circuit.json; done)
