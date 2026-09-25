import { Fragment } from "react"
import type { ConnectorProps } from "@tscircuit/props"

type WirePad = { label: string; silk: string }

/**
 * Vertical column of plated wire-solder pads, pin1 at the top. Each pad gets a
 * silkscreen label on both sides, offset horizontally by `silkOffsetX`. Bare
 * pads, so they are excluded from assembly.
 */
export const WirePads = ({
  pads,
  pitch = 2.2,
  silkOffsetX = 1.6,
  ...props
}: Omit<ConnectorProps, "pinLabels" | "footprint"> & {
  pads: WirePad[]
  pitch?: number
  silkOffsetX?: number
}) => {
  const top = ((pads.length - 1) * pitch) / 2
  const pinLabels = Object.fromEntries(
    pads.map((pad, i) => [`pin${i + 1}`, pad.label]),
  )

  return (
    <connector
      doNotPlace
      {...props}
      pinLabels={pinLabels}
      footprint={
        <footprint insertionDirection="from_above">
          {pads.map((pad, i) => (
            <Fragment key={pad.label}>
              <platedhole
                portHints={[`pin${i + 1}`]}
                shape="circle"
                holeDiameter="0.8mm"
                outerDiameter="1.5mm"
                pcbX={0}
                pcbY={top - i * pitch}
              />
            </Fragment>
          ))}
          <courtyardrect
            pcbX={0}
            pcbY={0}
            width={2}
            height={(pads.length - 1) * pitch + 2}
          />
          {pads.map((pad, i) => (
            <Fragment key={`${pad.label}-silk`}>
              <silkscreentext
                text={pad.silk}
                layers={["top", "bottom"]}
                pcbX={silkOffsetX}
                pcbY={top - i * pitch}
                anchorAlignment="center"
                fontSize="0.7mm"
              />
            </Fragment>
          ))}
        </footprint>
      }
    />
  )
}
