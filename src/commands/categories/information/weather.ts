import { fetchJson } from "../../../utils/http.js";
import { DEFAULT_TIMEZONE } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface WeatherPayload {
  readonly current?: {
    readonly time?: string;
    readonly temperature_2m?: number;
    readonly relative_humidity_2m?: number;
    readonly weather_code?: number;
    readonly wind_speed_10m?: number;
  };
  readonly current_units?: {
    readonly temperature_2m?: string;
    readonly relative_humidity_2m?: string;
    readonly wind_speed_10m?: string;
  };
}

const CONDITIONS: Readonly<Record<number, string>> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export default createCommand(
  {
    name: "weather",
    description:
      "Fetch current weather for Manila or a supplied latitude,longitude using Open-Meteo.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      let latitude = 14.5995;
      let longitude = 120.9842;
      let locationLabel = "Manila, Philippines";
      const target = context.args.positional[0];
      if (target) {
        const parts = target.split(",");
        if (parts.length !== 2)
          return {
            text: "Provide coordinates as latitude,longitude (for example 14.5995,120.9842).",
          };
        const parsedLat = Number(parts[0]);
        const parsedLon = Number(parts[1]);
        if (
          !Number.isFinite(parsedLat) ||
          !Number.isFinite(parsedLon) ||
          Math.abs(parsedLat) > 90 ||
          Math.abs(parsedLon) > 180
        ) {
          return { text: "Those coordinates are outside the valid latitude/longitude range." };
        }
        latitude = parsedLat;
        longitude = parsedLon;
        locationLabel = `${latitude}, ${longitude}`;
      }
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(latitude));
        url.searchParams.set("longitude", String(longitude));
        url.searchParams.set(
          "current",
          "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        );
        url.searchParams.set("timezone", DEFAULT_TIMEZONE);
        const data = await fetchJson<WeatherPayload>(url.toString());
        const current = data.current;
        if (
          !current ||
          typeof current.temperature_2m !== "number" ||
          typeof current.weather_code !== "number"
        ) {
          return { text: "The weather service returned an incomplete reading. Please try again." };
        }
        const condition = CONDITIONS[current.weather_code] ?? `WMO code ${current.weather_code}`;
        const tempUnit = data.current_units?.temperature_2m ?? "°C";
        const humidityUnit = data.current_units?.relative_humidity_2m ?? "%";
        const windUnit = data.current_units?.wind_speed_10m ?? "km/h";
        const lines = [
          `Weather for ${locationLabel}`,
          `Condition: ${condition}`,
          `Temperature: ${current.temperature_2m}${tempUnit}`,
          typeof current.relative_humidity_2m === "number"
            ? `Humidity: ${current.relative_humidity_2m}${humidityUnit}`
            : undefined,
          typeof current.wind_speed_10m === "number"
            ? `Wind: ${current.wind_speed_10m} ${windUnit}`
            : undefined,
          current.time ? `Observed: ${current.time} (${DEFAULT_TIMEZONE})` : undefined,
        ].filter((line): line is string => line !== undefined);
        return { text: lines.join("\n") };
      } catch (error) {
        return {
          text: `Weather request failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!weather", "!weather LAT,LON"],
    examples: ["!weather", "!weather 14.5995,120.9842"],
    permission: "public",
    cooldownMs: 2000,
  },
);
