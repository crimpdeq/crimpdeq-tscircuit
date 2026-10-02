# Crimpdeq PCB — ADS1220 variant (tscircuit)

tscircuit port of [crimpdeq-pcb v2.0.0](https://github.com/crimpdeq/crimpdeq-pcb/tree/v2.0.0)
with the HX711 replaced by a TI ADS1220 24-bit ADC.

- Board: 17 × 31.5 mm, 4 layers, components on both sides (v2.0.0: 23 × 63.8 mm, 2 layers)
- Top: ESP32-C3-MINI-1 (antenna at the board edge, copper keepout on all layers),
  USB-C (TYPE-C-31-M-12, flush with the opposite edge), USB ESD, both LEDs
- Bottom: charger, power path, 3V3 buck, MAX17048, ADS1220 and passives
- Stackup: GND pour on every layer; inner2 (next to the bottom side) is a solid GND
  plane under the buck and the ADS1220 front end (`lib/gndPlane.ts`), and signals run
  on the other layers and the rest of inner2. GND stitching vias at the module EPAD,
  the ADS1220 bypass capacitors and AVSS, the buck and the board edges
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
- 3V3 buck laid out after the SY8088 layout notes, with its power copper routed by hand:
  C15's GND pad lines up with the gap between FB and IN, so a 0.8 mm strap reaches
  the GND pin under the package; C17's GND pad joins C15's; LX reaches L1 in 0.7 mm;
  the feedback divider sits at the FB pin and senses 3V3 at C17.
- 3V3 from C17 to the ESP32 decoupling (D3, C4, C2, C1, C9) is a 0.4 mm hand-routed
  trunk (v2.0.0 used up to 0.61 mm; the router narrows V3_3 to 0.127 mm).
- ESD diode and receptacle GND pads are tied by hand to the J2 GND pins, the shell legs
  and (D7) a via.
- The buck EN pull-up (R14) gets VSYS from U6.IN over inner1: on the bottom side the GND
  strap, U6 and L1 close U6.IN off from the feedback divider column.
- Hand-routed signals where the router failed most: U5's I2C through its pull-ups to
  U1, the fuel gauge alert to U1.IO10 (inner1), the ADS1220 SPI and DRDY (vias right of
  U3, then the top side under U1's pad row, DOUT on inner1), CS to its pull-up, the
  front end (AIN0/AIN1 through the input filter, REFP0 to C14/R22, AIN3 to REFN0), its
  3V3 (AVDD/DVDD through C11/C13, fed from the 3V3 trunk over inner1) and the four
  load cell lines to J3 (S-/E- on the bottom, E+/S+ on inner1).

## Verify

```sh
bun install --frozen-lockfile   # exact tool versions from bun.lock
npm run verify   # netlist + routing baselines, placement, schematic, build, per-check DRC,
                 # gerber shorts, fab paste and copper
npm run fab      # PCBWay package in dist/fab/
```

`scripts/drc.ts` runs every PCB check individually because the built-in DRC
aborts when its copper-pour check crashes, and adds minimum trace width, inner2 GND
plane and 3V3 supply topology checks (at most 3 mm of the buck -> U1 3V3 path below
0.25 mm). `scripts/netlist.py` and `scripts/routing.py` compare
connectivity and routed copper against `scripts/netlist.expected.json` and
`scripts/routing.expected.json`.

`scripts/fab-json.ts` fixes the paste and GND pours in the copy of `circuit.json`
that `npm run fab` exports, and checks the result: tscircuit leaves pill and
polygon pads without paste, shrinks all paste to 49 % of the pad area, pastes
every plated hole on both sides, and leaves floating pour copper. It also
unrotates the pads at multiples of 90° (size swapped): tscircuit flashes rounded
rotated pads with a `%LR` load rotation that some CAM tools ignore, and `npm run fab`
fails if any `%LR` is left.

## Online viewer

<https://tscircuit.crimpdeq.com> serves the PCB, schematic and 3D viewer as a
static site on Cloudflare Pages (project `crimpdeq-tscircuit`).
`.github/workflows/site.yml` rebuilds and deploys it on every push to `main`
(repository secret `CLOUDFLARE_API_TOKEN`, Cloudflare Pages: Edit). Both the
workflow and `npm run site` refuse to publish a routing that differs from
`scripts/routing.expected.json`.

```sh
npm run site          # static site in dist/site/
npm run site:deploy   # build and upload it (needs `npx wrangler login`)
```

## PCBWay order

`dist/fab/` contains `pcbway_gerbers.zip` (Gerbers + drills), `pcbway_bom.csv`
(grouped by manufacturer part number, with LCSC codes as sourcing hints and
substitution notes), `pcbway_centroid.csv` (mm, origin at the board center) and
top/bottom assembly drawings from `scripts/assembly.ts` (bottom mirrored, as seen
from below; the corner triangle marks pin 1, or the cathode of diodes and LEDs).

`.github/workflows/release.yml` builds the same package on every published GitHub
release, after `npm run verify` passes, and attaches it to the release as
`crimpdeq-tscircuit-<tag>-*` with a `SHA256SUMS` file. Pull requests that change
the fab scripts and manual runs only build it, as a workflow artifact.

Quote settings: 4 layers, 17 × 31.5 mm, 1.6 mm FR-4, min track/spacing 5/5 mil,
min hole 0.3 mm, assembly on both sides. The centroid rotations come from
tscircuit; ask PCBWay to confirm orientation against the assembly drawings.

Assembly notes for PCBWay:

- Reflow the bottom side first; the top carries the heavy parts (U1, J2).
- J2's four shell legs are pin-in-paste in the top reflow: top paste over the leg
  pads, none on the bottom.
- The J3/J4 wire pads have no paste; the load cell and battery wires are
  hand-soldered afterwards.
- Paste is 1:1 on normal pads and 50–60 % on the thermal pads (U1 EPAD, U3 and
  U5 exposed pads).

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

The router output depends on the platform: the accepted routing comes from macOS
arm64, which CI uses, and a Linux x64 build of the same design routes differently.
Run the search and accept routings on macOS.

The buck power copper, the 3V3 trunk and the USB-area GND returns are `<trace>`
elements with `pcbPath` (`pcbPath={[toPort]}` for a straight line between pad
centers; core fixes only traces with a non-empty `pcbPath`, and the router crossed
`pcbPath={[]}` ones).
`pcbStraightLine` ends traces at the pad edge, and tscircuit then attaches the end to
whichever pad covers that point on any layer (here U1's pads on the top side).
Routing on only three layers (all of inner2 reserved) left the board unroutable,
and the router fails outright when it uses a shell-leg hole of J2 as a layer change
(`SameNetViaMergerSolver could not find transition layers`), which the hand-routed
USB GND returns avoid.

The board routes with `lib/gndPlaneRouter.ts` (`autorouter={{ algorithmFn }}`): the
stock solver with two changes to its input. GND is not routed: the GND pours on all
four layers and the stitching vias join the GND pads, and
`checkEachPcbPortConnectedToPcbTraces` fails if any GND pad is left on its own copper
island (a pad boxed in by hand-routed traces needs a via or a trace of its own, as
C14's does). Routed, GND took half of the router's traces and most of its errors. The
`unbroken` inner2 GND pours are detached from GND, so they only keep other nets out.
Attached, the router escapes nearby GND pads into the pour with vias whose clearance it
checks only between the pad and pour layers; built as through vias, they landed on pads
on the other side (L1, C16, C17, C11, C12).

## License

This repository is source-available for personal and educational use only.

Commercial manufacture, sale of PCBs, sale of 3D-printed cases, kits, or assembled Crimpdeq devices requires prior written permission.

The vendored tscircuit skill in `.agents/skills/tscircuit/` keeps its own MIT license.
