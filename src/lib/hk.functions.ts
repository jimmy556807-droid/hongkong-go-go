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
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
  };
  const items = xml.split(/<message>/i).slice(1).map((s, i) => ({
    id: pick(s, "msgID") || String(i),
    text: pick(s, "ChinText") || pick(s, "EngText"),
    short: pick(s, "ChinShort"),
    date: pick(s, "ReferenceDate"),
  }));
  return items.filter((i) => i.text);
});

export const getBus = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ route: z.string().min(1).max(5), dir: z.enum(["outbound", "inbound"]) }).parse(d))
  .handler(async ({ data }) => {
    const route = data.route.toUpperCase();
    const B = "https://data.etabus.gov.hk/v1/transport/kmb";
    const [rs, eta] = await Promise.all([
      j(`${B}/route-stop/${route}/${data.dir}/1`),
      j(`${B}/route-eta/${route}/1`),
    ]);
    const stops: any[] = rs?.data ?? [];
    if (!stops.length) return { route, stops: [] };
    const names = await Promise.all(
      stops.map((s) => j(`${B}/stop/${s.stop}`).then((x) => String(x?.data?.name_tc ?? s.stop)).catch(() => s.stop)),
    );
    const d = data.dir === "outbound" ? "O" : "I";
    const etas: any[] = (eta?.data ?? []).filter((e: any) => e.dir === d);
    return {
      route,
      dest: String(stops.length ? names[names.length - 1] : ""),
      stops: stops.map((s, i) => ({
        seq: Number(s.seq),
        name: names[i],
        etas: etas
          .filter((e) => Number(e.seq) === Number(s.seq) && e.eta)
          .map((e) => String(e.eta))
          .slice(0, 3),
      })),
    };
  });

export const getMtr = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ line: z.string().max(4), sta: z.string().max(4) }).parse(d))
  .handler(async ({ data }) => {
    const x = await j(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${data.line}&sta=${data.sta}&lang=TC`);
    const s = x?.data?.[`${data.line}-${data.sta}`] ?? {};
    const map = (a: any[] = []) => a.map((t) => ({ dest: String(t.dest), plat: String(t.plat), time: String(t.time), ttnt: String(t.ttnt ?? "") }));
    return { up: map(s.UP), down: map(s.DOWN), status: Number(x?.status ?? 0), message: String(x?.message ?? ""), delay: x?.isdelay === "Y" };
  });
