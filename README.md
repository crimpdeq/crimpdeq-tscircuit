# Crimpdeq PCB — ADS1220 variant (tscircuit)

tscircuit port of [crimpdeq-pcb v2.0.0](https://github.com/crimpdeq/crimpdeq-pcb/tree/v2.0.0)
with the HX711 replaced by a TI ADS1220 24-bit ADC.

- Board: 17 × 31.5 mm, 4 layers, components on both sides (v2.0.0: 23 × 63.8 mm, 2 layers)
- Top: ESP32-C3-MINI-1 (antenna at the board edge, copper keepout on all layers),
  USB-C (TYPE-C-31-M-12, flush with the opposite edge), USB ESD, both LEDs
- Bottom: charger, power path, 3V3 buck, MAX17048, ADS1220 and passives
- Stackup: signals on all layers, GND pour on every layer, GND stitching vias at the
  module EPAD, the ADS1220 bypass capacitors and AVSS, the buck and the board edges
- Design rules (PCBWay): 5/5 mil track/space, vias 0.3 mm drill / 0.5 mm pad,
  0.3 mm copper-to-edge

## ADS1220 hookup

| ADS1220 | Net |
| --- | --- |
| AVDD, DVDD | 3V3 |
| REFP0 | load cell E+: 3V3 through 10 Ω (R22), 1 µF to GND (C14) |
| REFN0, AIN3/REFN1 | load cell E−, switched to AVSS by the internal low-side switch |
| AVSS, DGND, CLK, EP | GND |
| SCLK / DIN / DOUT/DRDY / CS | GPIO5 / GPIO4 / GPIO1 / GPIO3, CS pulled up to 3V3 (100 kΩ) |
| DRDY | GPIO0 |
| AIN0 / AIN1 | load cell S+ / S− through 1 kΩ each, 10 nF C0G differential (~8 kHz) |
| AIN2 | not connected |

The bridge is powered only while the low-side switch is closed: firmware must set
`PSW = 1` (config register 2), which closes the switch on START/SYNC and opens it on
POWERDOWN. REFP0 and REFN0 sense the bridge on both sides, so the reference stays
ratiometric across R22 and the switch.

Wire pads: J3 `E+ S+ S- E-` (E+ = filtered 3V3, E− = low-side switch), J4 `SW- SW+ B+ B-` (SW+ = B+, SW− = power-path input).
v2.0.0 names these the other way round: its `SW+` pad is the power-path input and `VBAT` is the battery.

## Changes vs v2.0.0 beyond the ADC

- HX711 support parts (Q1, R5, R6, C11 VBG) removed; ADS1220 decoupling added.
- Load cell excitation switched off in power-down by the ADS1220 low-side switch
  (v2.0.0 turns the HX711 E+ regulator off instead).
- Smaller, equivalent parts: L1 FTC252012S2R2MBCA (2520, 2.2 µH, 3 A), D2/D8 B5819WS (SOD-323).
- RGB LED: XL-2121RGBC-2812B (2 × 2 mm, WS2812 protocol). Its datasheet gives
  3.0–5.5 V only as the supply limit and full function at 4.5–5.5 V, so at 3.3 V
  blue and green may be dim; the WS2812B-5050 (3.7–5.3 V) was also run at 3.3 V.
- Added: 4.7 kΩ I2C pull-ups (MAX17048), 100 nF at the RGB LED, a battery GND pad (B−).
- ADS1220 100 nF bypass capacitors (C11, C13) 0.5 mm from AVDD/DVDD, fed from the
  C10 bulk capacitor, with GND vias at their GND pads.
- RGB LED fed through a 0 Ω link (R24) that joins 3V3 at C10, so the LED current
  doesn't flow along the ADS1220 supply path.
- USB-C shield tied directly to GND (R17 0 Ω removed).

## Verify

```sh
bun install --frozen-lockfile   # exact tool versions from bun.lock
npm run verify   # netlist + routing baselines, placement, schematic, build, per-check DRC, gerber shorts
npm run fab      # PCBWay package in dist/fab/
```

`scripts/drc.ts` runs every PCB check individually because the built-in DRC
aborts when its copper-pour check crashes, and adds minimum trace width and 3V3
supply topology checks. `scripts/netlist.py` and `scripts/routing.py` compare
connectivity and routed copper against `scripts/netlist.expected.json` and
`scripts/routing.expected.json`.

## PCBWay order

`dist/fab/` contains `pcbway_gerbers.zip` (Gerbers + drills), `pcbway_bom.csv`
(grouped by manufacturer part number, with LCSC codes as sourcing hints and
substitution notes), `pcbway_centroid.csv` (mm, origin at the board center) and
top/bottom assembly drawings from `scripts/assembly.ts` (bottom mirrored, as seen
from below; the corner triangle marks pin 1, or the cathode of diodes and LEDs).

Quote settings: 4 layers, 17 × 31.5 mm, 1.6 mm FR-4, min track/spacing 5/5 mil,
min hole 0.3 mm, assembly on both sides. The centroid rotations come from
tscircuit; ask PCBWay to confirm orientation against the assembly drawings.

## Routing

Traces come from the tscircuit autorouter, which is deterministic: with the
pinned tool versions the same design always routes the same way, and
`scripts/routing.py` fails `verify` if the routed copper changes.

At this density the router sometimes leaves via-to-pad clearance violations or
shorts that its own DRC misses, and any change to PCB placement, footprints or
routing rules re-routes the whole board. After such a change:

```sh
npm run search -- --adopt        # nudges passives until the board routes clean
npm run verify                   # fails on the routing baseline: expected
python3 scripts/routing.py --update && npm run verify
```

`scripts/search.py` works in a scratch directory outside the project, builds 8
variants at a time, nudges the passives nearest the remaining errors, and stops
at the first variant with a clean DRC, no shorts and a clean placement check.
