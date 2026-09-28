#!/bin/bash
# Build the PCBWay order package from dist/index/circuit.json into dist/fab/:
#   pcbway_gerbers.zip (Gerbers + drills), pcbway_bom.csv, pcbway_centroid.csv,
#   assembly-top.svg / assembly-bottom.svg (bottom mirrored, viewed from the bottom)
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/node_modules/.bin:$PATH"
out="$PWD/dist/fab"
# Stage outside the project: `tsci dev` watches it and crashes on files that vanish
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out" "$tmp/gerbers" "$tmp/fab"

# Solder paste and floating GND pour fixes (scripts/fab-json.ts); the exporter
# only takes a file named circuit.json
bun scripts/fab-json.ts dist/index/circuit.json "$tmp/fab/circuit.json"
# The exporter's pick-and-place rotation notes refer to the JLCPCB parts database; unused here
tsci export "$tmp/fab/circuit.json" -f gerbers -o "$tmp/tscircuit.zip" 2>&1 |
  grep -v "jlcpcb pick-and-place rotation\|^Exported to" || true
unzip -q "$tmp/tscircuit.zip" -d "$tmp/gerbers"
rm -f "$tmp/gerbers/bom.csv" "$tmp/gerbers/pick_and_place.csv"
# Some CAM tools and viewers ignore %LR (load rotation); fab-json.ts unrotates the pads
if grep -l '%LR' "$tmp/gerbers"/*.gbr; then
  echo "fab: the Gerbers above use %LR load rotation" >&2
  exit 1
fi
# Name the drill files by plating, as KiCad does
mv "$tmp/gerbers/drill-L1-L4.drl" "$tmp/gerbers/drill-PTH.drl"
mv "$tmp/gerbers/drill_npth.drl" "$tmp/gerbers/drill-NPTH.drl"
(cd "$tmp/gerbers" && zip -q "$tmp/pcbway_gerbers.zip" ./*)
mv "$tmp/pcbway_gerbers.zip" "$out/pcbway_gerbers.zip"

python3 scripts/pcbway.py
bun scripts/assembly.ts dist/index/circuit.json "$out" > /dev/null
ls -1 "$out"
