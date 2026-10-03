import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type LrtStop = { id: string; code: string; name: string; seq: number };
export type LrtRoute = { route: string; dir: string; stops: LrtStop[] };

const parseCsv = (txt: string) =>
  txt.replace(/^\uFEFF/, "").trim().split(/\r?\n/).slice(1).map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));

let netCache: { at: number; data: LrtRoute[] } | null = null;
export type LrtFare = {
  octopusAdult: number;
  octopusChild: number;
  octopusElderly: number;
  octopusPwd: number;
  octopusStudent: number;
  octopusJoyYouSixty: number;
  singleAdult: number;
  singleChild: number;
  singleElderly: number;
};

let fareCache: Map<string, LrtFare> | null = null;

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
      for (const c of parseCsv(await r.text())) {
        const values = c.map((value) => Number(value));
        if (values.length < 11 || !Number.isFinite(values[0]) || !Number.isFinite(values[1])) continue;
        fareCache.set(`${c[0]}-${c[1]}`, {
          octopusAdult: values[2] ?? 0,
          octopusChild: values[3] ?? 0,
          octopusElderly: values[4] ?? 0,
          octopusPwd: values[5] ?? 0,
          octopusStudent: values[6] ?? 0,
          octopusJoyYouSixty: values[7] ?? 0,
          singleAdult: values[8] ?? 0,
          singleChild: values[9] ?? 0,
          singleElderly: values[10] ?? 0,
        });
      }
    }
    return fareCache.get(`${data.from}-${data.to}`) ?? null;
  });
