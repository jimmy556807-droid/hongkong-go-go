import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type LrtStop = { id: string; code: string; name: string; seq: number };
export type LrtRoute = { route: string; dir: string; stops: LrtStop[] };

const parseCsv = (txt: string) =>
  txt.replace(/^\uFEFF/, "").trim().split(/\r?\n/).slice(1).map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));

let netCache: { at: number; data: LrtRoute[] } | null = null;
let fareCache: Map<string, { adult: number; child: number; elder: number; student: number; single: number }> | null = null;

export const getLrtNetwork = createServerFn({ method: "GET" }).handler(async () => {
  if (netCache && Date.now() - netCache.at < 6 * 3600e3) return netCache.data;
  const r = await fetch("https://opendata.mtr.com.hk/data/light_rail_routes_and_stops.csv");
  if (!r.ok) throw new Error("無法取得輕鐵路線資料");
  const m = new Map<string, LrtRoute>();
  for (const [route, dir, code, id, name, , seq] of parseCsv(await r.text())) {
    if (!route || !id) continue;
    const k = `${route}-${dir}`;
    const v = m.get(k) ?? { route, dir: dir!, stops: [] };
    v.stops.push({ id: id!, code: code!, name: name!, seq: Number(seq) });
    m.set(k, v);
  }
  const data = [...m.values()].map((x) => ({ ...x, stops: x.stops.sort((a, b) => a.seq - b.seq) }))
    .sort((a, b) => a.route.localeCompare(b.route, "en", { numeric: true }) || a.dir.localeCompare(b.dir));
  netCache = { at: Date.now(), data };
  return data;
});

export const getLrtSchedule = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().regex(/^\d+$/) }).parse(d))
  .handler(async ({ data }) => {
    const r = await fetch(`https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule?station_id=${data.id}`);
    if (!r.ok) throw new Error("無法取得輕鐵班次");
    const x: any = await r.json();
    return (x?.platform_list ?? []).map((p: any) => ({
      platform: String(p.platform_id),
      trains: (p.route_list ?? []).map((t: any) => ({
        route: String(t.route_no), dest: String(t.dest_ch), time: String(t.time_ch), cars: Number(t.train_length ?? 1),
      })),
    })) as { platform: string; trains: { route: string; dest: string; time: string; cars: number }[] }[];
  });

export const getLrtFare = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ from: z.string().regex(/^\d+$/), to: z.string().regex(/^\d+$/) }).parse(d))
  .handler(async ({ data }) => {
    if (!fareCache) {
      const r = await fetch("https://opendata.mtr.com.hk/data/light_rail_fares.csv");
      if (!r.ok) return null;
      fareCache = new Map();
      for (const c of parseCsv(await r.text()))
        fareCache.set(`${c[0]}-${c[1]}`, { adult: +c[2]!, child: +c[3]!, elder: +c[4]!, student: +c[6]!, single: +c[8]! });
    }
    return fareCache.get(`${data.from}-${data.to}`) ?? null;
  });
