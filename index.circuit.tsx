import { ADS1220IRVAR } from "./imports/ADS1220IRVAR"
import { B5819WS } from "./imports/B5819WS"
import { DMG3415U_7 } from "./imports/DMG3415U_7"
import { FTC252012S2R2MBCA } from "./imports/FTC252012S2R2MBCA"
import { ESP32_C3_MINI_1_N4 } from "./imports/ESP32_C3_MINI_1_N4"
import { LESD5D5_0CT1G } from "./imports/LESD5D5_0CT1G"
import { LESD8D3_3CAT5G } from "./imports/LESD8D3_3CAT5G"
import { MAX17048G_T10 } from "./imports/MAX17048G_T10"
import { MCP73831T_2ACI_OT } from "./imports/MCP73831T_2ACI_OT"
import { SY8088IAAC } from "./imports/SY8088IAAC"
import { TYPE_C_31_M_12 } from "./imports/TYPE_C_31_M_12"
import { XL_2121RGBC_2812B } from "./imports/XL_2121RGBC_2812B"
import { WirePads } from "./lib/WirePads"

// Board outline: 17 x 31.5 mm, origin at the board center, antenna at +Y.
const W = 17
const L = 31.5
const TOP = L / 2
const BOTTOM = -L / 2

// ESP32-C3-MINI-1 footprint origin is the pad-array center; the antenna
// region spans y = +5.6..+11.0 from it. Keep the body flush with the top edge.
const U1_Y = TOP - 11.35
const ANTENNA_Y = U1_Y + 5.6

// Routing keepout band along the board edges
const EDGE_BAND = 0.35

// USB-C receptacle front face sits 5.39 mm below the footprint origin. It
// overhangs the board edge so the plug reaches it through the case wall; the
// front shell-leg slots limit this to ~1.2 mm (0.5 mm of board around them).
const USB_OVERHANG = 1.0
const J2_Y = BOTTOM + 5.39 - USB_OVERHANG

// Passive parts: manufacturer part number + distributor code (LCSC) for PCBWay sourcing
const PARTS = {
  R0: { mpn: "0402WGF0000TCE", lcsc: "C17168" },
  R10: { mpn: "0402WGF100JTCE", lcsc: "C25077" },
  R1k: { mpn: "0402WGF1001TCE", lcsc: "C11702" },
  R4k7: { mpn: "0402WGF4701TCE", lcsc: "C25900" },
  R5k1: { mpn: "0402WGF5101TCE", lcsc: "C25905" },
  R10k: { mpn: "0402WGF1002TCE", lcsc: "C25744" },
  R22k1: { mpn: "0402WGF2212TCE", lcsc: "C43473" },
  R100k: { mpn: "0402WGF1003TCE", lcsc: "C25741" },
  C22p: { mpn: "0402CG220J500NT", lcsc: "C1555" },
  C10n: { mpn: "CL05B103KB5NNNC", lcsc: "C15195" },
  C10n_C0G: { mpn: "GRM1555C1E103JE01D", lcsc: "C3855387" },
  C100n: { mpn: "CL05B104KO5NNNC", lcsc: "C1525" },
  C1u: { mpn: "CL05A105KA5NQNC", lcsc: "C52923" },
  C4u7_0603: { mpn: "CL10A475KO8NNNC", lcsc: "C19666" },
  C10u_0603: { mpn: "CL10A106KP8NNNC", lcsc: "C19702" },
  C10u_0805: { mpn: "CL21A106KAYNNNE", lcsc: "C15850" },
  LED_RED_0603: { mpn: "KT-0603R", lcsc: "C2286" },
}

const part = ({ mpn, lcsc }: { mpn: string; lcsc: string }) => ({
  manufacturerPartNumber: mpn,
  supplierPartNumbers: { lcsc: [lcsc] },
})

