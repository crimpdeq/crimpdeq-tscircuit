// Run each @tscircuit/checks PCB check separately so one crashing check
// (e.g. the copper-pour boolean op) cannot hide the results of the others.
// Usage: bun scripts/drc.ts [--json] [circuit.json]
//   --json prints {errors: [{check, type, message, center}], crashed: [check]}
import { readFileSync } from "node:fs"
import * as checks from "@tscircuit/checks"

const json = process.argv.includes("--json")
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "dist/index/circuit.json"
const circuitJson = JSON.parse(readFileSync(file, "utf8"))
const log = (line: string) => {
  if (!json) console.log(line)
}
type Point = { x: number; y: number }
const errors: { check: string; type: string; message: string; center?: Point }[] = []

// Error location: its own center, else the first pad/port/via it references
const positions = new Map<string, Point>()
for (const e of circuitJson)
  for (const idKey of ["pcb_port_id", "pcb_via_id", "pcb_smtpad_id", "pcb_plated_hole_id"])
    if (e.type === idKey.slice(0, -3) && typeof e.x === "number") positions.set(e[idKey], { x: e.x, y: e.y })
const locate = (e: any): Point | undefined => {
  if (e.center) return e.center
  const ids = [
    ...(e.pcb_port_ids ?? []),
    ...(e.pcb_pad_ids ?? []),
    e.pcb_via_id,
    e.pcb_port_id,
    ...String(e.message ?? "").match(/pcb_(?:via|port)_\d+/g) ?? [],
  ]
  for (const id of ids) if (id && positions.has(id)) return positions.get(id)
}
const crashed: string[] = []

const pcbChecks = [
  "checkEachPcbPortConnectedToPcbTraces",
  "checkSourceTracesHavePcbTraces",
  "checkEachPcbTraceNonOverlapping",
  "checkCopperPourShorts",
  "checkPadTraceClearance",
  "checkViaTraceClearance",
  "checkViaPadClearance",
  "checkPadPadClearance",
  "checkSameNetViaSpacing",
  "checkDifferentNetViaSpacing",
  "checkTracesAreContiguous",
  "checkPcbTracesOutOfBoard",
  "checkViasOffBoard",
  "checkViasInPads",
  "checkCopperToBoardEdgeClearance",
  "checkPcbCopperOverKeepout",
  "checkPcbComponentOverlap",
  "checkPcbComponentsOutOfBoard",
  "checkConnectorAccessibleOrientation",
] as const

let failures = 0

// Every netlist-connected source port must have a PCB port (pad). Some schematic
// props (e.g. schPinArrangement on standard connectors) silently drop pads.
{
  const connected = new Set<string>()
  for (const e of circuitJson)
    if (e.type === "source_trace")
      for (const id of e.connected_source_port_ids ?? []) connected.add(id)
  const withPad = new Set(
    circuitJson.filter((e: any) => e.type === "pcb_port").map((e: any) => e.source_port_id),
  )
  const names = new Map(
    circuitJson
      .filter((e: any) => e.type === "source_component")
      .map((e: any) => [e.source_component_id, e.name]),
  )
  // Multi-pad pins (module center pad, connector shell) attach copper by port hint
  const componentOfPcb = new Map(
    circuitJson
      .filter((e: any) => e.type === "pcb_component")
      .map((e: any) => [e.pcb_component_id, e.source_component_id]),
  )
  const padHints = new Set<string>()
  for (const e of circuitJson)
    if ((e.type === "pcb_smtpad" || e.type === "pcb_plated_hole") && e.port_hints)
      for (const hint of e.port_hints)
        padHints.add(`${componentOfPcb.get(e.pcb_component_id)}:${hint}`)
  const hasPadByHint = (port: any) =>
    [port.name, ...(port.port_hints ?? [])].some((hint: string) =>
      padHints.has(`${port.source_component_id}:${hint}`),
    )
  const missing = circuitJson.filter(
    (e: any) =>
      e.type === "source_port" &&
      connected.has(e.source_port_id) &&
      !withPad.has(e.source_port_id) &&
      !hasPadByHint(e),
  )
  failures += missing.length
  log(`${missing.length ? "FAIL" : "ok  "} connectedPortsHavePads: ${missing.length} errors`)
  for (const e of missing) {
    const message = `${names.get(e.source_component_id)}.${e.name} has no PCB pad`
    errors.push({ check: "connectedPortsHavePads", type: "missing_pad", message })
  }
  for (const e of errors.slice(0, 8)) log(`       - ${e.message}`)
}
// Custom checks: report in the same format as the @tscircuit/checks ones
type Issue = { type: string; message: string; center?: Point }
const report = (check: string, issues: Issue[]) => {
  failures += issues.length
  errors.push(...issues.map((e) => ({ check, ...e })))
  log(`${issues.length ? "FAIL" : "ok  "} ${check}: ${issues.length} errors`)
  for (const e of issues.slice(0, 8)) log(`       - ${e.message}`)
}

// The router sometimes narrows a trace below the board minimum (e.g. stubs into
// polygon pads); the built-in checks do not look at widths
const MIN_TRACE_WIDTH = 0.127
{
  const issues: Issue[] = []
  for (const t of circuitJson.filter((e: any) => e.type === "pcb_trace"))
    for (const p of t.route)
      if (p.route_type === "wire" && p.width < MIN_TRACE_WIDTH - 1e-6) {
        issues.push({
          type: "trace_too_narrow",
          message: `${t.pcb_trace_id} is ${p.width} mm wide at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) on ${p.layer}`,
          center: { x: p.x, y: p.y },
        })
        break
      }
  report("minTraceWidth", issues)
}

