import { SOLVERS } from "tscircuit"

// Board autorouter: the stock solver (AutoroutingPipelineSolver9_PreloadedTraceGraph,
// as core runs it) with two changes to its input, keyed on the `unbroken` GND
// pours of lib/gndPlane.ts:
// - GND is not routed. The GND pours on all four layers and the stitching vias
//   join the GND pads; drc.ts (checkEachPcbPortConnectedToPcbTraces) fails if
//   any GND pad ends up on its own copper island. Routed, GND took half of the
//   router's traces and most of its clearance errors.
// - The pours are detached from GND, so they only keep other nets off inner2
//   there. Attached, the router escaped nearby GND pads into them with vias
//   whose clearance it checked only between the pad and pour layers; drilled
//   through all four layers, those vias landed on pads on the other side.
type Handler = (event: any) => void

export const gndPlaneAutorouter = async (simpleRouteJson: any) => {
  const planeNets = new Set(
    simpleRouteJson.obstacles.filter((o: any) => o.isCopperPour).flatMap((o: any) => o.connectedTo),
  )
  const input = {
    ...simpleRouteJson,
    connections: simpleRouteJson.connections.filter((c: any) => !planeNets.has(c.name)),
    obstacles: simpleRouteJson.obstacles.map((o: any) =>
      o.isCopperPour ? { ...o, connectedTo: [] } : o,
    ),
  }
  const solver: any = new SOLVERS.AutoroutingPipelineSolver9_PreloadedTraceGraph(input, {})
  const handlers: Record<string, Handler[]> = { complete: [], error: [], progress: [] }
  const emit = (event: any) => handlers[event.type]?.forEach((h) => h(event))
  let running = false
  // Step in 250 ms slices like core's TscircuitAutorouter, so builds and the
  // dev server stay responsive
  const cycle = async () => {
    if (!running) return
    try {
      const start = Date.now()
      while (Date.now() - start < 250 && !solver.solved && !solver.failed) {
        if (typeof solver.stepAsync === "function") await solver.stepAsync()
        else solver.step()
      }
      if (solver.failed) {
        running = false
        emit({ type: "error", error: new Error(solver.error || "Routing failed") })
      } else if (solver.solved) {
        running = false
        emit({ type: "complete", traces: solver.getOutputSimplifiedPcbTraces() })
      } else {
        emit({ type: "progress", progress: solver.progress })
        setTimeout(cycle, 0)
      }
    } catch (error) {
      running = false
      emit({ type: "error", error })
    }
  }
  return {
    solver,
    on(event: string, handler: Handler) {
      handlers[event]?.push(handler)
    },
    start() {
      if (running) return
      running = true
      setTimeout(cycle, 0)
    },
    stop() {
      running = false
    },
  }
}
