// Run each @tscircuit/checks PCB check separately so one crashing check
// (e.g. the copper-pour boolean op) cannot hide the results of the others.
// Usage: bun scripts/drc.ts [circuit.json]
import { readFileSync } from "node:fs"
import * as checks from "@tscircuit/checks"

const file = process.argv[2] ?? "dist/index/circuit.json"
const circuitJson = JSON.parse(readFileSync(file, "utf8"))

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
  console.log(`${missing.length ? "FAIL" : "ok  "} connectedPortsHavePads: ${missing.length} errors`)
  for (const e of missing.slice(0, 8))
    console.log(`       - ${names.get(e.source_component_id)}.${e.name} has no PCB pad`)
}
for (const name of pcbChecks) {
  const fn = (checks as any)[name]
  if (typeof fn !== "function") {
    console.log(`?? ${name}: not exported`)
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
    console.log(
      `${issues.length ? "FAIL" : "ok  "} ${name}: ${issues.length} errors, ${warnings.length} warnings`,
    )
    for (const e of [...issues, ...warnings].slice(0, 8)) {
      console.log(`       - ${e.type}: ${e.message}`)
    }
  } catch (err) {
    console.log(`CRASH ${name}: ${(err as Error).message}`)
  }
}
console.log(failures ? `\n${failures} DRC errors` : "\nDRC clean")
process.exit(failures ? 1 : 0)
