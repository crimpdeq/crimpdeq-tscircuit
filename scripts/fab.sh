#!/bin/bash
# Build the PCBWay order package from dist/index/circuit.json into dist/fab/:
#   pcbway_gerbers.zip (Gerbers + drills), pcbway_bom.csv, pcbway_centroid.csv,
#   assembly-top.svg / assembly-bottom.svg
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/node_modules/.bin:$PATH"
out="$PWD/dist/fab"
# Stage outside the project: `tsci dev` watches it and crashes on files that vanish
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out" "$tmp/gerbers"

# The exporter's pick-and-place rotation notes refer to the JLCPCB parts database; unused here
tsci export dist/index/circuit.json -f gerbers -o "$tmp/tscircuit.zip" 2>&1 |
  grep -v "jlcpcb pick-and-place rotation\|^Exported to" || true
unzip -q "$tmp/tscircuit.zip" -d "$tmp/gerbers"
rm -f "$tmp/gerbers/bom.csv" "$tmp/gerbers/pick_and_place.csv"
(cd "$tmp/gerbers" && zip -q "$tmp/pcbway_gerbers.zip" ./*)
mv "$tmp/pcbway_gerbers.zip" "$out/pcbway_gerbers.zip"

python3 scripts/pcbway.py
tsci export dist/index/circuit.json -f assembly-svg --layer top -o "$out/assembly-top.svg" > /dev/null
tsci export dist/index/circuit.json -f assembly-svg --layer bottom -o "$out/assembly-bottom.svg" > /dev/null
ls -1 "$out"
