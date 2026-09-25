# Crimpdeq PCB — ADS1220 variant (tscircuit)

tscircuit port of [crimpdeq-pcb v2.0.0](https://github.com/crimpdeq/crimpdeq-pcb/tree/v2.0.0)
with the HX711 replaced by a TI ADS1220 24-bit ADC.

- Board: 17 × 31.5 mm, 4 layers, components on both sides (v2.0.0: 23 × 63.8 mm, 2 layers)
- Top: ESP32-C3-MINI-1 (antenna at the board edge, copper keepout on all layers),
  USB-C (TYPE-C-31-M-12, flush with the opposite edge), USB ESD, both LEDs
- Bottom: charger, power path, 3V3 buck, MAX17048, ADS1220 and passives
- Stackup: signals on all layers, GND pour on every layer
- Design rules (PCBWay): 5/5 mil track/space, vias 0.3 mm drill / 0.5 mm pad,
  0.3 mm copper-to-edge

## ADS1220 hookup

| ADS1220 | Net |
| --- | --- |
| AVDD, DVDD, REFP0 | 3V3 |
| AVSS, DGND, REFN0, CLK, EP | GND |
| SCLK / DIN / DOUT/DRDY / CS | GPIO5 / GPIO4 / GPIO1 / GPIO3 |
| AIN0 / AIN1 | load cell S+ / S− through 100 Ω each, 100 nF differential |
| AIN2, AIN3, DRDY | not connected |

Wire pads: J3 `E+ S+ S- E-` (E+ = 3V3, E− = GND), J4 `B+ SW B-`.

## Changes vs v2.0.0 beyond the ADC

- HX711 support parts (Q1, R5, R6, C11 VBG) removed; ADS1220 decoupling added.
- Smaller, equivalent parts: L1 FTC252012S2R2MBCA (2520, 2.2 µH, 3 A), D2/D8 B5819WS (SOD-323).
- RGB LED: XL-2121RGBC-2812B (2 × 2 mm, WS2812 protocol, rated 3.0–5.5 V; the
  WS2812B-5050 is rated 3.7–5.3 V but was run at 3.3 V).
- Added: 4.7 kΩ I2C pull-ups (MAX17048), 100 nF at the RGB LED, a battery GND pad (B−).
- USB-C shield tied directly to GND (R17 0 Ω removed).

## Verify

```sh
bun install --frozen-lockfile   # exact tool versions from bun.lock
npm run verify   # netlist baseline, placement, schematic, build, per-check DRC, gerber shorts
npm run fab      # PCBWay package in dist/fab/
```

## PCBWay order

`dist/fab/` contains `pcbway_gerbers.zip` (Gerbers + drills), `pcbway_bom.csv`
(grouped by manufacturer part number, with LCSC codes as sourcing hints and
substitution notes), `pcbway_centroid.csv` (mm, origin at the board center) and
top/bottom assembly drawings.

Quote settings: 4 layers, 17 × 31.5 mm, 1.6 mm FR-4, min track/spacing 5/5 mil,
min hole 0.3 mm, assembly on both sides. The centroid rotations come from
tscircuit; ask PCBWay to confirm orientation against the assembly drawings.

`scripts/drc.ts` runs every PCB check individually because the built-in DRC
aborts when its copper-pour check crashes. `scripts/netlist.py` compares
connectivity against `scripts/netlist.expected.json`.

## Routing

Traces come from the tscircuit autorouter. At this density it sometimes leaves
via-to-pad clearance violations or shorts that its own DRC misses, and any
change to PCB placement or component definitions re-routes the whole board.
After such a change, run `npm run verify`. If it fails, re-roll the routing
with small passive nudges and adopt a clean variant:

```sh
scripts/search.sh "a:mv('C10',0.05)" "b:mv('C9',0,-0.05)" "c:mv('R13',-0.05)"
cp srch_a.circuit.tsx index.circuit.tsx   # the variant reported "DRC clean | shorts=0"
```
