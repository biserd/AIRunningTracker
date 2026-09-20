import type { State } from "../shared/coach";
import { backend } from "./account";

export const coachKnowledgeTools = [
  {
    type: "function",
    name: "get_running_weather",
    description:
      "Get the runner's opted-in local daily weather forecast for a date in the next seven days. Use before giving weather-specific advice; never guess current conditions.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Calendar date YYYY-MM-DD in the runner timezone.",
        },
      },
      required: ["date"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_running_shoes",
    description:
      "Search AITracker's running-shoe catalog. Use for current shoe requests instead of inventing models, prices, ratings or specifications.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        category: { type: ["string", "null"] },
        stability: { type: ["string", "null"] },
        maxPrice: { type: ["number", "null"] },
        carbonPlate: { type: ["boolean", "null"] },
      },
      required: ["category", "stability", "maxPrice", "carbonPlate"],
      additionalProperties: false,
    },
  },
] as const;

type Facts = Record<string, unknown>;
const object = (value: unknown): Facts =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Facts)
    : {};

function dateOnly(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function weatherCode(code: unknown) {
  const value = Number(code);
  if (value === 0) return "clear";
  if ([1, 2, 3].includes(value)) return "partly cloudy";
  if ([45, 48].includes(value)) return "fog";
  if ([51, 53, 55, 56, 57].includes(value)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(value)) return "snow";
  if ([95, 96, 99].includes(value)) return "thunderstorms";
  return "mixed conditions";
}

async function runningWeather(env: Env, token: string, args: Facts, state: State) {
  const date = dateOnly(args.date);
  if (!date) throw new Error("Choose a forecast date in YYYY-MM-DD format.");
  const today = dateOnly(state.today) || new Date().toISOString().slice(0, 10);
  const last = new Date(today + "T12:00:00Z");
  last.setUTCDate(last.getUTCDate() + 7);
  if (date < today || date > last.toISOString().slice(0, 10))
    throw new Error("Weather is available for the next seven days.");
  const user = object(await backend(env, "/api/user", undefined, token));
  if (user.coachWeatherEnabled !== true)
    return { available: false, reason: "The runner has not enabled local weather." };
  const location = object(user.coachWeatherLocation);
  const latitude = Number(location.latitude ?? location.lat);
  const longitude = Number(location.longitude ?? location.lng ?? location.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
    return { available: false, reason: "No weather location is configured." };
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: typeof state.timezone === "string" ? state.timezone : "auto",
    start_date: date,
    end_date: date,
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
  });
  const response = await fetch("https://api.open-meteo.com/v1/forecast?" + query, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("The weather forecast is temporarily unavailable.");
  }
  const text = await response.text();
  if (text.length > 40_000) throw new Error("The weather response was too large.");
  const forecast = object(JSON.parse(text));
  const daily = object(forecast.daily);
  const first = (key: string) =>
    Array.isArray(daily[key]) ? (daily[key] as unknown[])[0] : null;
  return {
    available: true,
    date,
    location:
      typeof location.label === "string"
        ? location.label.slice(0, 100)
        : typeof location.name === "string"
          ? location.name.slice(0, 100)
          : "saved location",
    conditions: weatherCode(first("weather_code")),
    temperatureC: {
      low: first("temperature_2m_min"),
      high: first("temperature_2m_max"),
    },
    precipitationChancePercent: first("precipitation_probability_max"),
    maxWindKph: first("wind_speed_10m_max"),
    source: "Open-Meteo forecast",
  };
}

async function runningShoes(env: Env, token: string, args: Facts) {
  const query = new URLSearchParams();
  if (typeof args.category === "string" && args.category.trim())
    query.set("category", args.category.trim().slice(0, 80));
  if (typeof args.stability === "string" && args.stability.trim())
    query.set("stability", args.stability.trim().slice(0, 80));
  if (typeof args.maxPrice === "number" && Number.isFinite(args.maxPrice))
    query.set("maxPrice", String(Math.max(1, Math.min(args.maxPrice, 1000))));
  if (typeof args.carbonPlate === "boolean")
    query.set("hasCarbonPlate", String(args.carbonPlate));
  const raw = await backend(env, "/api/shoes?" + query, undefined, token);
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(object(raw).shoes)
      ? (object(raw).shoes as unknown[])
      : [];
  const shoes = rows.slice(0, 8).map((item) => {
    const shoe = object(item);
    return Object.fromEntries(
      [
        "id",
        "brand",
        "model",
        "name",
        "category",
        "stability",
        "price",
        "currency",
        "weight",
        "drop",
        "hasCarbonPlate",
        "rating",
      ]
        .filter((key) => ["string", "number", "boolean"].includes(typeof shoe[key]))
        .map((key) => [key, shoe[key]]),
    );
  });
  return { count: shoes.length, shoes, source: "AITracker shoe catalog" };
}

export async function runCoachKnowledgeTool(
  env: Env,
  token: string,
  name: string,
  args: unknown,
  state: State,
) {
  const input = object(args);
  if (name === "get_running_weather")
    return runningWeather(env, token, input, state);
  if (name === "search_running_shoes") return runningShoes(env, token, input);
  throw new Error("That coach tool is not available.");
}