const esp32GndPins = [
  "GND1", "GND2", "GND3", "GND4", "GND5", "GND6", "GND7", "GND8", "GND9",
  "GND10", "GND11", "GND12", "GND13", "GND14", "GND15", "GND16", "GND17",
  "GND18", "GND19", "GND20", "GND21", "GND22", "GND23", "GND24", "GND25",
  "GND26", "GND27", "GND28", "GND29", "GND30",
] as const

export default ({ pours = true }: { pours?: boolean }) => (
  <board
    width={W}
    height={L}
    layers={4}
    thickness="1.6mm"
    doubleSidedAssembly
    borderRadius={1}
    // PCBWay 4-layer rules: 5/5 mil track/space, 0.3 mm drill / 0.5 mm vias
    minTraceWidth="0.127mm"
    nominalTraceWidth="0.15mm"
    minTraceToPadEdgeClearance="0.127mm"
    minBoardEdgeClearance="0.3mm"
    minViaEdgeToPadEdgeClearance="0.2mm"
    minViaHoleDiameter="0.3mm"
    minViaPadDiameter="0.5mm"
    pcbStyle={{ viaPadDiameter: "0.5mm", viaHoleDiameter: "0.3mm" }}
  >
    <net name="GND" isGroundNet />
    <net name="V3_3" isPowerNet nominalTraceWidth="0.25mm" />
    <net name="V3_3_LED" isPowerNet nominalTraceWidth="0.25mm" />
    <net name="LC_EP" nominalTraceWidth="0.25mm" />
    <net name="LC_EN" />
    <net name="VBUS_IN" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="VBUS" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="VSYS" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="VBAT" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="SW_BATT" isPowerNet nominalTraceWidth="0.3mm" />
    <net name="BUCK_LX" nominalTraceWidth="0.3mm" />

    <schematicsection name="usb" displayName="USB-C input + ESD" />
    <schematicsection name="charger" displayName="Li-ion charger" />
    <schematicsection name="pwrpath" displayName="USB / battery power path" />
    <schematicsection name="buck" displayName="3V3 buck" />
    <schematicsection name="mcu" displayName="ESP32-C3-MINI-1" />
    <schematicsection name="led" displayName="Indicators" />
    <schematicsection name="fuel" displayName="MAX17048 fuel gauge" />
    <schematicsection name="adc" displayName="ADS1220 load cell ADC" />
    <schematicsection name="decoupling" displayName="Decoupling (3V3 / VBAT)" />

    {/* ---------------- USB-C input ---------------- */}
    <TYPE_C_31_M_12
      name="J2"
      displayName="J2 - USB-C"
      pcbX={0}
      pcbY={J2_Y}
      schSectionName="usb"
      schX={-30}
      schY={10}
      connections={{
        VBUS1: "net.VBUS_IN",
        VBUS2: "net.VBUS_IN",
        GND1: "net.GND",
        GND2: "net.GND",
        SHELL1: "net.GND",
        SHELL2: "net.GND",
        SHELL3: "net.GND",
        SHELL4: "net.GND",
        CC1: "net.CC1",
        CC2: "net.CC2",
        DP1: "net.USB_DP",
        DP2: "net.USB_DP",
        DM1: "net.USB_DM",
        DM2: "net.USB_DM",
      }}
    />
    <resistor
      name="R19"
      resistance="5.1k"
      footprint="0402"
      {...part(PARTS.R5k1)}
      layer="bottom"
      pcbX={-1.5}
      pcbY={-8.15}
      schSectionName="usb"
      schX={-21.5}
      schY={8.5}
      schRotation={-90}
      connections={{ pin1: "net.CC1", pin2: "net.GND" }}
    />
    <resistor
      name="R18"
      resistance="5.1k"
      footprint="0402"
      {...part(PARTS.R5k1)}
      layer="bottom"
      pcbX={1.5}
      pcbY={-8.15}
      schSectionName="usb"
      schX={-20}
      schY={8.5}
      schRotation={-90}
      connections={{ pin1: "net.CC2", pin2: "net.GND" }}
    />
    <LESD5D5_0CT1G
      name="D9"
      displayName="D9 - LESD5D5.0"
      pcbX={-2.6}
      pcbY={-6.603}
      pcbRotation={180}
      schSectionName="usb"
      schX={-27.5}
      schY={7.5}
      connections={{ pin1: "net.VBUS_IN", pin2: "net.GND" }}
    />
    <LESD5D5_0CT1G
      name="D7"
      displayName="D7 - LESD5D5.0"
      pcbX={0.0}
      pcbY={-6.603}
      schSectionName="usb"
      schX={-25.5}
      schY={7.5}
      connections={{ pin1: "net.USB_DM", pin2: "net.GND" }}
    />
    <LESD5D5_0CT1G
      name="D10"
      displayName="D10 - LESD5D5.0"
      pcbX={2.6}
      pcbY={-6.603}
      schSectionName="usb"
      schX={-23.5}
      schY={7.5}
      connections={{ pin1: "net.USB_DP", pin2: "net.GND" }}
    />
    {/* Reverse/backfeed blocking between the USB connector and VBUS */}
    <B5819WS
      name="D8"
      displayName="D8 - B5819WS"
      pcbX={6.55}
      pcbY={-5.628}
      schSectionName="usb"
      schX={-25.5}
      schY={11.5}
      schRotation={-90}
      connections={{ anode: "net.VBUS_IN", cathode: "net.VBUS" }}
    />

    {/* ---------------- Li-ion charger ---------------- */}
    <MCP73831T_2ACI_OT
      name="U2"
      displayName="U2 - MCP73831"
      schHeight={0.6}
      layer="bottom"
      pcbX={-1.7}
      pcbY={-13.85}
      pcbRotation={90}
      schSectionName="charger"
      schX={-11.5}
      schY={10}
      connections={{
        VDD: "net.VBUS",
        VSS: "net.GND",
        VBAT: "net.VBAT",
        PROG: "net.CHG_PROG",
        STAT: "net.CHG_STAT",
      }}
    />
    <capacitor
      name="C5"
      capacitance="4.7uF"
      maxVoltageRating="16V"
      footprint="0603"
      {...part(PARTS.C4u7_0603)}
      layer="bottom"
      pcbX={0.0}
      pcbY={-9.45}
      schSectionName="charger"
      schX={-15.5}
      schY={10}
      schRotation={-90}
      connections={{ pin1: "net.VBUS", pin2: "net.GND" }}
    />
    <capacitor
      name="C6"
      capacitance="4.7uF"
      maxVoltageRating="16V"
      footprint="0603"
      {...part(PARTS.C4u7_0603)}
      layer="bottom"
      pcbX={1.8}
      pcbY={-14.8}
      pcbRotation={180}
      schSectionName="fuel"
      schX={0}
      schY={-8.5}
      schRotation={-90}
      connections={{ pin1: "net.VBAT", pin2: "net.GND" }}
    />
    {/* 4.7k PROG -> 213 mA charge current (1000 V / R_PROG) */}
    <resistor
      name="R2"
      resistance="4.7k"
      footprint="0402"
      {...part(PARTS.R4k7)}
      layer="bottom"
      pcbX={1.2}
      pcbY={-13.05}
      pcbRotation={90}
      schSectionName="charger"
      schX={-7.5}
      schY={9.5}
      schRotation={-90}
      connections={{ pin1: "net.CHG_PROG", pin2: "net.GND" }}
    />
    <resistor
      name="R3"
      resistance="1k"
      footprint="0402"
      {...part(PARTS.R1k)}
      layer="bottom"
      pcbX={2.3}
      pcbY={-13.05}
      pcbRotation={90}
      schSectionName="charger"
      schX={-12.5}
      schY={7}
      schRotation={0}
      connections={{ pin1: "net.CHG_STAT", pin2: "net.CHG_LED_K" }}
    />
    <led
      name="D1"
      displayName="D1 - Charge LED"
      color="red"
      footprint="0603"
      {...part(PARTS.LED_RED_0603)}
      pcbX={4.1}
      pcbY={-3.403}
      pcbRotation={90}
      schSectionName="charger"
      schX={-15}
      schY={6}
      schRotation={-90}
      connections={{ anode: "net.VBUS", cathode: "net.CHG_LED_K" }}
    />
    <WirePads
      name="J4"
      displayName="J4 - Battery"
      schSectionName="charger"
      schX={-7}
      schY={6}
      // Switch wires on their own pads; SW+ next to B+ keeps the VBAT link short
      pads={[
        { label: "SW_N", silk: "SW-" },
        { label: "SW_P", silk: "SW+" },
        { label: "BAT_P", silk: "B+" },
        { label: "BAT_N", silk: "B-" },
      ]}
      silkOffsetX={-1.6}
      pcbX={7.0}
      pcbY={-11.1}
      connections={{
        SW_N: "net.SW_BATT",
        SW_P: "net.VBAT",
        BAT_P: "net.VBAT",
        BAT_N: "net.GND",
      }}
    />

    {/* ---------------- Power path ---------------- */}
    <B5819WS
      name="D2"
      displayName="D2 - B5819WS"
      layer="bottom"
      pcbX={1.6}
      pcbY={-3.678}
      schSectionName="pwrpath"
      schX={1}
      schY={11}
      schRotation={90}
      connections={{ anode: "net.VBUS", cathode: "net.VSYS" }}
    />
    {/* Battery -> VSYS switch, turned off while VBUS is present */}
    <DMG3415U_7
      name="Q2"
      displayName="Q2 - DMG3415U"
      layer="bottom"
      pcbX={5.9}
      pcbY={-5.406}
      // Reference designator above the part, clear of the J4 labels below it
      pcbSx={{ "& silkscreentext": { pcbY: 1.7 } }}
      schSectionName="pwrpath"
      schX={5}
      schY={9}
      connections={{ G: "net.VBUS", S: "net.VSYS", D: "net.SW_BATT" }}
    />
    <resistor
      name="R9"
      resistance="100k"
      footprint="0402"
      {...part(PARTS.R100k)}
      layer="bottom"
      pcbX={3.5}
      pcbY={-6.337}
      pcbRotation={90}
      schSectionName="pwrpath"
      schX={1}
      schY={7.5}
      schRotation={-90}
      connections={{ pin1: "net.VBUS", pin2: "net.GND" }}
    />
    <capacitor
      name="C15"
      capacitance="10uF"
      maxVoltageRating="25V"
      footprint="0805"
      {...part(PARTS.C10u_0805)}
      layer="bottom"
      pcbX={3.0}
      pcbY={4.55}
      schSectionName="pwrpath"
      schX={9}
      schY={9}
      schRotation={-90}
      connections={{ pin1: "net.VSYS", pin2: "net.GND" }}
    />

    {/* ---------------- 3V3 buck ---------------- */}
    <SY8088IAAC
      name="U6"
      displayName="U6 - SY8088"
      schHeight={0.6}
      layer="bottom"
      pcbX={3.0}
      pcbY={7.65}
      pcbRotation={180}
      schSectionName="buck"
      schX={18}
      schY={10}
      connections={{
        IN: "net.VSYS",
        EN: "net.BUCK_EN",
        GND: "net.GND",
        LX: "net.BUCK_LX",
        FB: "net.BUCK_FB",
      }}
    />
    <resistor
      name="R14"
      resistance="10k"
      footprint="0402"
      {...part(PARTS.R10k)}
      layer="bottom"
      pcbX={0.35}
      pcbY={8.75}
      pcbRotation={270}
      schSectionName="buck"
      schX={14.5}
      schY={11.5}
      schRotation={-90}
      connections={{ pin1: "net.VSYS", pin2: "net.BUCK_EN" }}
    />
    <FTC252012S2R2MBCA
      name="L1"
      layer="bottom"
      pcbX={6.5}
      pcbY={8.2}
      pcbRotation={90}
      schSectionName="buck"
      schX={22}
      schY={10.8}
      schRotation={0}
      connections={{ pin1: "net.BUCK_LX", pin2: "net.V3_3" }}
    />
    {/* VOUT = 0.6 V * (1 + 100k / 22.1k) = 3.31 V */}
    <resistor
      name="R15"
      resistance="100k"
      footprint="0402"
      {...part(PARTS.R100k)}
      layer="bottom"
      pcbX={0.3}
      pcbY={6.75}
      pcbRotation={90}
      schSectionName="buck"
      schX={25}
      schY={9}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.BUCK_FB" }}
    />
    <capacitor
      name="C16"
      capacitance="22pF"
      footprint="0402"
      {...part(PARTS.C22p)}
      layer="bottom"
      pcbX={-0.8}
      pcbY={6.75}
      pcbRotation={90}
      schSectionName="buck"
      schX={26.5}
      schY={9}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.BUCK_FB" }}
    />
    <resistor
      name="R16"
      resistance="22.1k"
      footprint="0402"
      {...part(PARTS.R22k1)}
      layer="bottom"
      pcbX={-0.8}
      pcbY={8.75}
      pcbRotation={90}
      schSectionName="buck"
      schX={25}
      schY={6.5}
      schRotation={-90}
      connections={{ pin1: "net.BUCK_FB", pin2: "net.GND" }}
    />
    <capacitor
      name="C17"
      capacitance="10uF"
      maxVoltageRating="25V"
      footprint="0805"
      {...part(PARTS.C10u_0805)}
      layer="bottom"
      pcbX={6.5}
      pcbY={4.85}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-15.0}
      schY={-17.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />

    {/* ---------------- ESP32-C3 ---------------- */}
    <ESP32_C3_MINI_1_N4
      name="U1"
      displayName="U1 - ESP32-C3-MINI-1"
      schHeight={6.2}
      pcbX={0}
      pcbY={U1_Y}
      schSectionName="mcu"
      schX={-23}
      schY={-10}
      connections={{
        "3V3": "net.V3_3",
        EN: "net.CHIP_PU",
        IO0: "net.ADC_DRDY",
        IO1: "net.ADC_DOUT",
        IO2: "net.LED_DATA",
        IO3: "net.ADC_CS",
        IO4: "net.ADC_DIN",
        IO5: "net.ADC_SCLK",
        IO6: "net.I2C_SDA",
        IO7: "net.I2C_SCL",
        IO10: "net.FG_ALRT",
        IO18: "net.USB_DM",
        IO19: "net.USB_DP",
        ...Object.fromEntries(esp32GndPins.map((pin) => [pin, "net.GND"])),
      }}
    />
    <capacitor
      name="C9"
      capacitance="10uF"
      footprint="0603"
      {...part(PARTS.C10u_0603)}
      layer="bottom"
      pcbX={-7.4}
      pcbY={8.0}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-13.75}
      schY={-17.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C1"
      capacitance="1uF"
      footprint="0402"
      {...part(PARTS.C1u)}
      layer="bottom"
      pcbX={-6.0}
      pcbY={8.15}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-12.5}
      schY={-17.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C2"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      layer="bottom"
      pcbX={-4.9}
      pcbY={8.15}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-11.25}
      schY={-17.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C4"
      capacitance="10nF"
      footprint="0402"
      {...part(PARTS.C10n)}
      layer="bottom"
      pcbX={-3.8}
      pcbY={8.15}
      pcbRotation={90}
      schSectionName="decoupling"
      schX={-15.0}
      schY={-19.1}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <LESD8D3_3CAT5G
      name="D3"
      displayName="D3 - LESD8D3.3"
      layer="bottom"
      pcbX={-2.7}
      pcbY={8.35}
      pcbRotation={90}
      schSectionName="mcu"
      schX={-30}
      schY={-13.5}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <resistor
      name="R1"
      resistance="10k"
      footprint="0402"
      {...part(PARTS.R10k)}
      layer="bottom"
      pcbX={-7.4}
      pcbY={5.0}
      pcbRotation={90}
      schSectionName="mcu"
      schX={-30}
      schY={-6.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.CHIP_PU" }}
    />
    <capacitor
      name="C3"
      capacitance="1uF"
      footprint="0402"
      {...part(PARTS.C1u)}
      layer="bottom"
      pcbX={-7.4}
      pcbY={3.0}
      pcbRotation={90}
      schSectionName="mcu"
      schX={-30}
      schY={-10}
      schRotation={-90}
      connections={{ pin1: "net.CHIP_PU", pin2: "net.GND" }}
    />

    {/* ---------------- Indicators ---------------- */}
    <resistor
      name="R13"
      resistance="0"
      footprint="0402"
      {...part(PARTS.R0)}
      layer="bottom"
      pcbX={-4.3}
      pcbY={-6.869}
      schSectionName="led"
      schX={-11}
      schY={-6}
      schRotation={0}
      connections={{ pin1: "net.LED_DATA", pin2: "net.LED_DIN" }}
    />
    <XL_2121RGBC_2812B
      name="D4"
      displayName="D4 - RGB LED"
      pcbX={-6.4}
      pcbY={-3.279}
      schSectionName="led"
      schX={-7.5}
      schY={-6}
      connections={{ DIN: "net.LED_DIN", VDD: "net.V3_3_LED", GND: "net.GND" }}
    />
    {/* LED supply link: its 3V3 pad is nearer C13 than U3, so the router joins
        it there and the LED PWM current stays off the U3 AVDD trace */}
    <resistor
      name="R24"
      resistance="0"
      footprint="0402"
      {...part(PARTS.R0)}
      pcbX={0.5}
      pcbY={-2.2}
      pcbRotation={180}
      schSectionName="led"
      schX={-9}
      schY={-3.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.V3_3_LED" }}
    />
    <capacitor
      name="C19"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      pcbX={-6.3}
      pcbY={-5.256}
      pcbRotation={180}
      schSectionName="led"
      schX={-6}
      schY={-3.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3_LED", pin2: "net.GND" }}
    />

    {/* ---------------- Fuel gauge ---------------- */}
    <MAX17048G_T10
      name="U5"
      displayName="U5 - MAX17048"
      schHeight={1}
      layer="bottom"
      pcbX={6.3}
      pcbY={0.75}
      schSectionName="fuel"
      schX={4}
      schY={-8}
      connections={{
        CTG: "net.GND",
        CELL: "net.VBAT",
        VDD: "net.VBAT",
        GND: "net.GND",
        EP: "net.GND",
        QSTRT: "net.GND",
        N_ALRT: "net.FG_ALRT",
        SCL: "net.I2C_SCL",
        SDA: "net.I2C_SDA",
      }}
    />
    <capacitor
      name="C18"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      layer="bottom"
      pcbX={6.3}
      pcbY={-1.15}
      pcbRotation={180}
      schSectionName="fuel"
      schX={1.2}
      schY={-8.5}
      schRotation={-90}
      connections={{ pin1: "net.VBAT", pin2: "net.GND" }}
    />
    <resistor
      name="R20"
      resistance="4.7k"
      footprint="0402"
      {...part(PARTS.R4k7)}
      layer="bottom"
      pcbX={3.4}
      pcbY={1.8}
      pcbRotation={90}
      schSectionName="fuel"
      schX={8.5}
      schY={-5.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.I2C_SDA" }}
    />
    <resistor
      name="R21"
      resistance="4.7k"
      footprint="0402"
      {...part(PARTS.R4k7)}
      layer="bottom"
      pcbX={2.3}
      pcbY={1.85}
      pcbRotation={90}
      schSectionName="fuel"
      schX={10}
      schY={-5.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.I2C_SCL" }}
    />

    {/* ---------------- ADS1220 load cell ADC ---------------- */}
    <ADS1220IRVAR
      name="U3"
      displayName="U3 - ADS1220"
      schHeight={1.8}
      layer="bottom"
      pcbX={-3.2}
      pcbY={-2.88}
      schSectionName="adc"
      schX={24.5}
      schY={-8}
      connections={{
        CLK: "net.GND",
        DGND: "net.GND",
        AVSS: "net.GND",
        EP: "net.GND",
        // Bridge low side on the internal low-side switch (PSW); REFN0 senses
        // it above the switch so the reference stays ratiometric
        AIN3: "net.LC_EN",
        REFN0: "net.LC_EN",
        REFP0: "net.LC_EP",
        AVDD: "net.V3_3",
        DVDD: "net.V3_3",
        AIN0: "net.ADC_AIN0",
        AIN1: "net.ADC_AIN1",
        SCLK: "net.ADC_SCLK",
        DIN: "net.ADC_DIN",
        DOUT: "net.ADC_DOUT",
        N_DRDY: "net.ADC_DRDY",
        N_CS: "net.ADC_CS",
      }}
    />
    <capacitor
      name="C11"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      layer="bottom"
      pcbX={-2.9}
      pcbY={0.45}
      pcbRotation={180}
      schSectionName="decoupling"
      schX={-12.5}
      schY={-19.1}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C13"
      capacitance="100nF"
      footprint="0402"
      {...part(PARTS.C100n)}
      layer="bottom"
      pcbX={-1.0}
      pcbY={0.45}
      schSectionName="decoupling"
      schX={-11.25}
      schY={-19.1}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    <capacitor
      name="C10"
      capacitance="10uF"
      footprint="0603"
      {...part(PARTS.C10u_0603)}
      layer="bottom"
      pcbX={-0.85}
      pcbY={1.7}
      schSectionName="decoupling"
      schX={-13.75}
      schY={-20.7}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.GND" }}
    />
    {/* Bridge excitation and REFP0 share one node, RC-filtered from 3V3 */}
    <resistor
      name="R22"
      resistance="10"
      footprint="0402"
      {...part(PARTS.R10)}
      layer="bottom"
      pcbX={-7.32}
      pcbY={-2.88}
      pcbRotation={270}
      schSectionName="adc"
      schX={18}
      schY={-11.5}
      schRotation={-90}
      connections={{ pin1: "net.V3_3", pin2: "net.LC_EP" }}
    />
    <capacitor
      name="C14"
      capacitance="1uF"
      footprint="0402"
      {...part(PARTS.C1u)}
      layer="bottom"
      pcbX={-6.32}
      pcbY={-2.88}
      pcbRotation={90}
      schSectionName="adc"
      schX={20}
      schY={-12.5}
      schRotation={-90}
      connections={{ pin1: "net.LC_EP", pin2: "net.GND" }}
    />
    {/* Keeps the ADC deselected while the ESP32-C3 boots or sleeps */}
    <resistor
      name="R23"
      resistance="100k"
      footprint="0402"
      {...part(PARTS.R100k)}
      layer="bottom"
      pcbX={-1.9}
      pcbY={-5.85}
      schSectionName="adc"
      schX={29}
      schY={-5.5}
      schRotation={-90}
      connections={{ pin1: "net.ADC_CS", pin2: "net.V3_3" }}
    />
    {/* Input RC filter: 1k + 1k + 10nF C0G differential (~8 kHz); C0G because
        X7R is piezoelectric and TI asks for C0G here */}
    <resistor
      name="R7"
      resistance="1k"
      footprint="0402"
      {...part(PARTS.R1k)}
      layer="bottom"
      pcbX={-4.95}
      pcbY={1.1}
      schSectionName="adc"
      schX={18}
      schY={-7}
      schRotation={0}
      connections={{ pin1: "net.ADC_AIN0", pin2: "net.LC_SP" }}
    />
    <resistor
      name="R8"
      resistance="1k"
      footprint="0402"
      {...part(PARTS.R1k)}
      layer="bottom"
      pcbX={-7.0}
      pcbY={0.1}
      schSectionName="adc"
      schX={18}
      schY={-9}
      schRotation={180}
      connections={{ pin1: "net.ADC_AIN1", pin2: "net.LC_SN" }}
    />
    <capacitor
      name="C12"
      capacitance="10nF"
      footprint="0402"
      {...part(PARTS.C10n_C0G)}
      layer="bottom"
      pcbX={-5.0}
      pcbY={0.1}
      schSectionName="adc"
      schX={20}
      schY={-8}
      schRotation={90}
      connections={{ pin1: "net.ADC_AIN0", pin2: "net.ADC_AIN1" }}
    />
    <WirePads
      name="J3"
      displayName="J3 - Load cell"
      schSectionName="adc"
      schX={14}
      schY={-8}
      pads={[
        { label: "E_P", silk: "E+" },
        { label: "S_P", silk: "S+" },
        { label: "S_N", silk: "S-" },
        { label: "E_N", silk: "E-" },
      ]}
      silkOffsetX={1.6}
      pcbX={-7.0}
      pcbY={-10.55}
      connections={{
        E_P: "net.LC_EP",
        S_P: "net.LC_SP",
        S_N: "net.LC_SN",
        E_N: "net.LC_EN",
      }}
    />

    {/* ---------------- Layout constraints ---------------- */}
    {/* No copper under the ESP32-C3-MINI-1 PCB antenna on any layer */}
    <keepout
      shape="rect"
      pcbX={0.0}
      pcbY={(ANTENNA_Y + TOP) / 2}
      width={W}
      height={TOP - ANTENNA_Y}
      layers={["top", "inner1", "inner2", "bottom"]}
      excludeRefs={[".U1"]}
    />
    {/* Keep routed copper off the board edges (router under-applies edge clearance) */}
    <keepout
      shape="rect"
      pcbX={-W / 2 + EDGE_BAND / 2}
      pcbY={0}
      width={EDGE_BAND}
      height={L}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowPlacements
    />
    <keepout
      shape="rect"
      pcbX={W / 2 - EDGE_BAND / 2}
      pcbY={0}
      width={EDGE_BAND}
      height={L}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowPlacements
    />
    <keepout
      shape="rect"
      pcbX={0}
      pcbY={BOTTOM + EDGE_BAND / 2}
      width={W}
      height={EDGE_BAND}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowPlacements
    />
    {/* No vias from other nets onto the ADS1220 thermal pad from the top side */}
    <keepout
      shape="rect"
      pcbX={-3.2}
      pcbY={-2.88}
      width={2.6}
      height={2.6}
      layers={["top", "inner1", "inner2"]}
    />
    {/* Keep the GND pour clear of the E+ and E- wire pads */}
    <keepout
      shape="circle"
      radius={1.0}
      pcbX={-7.0}
      pcbY={-7.25}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowTraces
      allowPlacements
    />
    <keepout
      shape="circle"
      radius={1.0}
      pcbX={-7.0}
      pcbY={-13.85}
      layers={["top", "inner1", "inner2", "bottom"]}
      allowTraces
      allowPlacements
    />
    {pours && (
      <>
        <copperpour connectsTo="net.GND" layer="inner1" clearance="0.2mm" boardEdgeMargin="0.35mm" />
        <copperpour connectsTo="net.GND" layer="inner2" clearance="0.2mm" boardEdgeMargin="0.35mm" />
        <copperpour connectsTo="net.GND" layer="top" clearance="0.2mm" boardEdgeMargin="0.35mm" />
        <copperpour connectsTo="net.GND" layer="bottom" clearance="0.2mm" boardEdgeMargin="0.35mm" />
      </>
    )}
  </board>
)
