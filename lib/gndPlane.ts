// Regions where inner2 is a solid GND plane: the router may not route other
// nets there (vias still pass). inner2 is the plane next to the bottom side,
// which carries the buck and the ADS1220 front end. Reserving all of inner2
// left the board unroutable, so the rest of the layer still carries traces.
// Used by index.circuit.tsx (unbroken pours) and scripts/drc.ts (check).
export const GND_PLANE_LAYER = "inner2" as const

export const GND_PLANE_REGIONS: Record<string, { x: number; y: number }[]> = {
  // U6, L1, C15, C17 and the feedback divider
  buck: [
    { x: 0.4, y: 2.2 },
    { x: 8.1, y: 2.2 },
    { x: 8.1, y: 9.7 },
    { x: 0.4, y: 9.7 },
  ],
  // U3, its bypass capacitors and the load cell input filter
  adc: [
    { x: -8.1, y: -5.6 },
    { x: -0.6, y: -5.6 },
    { x: -0.6, y: 1.6 },
    { x: -8.1, y: 1.6 },
  ],
}
