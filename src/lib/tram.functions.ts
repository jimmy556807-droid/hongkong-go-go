import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TramStop = { code: string; name: string; nameEn: string; direction: "east" | "west"; lat: number; lng: number };

const east: Array<[string, string, string, number, number]> = [
  ["SKT", "筲箕灣", "Shau Kei Wan", 22.2814, 114.2263], ["02E", "太古城", "Taikoo Shing", 22.2865, 114.218],
  ["NPT", "北角", "North Point", 22.291, 114.201], ["KKT", "炮台山", "Fortress Hill", 22.288, 114.193],
  ["VIC", "維多利亞公園", "Victoria Park", 22.281, 114.191], ["CBY", "銅鑼灣", "Causeway Bay", 22.279, 114.185],
  ["WCH", "灣仔", "Wan Chai", 22.278, 114.175], ["CEN", "中環", "Central", 22.283, 114.158],
  ["WST", "西港城", "Western Market", 22.286, 114.15], ["KKTW", "堅尼地城", "Kennedy Town", 22.281, 114.128],
];
const west = east.slice().reverse();
export const TRAM_STOPS: TramStop[] = [...east.map(([code, name, nameEn, lat, lng]) => ({ code, name, nameEn, direction: "east" as const, lat, lng })), ...west.map(([code, name, nameEn, lat, lng]) => ({ code: `${code}W`, name, nameEn, direction: "west" as const, lat, lng }))];

const attr = (xml: string, key: string) => xml.match(new RegExp(`${key}="([^"]*)"`, "i"))?.[1] ?? "";
const destinationNames: Record<string, string> = { SKT: "筲箕灣", HVY: "跑馬地", KEN: "堅尼地城", WST: "石塘咀", NPT: "北角" };

export const getTramEta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ stopCode: z.string().regex(/^[A-Z0-9]+$/) }).parse(d))
  .handler(async ({ data }) => {
    const response = await fetch(`https://www.hktramways.com/nextTram/geteat.php?stop_code=${encodeURIComponent(data.stopCode)}`);
    if (!response.ok) throw new Error(`電車到站資料請求失敗 (${response.status})`);
    const xml = await response.text();
    const rows = [...xml.matchAll(/<metadata\b[^>]*\/?>(?:<\/metadata>)?/gi)].slice(0, 3).map((match) => {
      const source = match[0];
      const minutes = Number(attr(source, "arrive_in_minute"));
      const arrived = attr(source, "is_arrived") === "1";
      const code = attr(source, "dest_stop_code");
      return { dest: destinationNames[code] ?? attr(source, "tram_dest_tc") ?? "目的地未提供", arriveInMin: Number.isFinite(minutes) ? minutes : 0, isArrived: arrived, statusText: arrived ? "已到站" : `約 ${Math.max(0, minutes)} 分鐘` };
    });
    return rows;
  });
