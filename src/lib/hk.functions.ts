import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function j(url: string) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`請求失敗 (${r.status})`);
  return r.json();
}

export const getWeather = createServerFn({ method: "GET" }).handler(async () => {
  const base = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?lang=tc&dataType=";
  const [now, fnd, warn] = await Promise.all([j(base + "rhrread"), j(base + "fnd"), j(base + "warnsum")]);
  const hko = now?.temperature?.data?.find((d: any) => d.place === "香港天文台") ?? now?.temperature?.data?.[0];
  return {
    temp: hko?.value ?? null as number | null,
    humidity: now?.humidity?.data?.[0]?.value ?? null as number | null,
    icon: now?.icon?.[0] ?? null as number | null,
    updateTime: String(now?.updateTime ?? ""),
    warnings: Object.values(warn ?? {}).map((w: any) => String(w.name)),
    forecast: (fnd?.weatherForecast ?? []).slice(0, 7).map((f: any) => ({
      date: String(f.forecastDate),
      week: String(f.week),
      desc: String(f.forecastWeather),
      min: Number(f.forecastMintemp?.value),
      max: Number(f.forecastMaxtemp?.value),
      psr: String(f.PSR ?? ""),
    })),
    general: String(fnd?.generalSituation ?? ""),
  };
});

export const getNews = createServerFn({ method: "GET" }).handler(async () => {
  const r = await fetch("https://resource.data.one.gov.hk/td/tc/specialtrafficnews.xml");
  if (!r.ok) throw new Error("無法取得交通消息");
  const xml = await r.text();
  const pick = (s: string, tag: string) => {
    const m = s.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
    return m?.[1] ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
  };
  const items = xml.split(/<message>/i).slice(1).map((s, i) => ({
    id: pick(s, "msgID") || String(i),
    text: pick(s, "ChinText") || pick(s, "EngText"),
    short: pick(s, "ChinShort"),
    date: pick(s, "ReferenceDate"),
  }));
  return items.filter((i) => i.text);
});

const KMB = "https://data.etabus.gov.hk/v1/transport/kmb";
const CTB = "https://rt.data.gov.hk/v2/transport/citybus";
const co = z.enum(["KMB", "CTB"]).default("KMB");

export const getBus = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ route: z.string().min(1).max(5), dir: z.enum(["outbound", "inbound"]), co }).parse(d))
  .handler(async ({ data }) => {
    const route = data.route.toUpperCase();
    const d = data.dir === "outbound" ? "O" : "I";
    if (data.co === "CTB") {
      const rs = await j(`${CTB}/route-stop/CTB/${route}/${data.dir}`);
      const stops: any[] = rs?.data ?? [];
      if (!stops.length) return { route, co: "CTB", dest: "", stops: [] };
      const rows = await Promise.all(stops.map(async (s) => {
        const [n, e] = await Promise.all([
          j(`${CTB}/stop/${s.stop}`).then((x) => String(x?.data?.name_tc ?? s.stop)).catch(() => String(s.stop)),
          j(`${CTB}/eta/CTB/${s.stop}/${route}`).then((x) => (x?.data ?? []) as any[]).catch(() => [] as any[]),
        ]);
        return {
          seq: Number(s.seq), id: String(s.stop), name: n,
          etas: e.filter((x) => x.dir === d && x.eta).map((x) => String(x.eta)).slice(0, 3),
        };
      }));
      return { route, co: "CTB", dest: rows[rows.length - 1]!.name, stops: rows };
    }
    const [rs, eta] = await Promise.all([j(`${KMB}/route-stop/${route}/${data.dir}/1`), j(`${KMB}/route-eta/${route}/1`)]);
    const stops: any[] = rs?.data ?? [];
    if (!stops.length) return { route, co: "KMB", dest: "", stops: [] };
    const names = await Promise.all(
      stops.map((s) => j(`${KMB}/stop/${s.stop}`).then((x) => String(x?.data?.name_tc ?? s.stop)).catch(() => String(s.stop))),
    );
    const etas: any[] = (eta?.data ?? []).filter((e: any) => e.dir === d);
    return {
      route, co: "KMB",
      dest: String(names[names.length - 1] ?? ""),
      stops: stops.map((s, i) => ({
        seq: Number(s.seq), id: String(s.stop), name: names[i]!,
        etas: etas.filter((e) => Number(e.seq) === Number(s.seq) && e.eta).map((e) => String(e.eta)).slice(0, 3),
      })),
    };
  });

type R = { route: string; dir: "outbound" | "inbound"; orig: string; dest: string; co: "KMB" | "CTB" };

export const getBusRoutes = createServerFn({ method: "GET" }).handler(async () => {
  const [k, c] = await Promise.all([j(`${KMB}/route/`).catch(() => null), j(`${CTB}/route/CTB`).catch(() => null)]);
  const seen = new Set<string>();
  const out: R[] = [];
  for (const r of k?.data ?? []) {
    if (r.service_type !== "1") continue;
    const x: R = { route: String(r.route), dir: r.bound === "O" ? "outbound" : "inbound", orig: String(r.orig_tc), dest: String(r.dest_tc), co: "KMB" };
    const key = "K" + x.route + x.dir; if (seen.has(key)) continue; seen.add(key); out.push(x);
  }
  for (const r of c?.data ?? []) {
    out.push({ route: String(r.route), dir: "outbound", orig: String(r.orig_tc), dest: String(r.dest_tc), co: "CTB" });
    out.push({ route: String(r.route), dir: "inbound", orig: String(r.dest_tc), dest: String(r.orig_tc), co: "CTB" });
  }
  return out;
});

export const getStopEta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ stop: z.string().regex(/^[A-Z0-9]+$/), co, route: z.string().max(5).optional() }).parse(d))
  .handler(async ({ data }) => {
    const x = data.co === "CTB"
      ? await j(`${CTB}/eta/CTB/${data.stop}/${data.route ?? ""}`)
      : await j(`${KMB}/stop-eta/${data.stop}`);
    const m = new Map<string, { route: string; dest: string; etas: string[] }>();
    for (const e of x?.data ?? []) {
      if (!e.eta) continue;
      const k = e.route + e.dir;
      const v = m.get(k) ?? { route: String(e.route), dest: String(e.dest_tc), etas: [] };
      if (v.etas.length < 3) v.etas.push(String(e.eta));
      m.set(k, v);
    }
    return [...m.values()].sort((a, b) => a.route.localeCompare(b.route, "en", { numeric: true }));
  });

export const getMtr = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ line: z.string().max(4), sta: z.string().max(4) }).parse(d))
  .handler(async ({ data }) => {
    const x = await j(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${data.line}&sta=${data.sta}&lang=TC`);
    const s = x?.data?.[`${data.line}-${data.sta}`] ?? {};
    const map = (a: any[] = []) => a.map((t) => ({ dest: String(t.dest), plat: String(t.plat), time: String(t.time), ttnt: String(t.ttnt ?? "") }));
    return { up: map(s.UP), down: map(s.DOWN), status: Number(x?.status ?? 0), message: String(x?.message ?? ""), delay: x?.isdelay === "Y" };
  });
