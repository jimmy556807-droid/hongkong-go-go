import { createServerFn } from "@tanstack/react-start";

export type FerryStop = { seq: number; name: string; lat: number; lng: number };
export type FerryRoute = {
  key: string;
  routeId: number;
  routeSeq: number;
  district: "INNER" | "OUTLYING" | "KAITO" | string;
  name: string;
  from: string;
  to: string;
  journeyTime: number;
  fare: number;
  link: string;
  updated: string;
  stops: FerryStop[];
};

let cache: { at: number; data: FerryRoute[] } | null = null;

export const getFerryRoutes = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < 6 * 3600_000) return cache.data;
  const res = await fetch("https://static.data.gov.hk/td/routes-fares-geojson/JSON_FERRY.json");
  if (!res.ok) throw new Error("無法讀取運輸署渡輪資料");
  const text = (await res.text()).replace(/^\uFEFF/, "");
  const json = JSON.parse(text) as {
    features: { geometry: { coordinates: [number, number] }; properties: any }[];
  };
  const map = new Map<string, FerryRoute>();
  for (const f of json.features) {
    const p = f.properties;
    const key = `${p.routeId}-${p.routeSeq}`;
    let r = map.get(key);
    if (!r) {
      r = {
        key,
        routeId: p.routeId,
        routeSeq: p.routeSeq,
        district: p.district,
        name: p.routeNameC,
        from: p.locStartNameC,
        to: p.locEndNameC,
        journeyTime: p.journeyTime ?? 0,
        fare: p.fullFare ?? 0,
        link: p.hyperlinkC ?? "",
        updated: String(p.lastUpdateDate ?? "").slice(0, 10),
        stops: [],
      };
      map.set(key, r);
    }
    r.stops.push({ seq: p.stopSeq, name: p.stopNameC, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
  }
  const unique = new Map<string, FerryRoute>();
  for (const route of map.values()) {
    const stops = route.stops.sort((a, b) => a.seq - b.seq);
    const signature = [
      route.district,
      route.name,
      route.from,
      route.to,
      route.journeyTime,
      route.fare,
      stops.map((stop) => `${stop.seq}:${stop.name}:${stop.lat},${stop.lng}`).join("|") ,
    ].join("|");
    if (!unique.has(signature)) unique.set(signature, { ...route, stops });
  }
  const data = [...unique.values()].sort((a, b) => a.routeId - b.routeId || a.routeSeq - b.routeSeq);
  cache = { at: Date.now(), data };
  return data;
});
