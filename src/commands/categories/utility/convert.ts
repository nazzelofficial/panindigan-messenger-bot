import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

type UnitCategory = "length" | "mass" | "temperature" | "data" | "time";

const TABLES: Readonly<
  Record<Exclude<UnitCategory, "temperature">, Readonly<Record<string, number>>>
> = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  mass: { mg: 0.000001, g: 0.001, kg: 1, oz: 0.028349523125, lb: 0.45359237 },
  data: {
    b: 1,
    kb: 1000,
    mb: 1000000,
    gb: 1000000000,
    tb: 1000000000000,
    bit: 0.125,
    kbit: 125,
    mbit: 125000,
    gbit: 125000000,
    tbit: 125000000000,
  },
  time: { ms: 0.001, s: 1, sec: 1, min: 60, h: 3600, hr: 3600, d: 86400, w: 604800 },
};

const TEMPERATURE_UNITS = new Set(["c", "f", "k"]);

function categoryOf(unit: string): UnitCategory | undefined {
  if (TEMPERATURE_UNITS.has(unit)) return "temperature";
  for (const category of ["length", "mass", "data", "time"] as const) {
    if (TABLES[category][unit] !== undefined) return category;
  }
  return undefined;
}

function convertTemperature(value: number, from: string, to: string): number {
  const celsius = from === "c" ? value : from === "f" ? ((value - 32) * 5) / 9 : value - 273.15;
  if (celsius < -273.15) throw new Error("Temperature is below absolute zero.");
  return to === "c" ? celsius : to === "f" ? (celsius * 9) / 5 + 32 : celsius + 273.15;
}

export default createCommand(
  {
    name: "convert",
    description: "Convert between real units of length, mass, temperature, data and time.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const valueText = context.args.positional[0];
      const fromText = context.args.positional[1];
      const toText = context.args.positional[2];
      if (!valueText || !fromText || !toText) {
        return {
          text: "Usage: !convert VALUE FROM TO — e.g. !convert 10 km mi, !convert 100 c f, !convert 5 mb bit",
        };
      }
      const value = Number(valueText);
      if (!Number.isFinite(value)) return { text: `"${valueText}" is not a finite number.` };
      const from = fromText.toLowerCase();
      const to = toText.toLowerCase();
      const fromCategory = categoryOf(from);
      const toCategory = categoryOf(to);
      if (!fromCategory || !toCategory || fromCategory !== toCategory) {
        return {
          text: "Units must belong to the same category. Supported: length (mm,cm,m,km,in,ft,yd,mi), mass (mg,g,kg,oz,lb), temperature (c,f,k), data (b,kb,mb,gb,tb,bit,kbit,mbit,gbit,tbit), time (ms,s,min,h,d,w).",
        };
      }
      try {
        let result: number;
        if (fromCategory === "temperature") {
          result = convertTemperature(value, from, to);
        } else {
          const table = TABLES[fromCategory];
          const fromFactor = table[from];
          const toFactor = table[to];
          if (fromFactor === undefined || toFactor === undefined || fromFactor === 0) {
            return { text: "One of those units is not supported." };
          }
          result = (value * fromFactor) / toFactor;
        }
        if (!Number.isFinite(result))
          return { text: "The conversion produced a non-finite result." };
        return { text: `${value} ${from} = ${Number(result.toPrecision(12))} ${to}` };
      } catch (error) {
        return {
          text: `Conversion failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!convert VALUE FROM TO"],
    examples: ["!convert 10 km mi", "!convert 100 c f", "!convert 5 mb bit", "!convert 90 min h"],
    permission: "public",
    cooldownMs: 500,
  },
);
