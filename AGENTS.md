# Agent guidelines

tscircuit design of the crimpdeq board (ADS1220 variant). See `README.md` for the
design and `.agents/skills/tscircuit/` for general tscircuit usage. The rules
below override the skill where they conflict.

## Tooling

- `tsci`, `bun` and TypeScript 5 are project-local: run through `npm run …` or
  `node_modules/.bin`. TypeScript 7 breaks `tsci`.
- Dependencies are pinned exactly (`package.json` + `bun.lock`); install with
  `bun install --frozen-lockfile`. Upgrading tscircuit can change routing and
  break `scripts/patch-viewer.mjs`: re-run the search and verify afterwards.
- `npm install` runs `scripts/patch-viewer.mjs`, which patches the browser
  viewer's hover labels. If it fails after a tscircuit update, update its patterns.

## Verification

- A change is done only when `npm run verify` passes: netlist baseline,
  placement, schematic placement, build, per-check DRC and gerber shorts.
- Do not trust the built-in DRC or `tsci build` alone. They missed real shorts
  and via-to-pad violations on this board; `scripts/drc.ts` and
  `tsci check shorts` catch them.
- Connectivity changes: update the baseline with
  `python3 scripts/netlist.py --update` only after reviewing the diff.
- Routing is deterministic for a given design and tool versions.
  `scripts/routing.py` fails `verify` when routed copper changes; accept a new
  routing with `--update` only after the rest of `verify` passes.
- Check that edits to schematic props do not drop PCB pads.
  `schPinArrangement` on a `standard="usb_c"` connector silently removed them;
  `scripts/drc.ts` (`connectedPortsHavePads`) guards this.

## Layout and routing

- Any change to PCB placement, footprints or routing rules re-routes the whole
  board, and the router often leaves shorts at this density. Re-roll with
  `npm run search -- --adopt`, then `npm run verify` and
  `python3 scripts/routing.py --update`.
- Schematic-only edits (`schX`, `displayName`, sections) and 3D model offsets
  do not change routing; confirm that the routed traces are unchanged.
- Design rules target PCBWay 4-layer: 5/5 mil, 0.3/0.5 mm vias, 0.3 mm copper
  to edge, 1.6 mm board. 6/6 mil with 0.6 mm vias did not route at this size.
- `USB_OVERHANG` is limited to ~1.2 mm by the USB-C front shell-leg slots.
- The router output differs between macOS arm64 (CI and the accepted baselines)
  and Linux x64. Run `npm run search` and accept routings on macOS.
- Hand-routed traces: use `pcbPath` (`pcbPath={[]}` for a straight line), not
  `pcbStraightLine`, which attaches clipped ends to top-side U1 pads.
- inner2 is reserved for GND under the buck and the ADC (`lib/gndPlane.ts`);
  reserving all of it left the board unroutable.
- The board autorouter is `lib/gndPlaneRouter.ts`, the stock solver with those
  pours detached from GND (see README). After a tscircuit upgrade, check that
  it still matches core's solver choice and options.

## Working with the dev server

- `tsci dev` watches the whole project and crashes when a file it saw is
  deleted. Create temporary files (variants, snapshots, unzipped exports)
  outside the project, or restart the server afterwards.
- Put hard time limits on builds with `kill -9` (`scripts/search.py` does);
  Bun ignores `SIGALRM`, and some layouts hang after routing.

## Manufacturing

- Fabrication and assembly are at PCBWay: identify parts by manufacturer part
  number (`manufacturerPartNumber`); LCSC codes are sourcing hints only.
- Regenerate `dist/fab/` with `npm run fab` after any design change.