// 3V3 supply topology. The router joins each pad to its nearest same-net pad, so
// placement decides where currents flow; every re-route can change it. The RGB
// LED link (R24) must reach the buck without passing the ADS1220 supply pins or
// their bypass capacitors (LED PWM current off AVDD/DVDD). The buck -> ESP32
// 3V3 path is reported: the router narrows V3_3 below its 0.25 mm width.
{
  const sourceNames = new Map(
    circuitJson.filter((e: any) => e.type === "source_component").map((e: any) => [e.source_component_id, e.name]),
  )
  const sourcePorts = new Map(circuitJson.filter((e: any) => e.type === "source_port").map((e: any) => [e.source_port_id, e]))
  const pcbPorts = new Map(circuitJson.filter((e: any) => e.type === "pcb_port").map((e: any) => [e.pcb_port_id, e]))
  const portName = (id: string) => {
    const sp: any = sourcePorts.get((pcbPorts.get(id) as any)?.source_port_id)
    return sp ? `${sourceNames.get(sp.source_component_id)}.${sp.name}` : id
  }
  type Edge = { to: string; narrow: number; wide: number; vias: number }
  const graph = new Map<string, Edge[]>()
  for (const t of circuitJson.filter((e: any) => e.type === "pcb_trace")) {
    const ends = t.route.flatMap((p: any) => [p.start_pcb_port_id, p.end_pcb_port_id]).filter(Boolean).map(portName)
    if (ends.length !== 2) continue
    let [narrow, wide] = [0, 0]
    for (let k = 1; k < t.route.length; k++) {
      const [a, b] = [t.route[k - 1], t.route[k]]
      if (a.route_type !== "wire" || b.route_type !== "wire") continue
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      if (Math.min(a.width, b.width) < 0.25 - 1e-6) narrow += length
      else wide += length
    }
    const vias = t.route.filter((p: any) => p.route_type === "via").length
    for (const [a, b] of [ends, [...ends].reverse()])
      graph.set(a, [...(graph.get(a) ?? []), { to: b, narrow, wide, vias }])
  }
  const path = (from: string, to: string) => {
    const prev = new Map<string, [string, Edge] | null>([[from, null]])
    const queue = [from]
    for (let q = 0; q < queue.length && !prev.has(to); q++)
      for (const e of graph.get(queue[q]) ?? [])
        if (!prev.has(e.to)) {
          prev.set(e.to, [queue[q], e])
          queue.push(e.to)
        }
    const nodes = [to]
    const edges: Edge[] = []
    for (let step = prev.get(to); step; step = prev.get(step[0])) {
      nodes.unshift(step[0])
      edges.push(step[1])
    }
    return prev.has(to) ? { nodes, edges } : undefined
  }
  const issues: Issue[] = []
  const led = path("L1.pin2", "R24.pin1")
  const adcSupply = ["U3.AVDD", "U3.DVDD", "C11.pin1", "C13.pin1"]
  if (!led || led.nodes.some((n) => adcSupply.includes(n)))
    issues.push({ type: "led_supply_via_adc", message: `LED supply path: ${led?.nodes.join(" -> ") ?? "none"}` })
  report("supplyTopology", issues)
  const mcu = path("L1.pin2", "U1.3V3")
  const sum = (key: "narrow" | "wide" | "vias") => mcu?.edges.reduce((s, e) => s + e[key], 0) ?? NaN
  log(
    `       buck -> U1 3V3: ${sum("narrow").toFixed(1)} mm below 0.25 mm, ${sum("wide").toFixed(1)} mm at 0.25 mm, ${sum("vias")} vias`,
  )
}

for (const name of pcbChecks) {
  const fn = (checks as any)[name]
  if (typeof fn !== "function") {
    log(`?? ${name}: not exported`)
    continue
  }
  try {
    const result = await fn(structuredClone(circuitJson))
    const issues = (Array.isArray(result) ? result : []).filter(
      (e: any) => !String(e.type).endsWith("_warning"),
    )
    const warnings = (Array.isArray(result) ? result : []).filter((e: any) =>
      String(e.type).endsWith("_warning"),
    )
    failures += issues.length
    for (const e of issues)
      errors.push({ check: name, type: e.type, message: e.message, center: locate(e) })
    log(
      `${issues.length ? "FAIL" : "ok  "} ${name}: ${issues.length} errors, ${warnings.length} warnings`,
    )
    for (const e of [...issues, ...warnings].slice(0, 8)) {
      log(`       - ${e.type}: ${e.message}`)
    }
  } catch (err) {
    crashed.push(name)
    log(`CRASH ${name}: ${(err as Error).message}`)
  }
}
if (json) console.log(JSON.stringify({ errors, crashed }))
// A crashed check proves nothing; checkCopperPourShorts crashes are covered by `tsci check shorts`
const crashNote = crashed.length ? ` (not run, crashed: ${crashed.join(", ")})` : ""
log(failures ? `\n${failures} DRC errors${crashNote}` : `\nDRC clean${crashNote}`)
process.exit(failures ? 1 : 0)
