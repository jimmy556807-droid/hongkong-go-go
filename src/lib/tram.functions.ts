import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TramStop = { code: string; name: string; nameEn: string; direction: "east" | "west"; coordinates: [number, number] };
export type TramEta = { dest: string; arriveInMin: number; isArrived: boolean; statusText: string };

const eastStops = [
  ["KKT", "堅尼地城", "Kennedy Town", 22.2818, 114.1266], ["WST", "西港城", "Western Market", 22.2867, 114.1495], ["JST", "莊士敦道", "Johnston Road", 22.2774, 114.1719], ["WAC", "灣仔道", "Wanchai Road", 22.2748, 114.1788], ["NPT", "北角", "North Point", 22.2911, 114.2005], ["02W", "柴灣道", "Chai Wan Road", 22.2798, 114.2392], ["SKT", "筲箕灣", "Shau Kei Wan", 22.2787, 114.2238],
] as const;
const westStops = [...eastStops].reverse();
export const TRAM_STOPS: TramStop[] = [...eastStops.map(([code, name, nameEn, lat, lng]) => ({ code, name, nameEn, direction: "east" as const, coordinates: [lat, lng] as [number, number] })), ...westStops.map(([code, name, nameEn, lat, lng]) => ({ code, name, nameEn, direction: "west" as const, coordinates: [lat, lng] as [number, number] }))];

export const getTramEta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ stopCode: z.string().regex(/^[A-Z0-9]+$/) }).parse(d))
  .handler(async ({ data }) => {
    const response = await fetch(`https://www.hktramways.com/nextTram/geteat.php?stop_code=${encodeURIComponent(data.stopCode)}`, { headers: { Accept: "application/xml, text/xml" } });
    if (!response.ok) throw new Error("無法取得電車實時班次");
    const xml = await response.text();
    const results: TramEta[] = [];
    for (const match of xml.matchAll(/<metadata\s+([^>]+?)\s*\/?\s*>/gi)) {
      const attrs = Object.fromEntries([...match[1].matchAll(/([\w]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
      const minutes = Number(attrs.arrive_in_minute ?? 0);
      const arrived = attrs.is_arrived === "1";
      const dest = attrs.tram_dest_tc || "未有目的地資料";
      results.push({ dest, arriveInMin: minutes, isArrived: arrived, statusText: arrived ? "已到站" : `約 ${minutes} 分鐘` });
    }
    return results.slice(0, 3);
  });

export const getTramStops = createServerFn({ method: "GET" }).handler(() => TRAM_STOPS);

export const TRAM_DESTINATIONS = ["筲箕灣", "跑馬地", "堅尼地城", "石塘咀", "北角", "上環"];

export function getTramDirectionLabel(direction: "east" | "west") {
  return direction === "east" ? "東行" : "西行";
}

export function getTramDestinationHint(direction: "east" | "west") {
  return direction === "east" ? "往跑馬地／筲箕灣" : "往上環／堅尼地城";
}

export function sortTramStopsByDistance(stops: TramStop[], position?: { lat: number; lng: number }) {
  if (!position) return stops;
  return [...stops].sort((a, b) => ((a.coordinates[0] - position.lat) ** 2 + (a.coordinates[1] - position.lng) ** 2) - ((b.coordinates[0] - position.lat) ** 2 + (b.coordinates[1] - position.lng) ** 2));
}
