import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TramDirection = "eastbound" | "westbound";
export type TramStop = {
  code: string;
  name: string;
  nameEn: string;
  alias?: string;
  direction: TramDirection;
  lat: number;
  lng: number;
};

export type TramEta = {
  dest: string;
  arrivingIn: number | "ARRIVED";
  etaType: "ACTUAL" | "SCHEDULED" | string;
  tramNo?: string;
  arrivalTime?: string;
};

const stops: Array<[string, string, string, string, number, number]> = [
  ["KTT", "堅尼地城總站", "Kennedy Town Terminus", "堅尼地城", 22.2812, 114.1284],
  ["01E", "北街", "North Street", "北街", 22.2848, 114.1298],
  ["WST", "西港城", "Western Market", "上環", 22.2862, 114.1502],
  ["CEN", "中環", "Central", "中環", 22.2835, 114.1581],
  ["WCH", "灣仔", "Wan Chai", "灣仔", 22.2784, 114.1748],
  ["CBY", "銅鑼灣", "Causeway Bay", "跑馬地／筲箕灣", 22.2791, 114.1848],
  ["VIC", "維多利亞公園", "Victoria Park", "筲箕灣", 22.2814, 114.1912],
  ["NPT", "北角", "North Point", "筲箕灣", 22.291, 114.201],
  ["02E", "太古城", "Taikoo Shing", "筲箕灣", 22.2865, 114.218],
  ["SKT", "筲箕灣總站", "Shau Kei Wan Terminus", "筲箕灣", 22.2814, 114.2263],
];
export const TRAM_STOPS: TramStop[] = [
  ...stops.map(([code, name, nameEn, alias, lat, lng]) => ({ code, name, nameEn, alias, direction: "eastbound" as const, lat, lng })),
  ...stops.slice().reverse().map(([code, name, nameEn, alias, lat, lng]) => ({ code: `${code}W`, name, nameEn, alias, direction: "westbound" as const, lat, lng })),
];

export const getTramEta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ stationCode: z.string().regex(/^[A-Z0-9]+W?$/), direction: z.enum(["eastbound", "westbound"]) }).parse(d))
  .handler(async ({ data }): Promise<TramEta[]> => {
    const stationCode = data.stationCode.replace(/W$/, "");
    const response = await fetch(`https://api.hktramways.com/api/v1/tram-eta/${encodeURIComponent(stationCode)}/${data.direction}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`電車到站資料請求失敗 (${response.status})`);
    const payload = await response.json() as { data?: { etas?: Array<Record<string, unknown>> } };
    return (payload.data?.etas ?? []).slice(0, 3).map((eta) => {
      const result: TramEta = {
        dest: String(eta["dest"] ?? "目的地未提供"),
        arrivingIn: eta["arrivingIn"] === "ARRIVED" ? "ARRIVED" : Number(eta["arrivingIn"] ?? 0),
        etaType: String(eta["etaType"] ?? "SCHEDULED"),
      };
      if (eta["tramNo"]) result.tramNo = String(eta["tramNo"]);
      if (eta["arrivalTime"]) result.arrivalTime = String(eta["arrivalTime"]);
      return result;
    });
  });
