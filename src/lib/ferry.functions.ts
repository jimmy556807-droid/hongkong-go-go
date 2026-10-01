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
  note?: string;
  bidirectional?: boolean;
};

function splitNote(raw: string): { label: string; note: string } {
  const text = (raw ?? "").trim();
  const sentence = text.match(/^(.*?)((?:單程|去程|前往|由).*收費.*)$/);
  if (sentence && sentence[1]) return { label: sentence[1].trim(), note: sentence[2].replace(/^\(|\)$/g, "").trim() };
  const paren = text.match(/^(.*?)\(([^()]*收費[^()]*)\)$/);
  if (paren) return { label: paren[1].trim(), note: paren[2].trim() };
  return { label: text, note: "" };
}

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
  const byRoute = new Map<number, FerryRoute>();
  for (const route of [...map.values()].sort((a, b) => a.routeSeq - b.routeSeq)) {
    route.stops.sort((a, b) => a.seq - b.seq);
    const existing = byRoute.get(route.routeId);
    if (existing) {
      existing.bidirectional = true;
      continue;
    }
    const { label: to, note } = splitNote(route.to);
    const { label: from, note: fromNote } = splitNote(route.from);
    byRoute.set(route.routeId, { ...route, from, to, note: [fromNote, note].filter(Boolean).join(" "), bidirectional: false });
  }
  const order: Record<string, number> = { INNER: 0, OUTLYING: 1, KAITO: 2 };
  const data = [...byRoute.values()].sort(
    (a, b) => (order[a.district] ?? 9) - (order[b.district] ?? 9) || a.from.localeCompare(b.from, "zh-HK") || a.routeId - b.routeId,
  );
  cache = { at: Date.now(), data };
  return data;
});
