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
      icon: Number(f.forecastIcon) || null,
      min: Number(f.forecastMintemp?.value),
      max: Number(f.forecastMaxtemp?.value),
      psr: String(f.PSR ?? ""),
    })),
    general: String(fnd?.generalSituation ?? ""),
  };
});

type JourneyTimeRecord = {
  locationId: string;
  locationName: string;
  region: "港島" | "九龍" | "新界";
  destinationId: string;
  destinationName: string;
  captureDate: string;
  journeyType: string;
  journeyData: string;
  colourId: string;
  journeyDesc: string;
};

const journeyLocationNames: Record<string, string> = {
  H1: "告士打道東行近稅務大樓", H2: "堅拿道天橋北行近香港仔隧道出口", H3: "東區走廊西行近城市花園", H4: "黃泥涌道北行近皇后大道東", H5: "興發街北行近維多利亞公園", H6: "淺水灣道北行近香島道", H7: "黃竹坑道北行近香港鄉村俱樂部", H8: "黃竹坑道東行近香港仔運動場", H9: "鴨脷洲橋道北行近黃竹坑道", H11: "東區走廊西行近鯉景灣",
  K01: "渡船街南行近富榮花園", K02: "加士居道東行近香港理工大學", K03: "窩打老道南行近九龍醫院", K04: "公主道南行近愛民邨", K05: "啟福道北行近油站", K06: "漆咸道北南行近佛光街遊樂場", K07: "西九龍公路西行近港鐵南昌站", K08: "啟祥道西行近九龍灣消防總局",
  N01: "洪天路南行近洪志路", N02: "朗天路南行近柏麗豪園", N03: "元朗公路東行近十八鄉交匯處", N05: "大埔公路東行近廣福邨", N06: "青沙公路西行近城門河道", N07: "福民路北行近普通道", N08: "寶順路南行近頌明苑", N09: "環保大道西行近香港單車館", N10: "寶康路南行近九巴將軍澳車廠", N11: "寶邑路西行近調景嶺體育館", N12: "寶順路南行近調景嶺體育館", N13: "翠嶺路東行近調景嶺體育館",
  SJ1: "大埔公路南行近沙田馬場", SJ2: "大老山隧道公路南行近石門", SJ3: "吐露港公路南行近科學園", SJ4: "新田公路南行近錦綉花園", SJ5: "屯門公路南行近井財街",
};

const journeyDestinations: Record<string, string> = {
  CH: "紅磡海底隧道", EH: "東區海底隧道", WH: "西區海底隧道", ABT: "灣仔經香港仔隧道", WNCG: "灣仔經黃泥涌峽道", PFL: "中區經薄扶林道", ACTT: "機場經三號幹線", TMCLK: "機場經屯門赤鱲角隧道", ATL: "機場經大欖隧道", ATSCA: "機場經八號幹線", SSCPR: "上水經青山公路", SSYLH: "上水經九號幹線", LRT: "九龍（中）經獅子山隧道", SMT: "荃灣經城門隧道", TCT: "九龍（東）經大老山隧道", TKTL: "汀九經大欖隧道", TKTM: "汀九經屯門公路", TLH: "沙田經吐露港公路", TPR: "沙田經大埔公路", KTPR: "九龍經大埔公路", TSCA: "九龍（西）經八號幹線", TWCP: "荃灣（西）經青山公路", TWTM: "荃灣（西）經屯門公路", CWBR: "九龍經清水灣道", MOS: "九龍經二號幹線", TKOLTT: "九龍經將軍澳藍田隧道", TKOT: "九龍經將軍澳隧道",
};

const xmlValue = (source: string, tag: string) => source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))?.[1]?.replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim() ?? "";

export const getJourneyTimes = createServerFn({ method: "GET" }).handler(async () => {
  const response = await fetch("https://resource.data.one.gov.hk/td/jss/Journeytimev2.xml");
  if (!response.ok) throw new Error(`行車時間資料請求失敗 (${response.status})`);
  const xml = await response.text();
  const blocks = xml.split(/(?=<LOCATION_ID>)/i);
  const records = blocks.map((block) => {
    const locationId = xmlValue(block, "LOCATION_ID") || block.match(/(?:H|K|N|SJ)\d+/i)?.[0]?.toUpperCase() || "";
    const destinationId = xmlValue(block, "DESTINATION_ID");
    return {
      locationId, locationName: journeyLocationNames[locationId] ?? `行車時間顯示器 ${locationId}`,
      region: locationId.startsWith("H") ? "港島" : locationId.startsWith("K") ? "九龍" : "新界",
      destinationId, destinationName: journeyDestinations[destinationId] ?? destinationId,
      captureDate: xmlValue(block, "CAPTURE_DATE"), journeyType: xmlValue(block, "JOURNEY_TYPE"),
      journeyData: xmlValue(block, "JOURNEY_DATA"), colourId: xmlValue(block, "COLOUR_ID"), journeyDesc: xmlValue(block, "JOURNEY_DESC"),
    } satisfies JourneyTimeRecord;
  }).filter((record) => record.locationId && record.destinationId);
  return records;
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

const distM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000, t = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(t(lat2 - lat1) / 2) ** 2 + Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

export const getNearbyStops = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ lat: z.number(), lng: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const [k, c] = await Promise.all([j(`${KMB}/stop`).catch(() => null), j(`${CTB}/stop`).catch(() => null)]);
    type NS = { id: string; name: string; co: "KMB" | "CTB"; dist: number; lat: number; lng: number };
    const out: NS[] = [];
    for (const s of k?.data ?? []) {
      const lat = Number(s.lat), lng = Number(s.long);
      if (!lat || !lng) continue;
      out.push({ id: String(s.stop), name: String(s.name_tc), co: "KMB", dist: distM(data.lat, data.lng, lat, lng), lat, lng });
    }
    for (const s of c?.data ?? []) {
      const lat = Number(s.lat), lng = Number(s.long);
      if (!lat || !lng) continue;
      out.push({ id: String(s.stop), name: String(s.name_tc), co: "CTB", dist: distM(data.lat, data.lng, lat, lng), lat, lng });
    }
    return out.filter((s) => s.dist <= 800).sort((a, b) => a.dist - b.dist).slice(0, 12);
  });

// hkbus.app 車資表：用嚟建「城巴站 → 經過路線」對照（城巴冇按站查路線嘅接口）
let fareListCache: { at: number; data: any } | null = null;
async function getFareList() {
  if (fareListCache && Date.now() - fareListCache.at < 6 * 3600e3) return fareListCache.data;
  const r = await fetch("https://data.hkbus.app/routeFareList.min.json");
  if (!r.ok) throw new Error("無法取得巴士路線對照資料");
  const data = await r.json();
  fareListCache = { at: Date.now(), data };
  return data;
}

export const getNearbyRoutes = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ lat: z.number(), lng: z.number() }).parse(d))
  .handler(async ({ data }) => {
    const [k, fl] = await Promise.all([j(`${KMB}/stop`).catch(() => null), getFareList().catch(() => null)]);
    type NS = { id: string; name: string; dist: number; co: "KMB" | "CTB" };
    const stops: NS[] = [];
    for (const s of k?.data ?? []) {
      const lat = Number(s.lat), lng = Number(s.long);
      if (!lat || !lng) continue;
      const dist = distM(data.lat, data.lng, lat, lng);
      if (dist <= 800) stops.push({ id: String(s.stop), name: String(s.name_tc), dist, co: "KMB" });
    }
    // 城巴冇全站列表接口，用車資表嘅 stopList + stopMap 搵附近城巴站
    if (fl) {
      const stopList = fl.stopList as Record<string, any>;
      const stopMap = fl.stopMap as Record<string, any>;
      for (const [sid, info] of Object.entries(stopList)) {
        const lat = Number(info?.location?.lat), lng = Number(info?.location?.lng);
        if (!lat || !lng) continue;
        const dist = distM(data.lat, data.lng, lat, lng);
        if (dist > 800) continue;
        const ctbId = (stopMap[sid] ?? []).find((x: any) => x[0] === "ctb")?.[1];
        if (!ctbId) continue;
        stops.push({ id: String(ctbId), name: String(info?.name?.zh ?? "").replace(/\s*\([A-Z]+\d+\)\s*$/, ""), dist, co: "CTB" });
      }
    }
    stops.sort((a, b) => a.dist - b.dist);
    const near = stops.slice(0, 12);
    const m = new Map<string, { route: string; dir: "outbound" | "inbound"; dest: string; stopName: string; dist: number; etas: string[]; co: "KMB" | "CTB" }>();
    const addEta = (stop: NS, e: any) => {
      const key = `${stop.co}:${String(e.route)}:${String(e.dir)}`;
      const cur = m.get(key);
      if (!cur || stop.dist < cur.dist) {
        m.set(key, {
          route: String(e.route),
          dir: e.dir === "I" ? "inbound" : "outbound",
          dest: String(e.dest_tc ?? ""),
          stopName: stop.name,
          dist: stop.dist,
          etas: cur?.etas ?? [],
          co: stop.co,
        });
      }
      const v = m.get(key)!;
      if (e.eta && v.stopName === stop.name && v.etas.length < 3) v.etas.push(String(e.eta));
    };
    // 九巴：一個接口拎晒全站路線 ETA
    const kmbEtas = await Promise.all(near.map((s) => s.co === "KMB" ? j(`${KMB}/stop-eta/${s.id}`).catch(() => null) : null));
    kmbEtas.forEach((x, i) => {
      const stop = near[i]!;
      for (const e of x?.data ?? []) addEta(stop, e);
    });
    // 城巴：由車資表建「站 → 路線」對照，再逐路線查 ETA
    const ctbStopRoutes = new Map<string, Array<{ route: string; dir: "outbound" | "inbound"; dest: string }>>();
    if (fl) {
      for (const v of Object.values(fl.routeList as Record<string, any>)) {
        if (!v.co?.includes("ctb") || !Array.isArray(v.stops?.ctb)) continue;
        const dir = v.bound?.ctb === "I" ? "inbound" : "outbound";
        const dest = String(v.dest?.zh ?? "");
        for (const sid of v.stops.ctb as string[]) {
          const arr = ctbStopRoutes.get(sid) ?? [];
          if (arr.length < 8 && !arr.some((x) => x.route === String(v.route) && x.dir === dir)) arr.push({ route: String(v.route), dir, dest });
          ctbStopRoutes.set(sid, arr);
        }
      }
    }
    const ctbJobs: Promise<void>[] = [];
    for (const stop of near.filter((s) => s.co === "CTB")) {
      for (const r of (ctbStopRoutes.get(stop.id) ?? []).slice(0, 6)) {
        ctbJobs.push((async () => {
          const x = await j(`${CTB}/eta/CTB/${stop.id}/${r.route}`).catch(() => null);
          const list = x?.data ?? [];
          if (!list.length) {
            // 冇班次都照顯示路線
            const key = `CTB:${r.route}:${r.dir === "inbound" ? "I" : "O"}`;
            if (!m.has(key)) m.set(key, { route: r.route, dir: r.dir, dest: r.dest, stopName: stop.name, dist: stop.dist, etas: [], co: "CTB" });
            return;
          }
          for (const e of list) addEta(stop, e);
        })());
      }
    }
    await Promise.all(ctbJobs);
    return [...m.values()].sort((a, b) => a.route.localeCompare(b.route, "en", { numeric: true }));
  });

type GmbRoute = {
  id: string; name: string; district: string; start: string; end: string;
  fare: number; journeyTime: number; serviceMode: string; detailUrl: string;
};

const GMB_XML = "https://static.data.gov.hk/td/routes-fares-xml/ROUTE_GMB.xml";
const GMB_API = "https://data.etagmb.gov.hk";
let gmbCache: { at: number; data: GmbRoute[] } | null = null;

const xmlTag = (s: string, tag: string) => s.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"))?.[1]?.trim() ?? "";

export const getGmbRoutes = createServerFn({ method: "GET" }).handler(async () => {
  if (gmbCache && Date.now() - gmbCache.at < 6 * 3600e3) return gmbCache.data;
  const r = await fetch(GMB_XML);
  if (!r.ok) throw new Error("無法取得專綫小巴路線資料");
  const xml = await r.text();
  const data = xml.split(/<ROUTE>/i).slice(1).map((block): GmbRoute => ({
    id: xmlTag(block, "ROUTE_ID"), name: xmlTag(block, "ROUTE_NAMEC"), district: xmlTag(block, "DISTRICT"),
    start: xmlTag(block, "LOC_START_NAMEC"), end: xmlTag(block, "LOC_END_NAMEC"),
    fare: Number(xmlTag(block, "FULL_FARE")), journeyTime: Number(xmlTag(block, "JOURNEY_TIME")),
    serviceMode: xmlTag(block, "SERVICE_MODE"), detailUrl: xmlTag(block, "HYPERLINK_C"),
  })).filter((x) => x.id && x.name);
  gmbCache = { at: Date.now(), data };
  return data;
});

type NearbyGmb = { route: string; dest: string; stopName: string; dist: number; etas: Array<string | number>; co: "GMB"; routeId: string };
let gmbNearbyCache: { at: number; data: Array<{ routeId: string; route: GmbRoute; stops: Array<{ id: string; name: string; lat: number; lng: number }> }> } | null = null;

export const getNearbyGmbRoutes = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ lat: z.number(), lng: z.number() }).parse(d))
  .handler(async ({ data }) => {
    // 用車資表嘅 routeList（gtfsId = 小巴路線 ID、stops.gmb = 車站編號）+ stopList 座標
    const fl = await getFareList().catch(() => null);
    if (!fl) return [];
    const stopList = fl.stopList as Record<string, any>;
    const stopMap = fl.stopMap as Record<string, any>;
    // 車站編號 → 座標（stopMap 將實體站連去 gmb 站 ID）
    const gmbStopCoord = new Map<string, { lat: number; lng: number; name: string }>();
    for (const [sid, info] of Object.entries(stopList)) {
      const lat = Number(info?.location?.lat), lng = Number(info?.location?.lng);
      if (!lat || !lng) continue;
      for (const x of stopMap[sid] ?? []) {
        if (x[0] === "gmb") gmbStopCoord.set(String(x[1]), { lat, lng, name: String(info?.name?.zh ?? "").replace(/\s*\([A-Z]+\d+\)\s*$/, "") });
      }
    }
    // 每條路線（按 gtfsId 去重）搵最近車站
    const seen = new Set<string>();
    const candidates: Array<{ routeId: string; route: string; dest: string; stopId: string; stopName: string; dist: number }> = [];
    for (const v of Object.values(fl.routeList as Record<string, any>)) {
      if (!v.co?.includes("gmb") || !Array.isArray(v.stops?.gmb)) continue;
      const routeId = String(v.gtfsId ?? "");
      if (!routeId || seen.has(routeId)) continue;
      seen.add(routeId);
      let best: { stopId: string; stopName: string; dist: number } | null = null;
      for (const sid of v.stops.gmb as string[]) {
        const c = gmbStopCoord.get(String(sid));
        if (!c) continue;
        const dist = distM(data.lat, data.lng, c.lat, c.lng);
        if (dist <= 800 && (!best || dist < best.dist)) best = { stopId: String(sid), stopName: c.name, dist };
      }
      if (best) candidates.push({ routeId, route: String(v.route ?? ""), dest: String(v.dest?.zh ?? ""), ...best });
    }
    candidates.sort((a, b) => a.dist - b.dist);
    const top = candidates.slice(0, 12);
    const nearby: NearbyGmb[] = await Promise.all(top.map(async (c) => {
      const etaRes = await fetch(`${GMB_API}/eta/stop/${c.stopId}`).catch(() => null);
      const payload: any = etaRes?.ok ? await etaRes.json().catch(() => null) : null;
      const entries = Array.isArray(payload?.data) ? payload.data : [];
      const mine = entries.filter((e: any) => String(e.route_id) === c.routeId);
      const etas = mine.flatMap((e: any) => Array.isArray(e?.eta) ? e.eta : []).slice(0, 3).map((e: any) => e.diff ?? e.timestamp).filter((x: any) => x != null && x !== "");
      return { route: c.route, dest: c.dest, stopName: c.stopName, dist: c.dist, etas, co: "GMB" as const, routeId: c.routeId };
    }));
    return nearby;
  });

export const getGmbEta = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ routeId: z.string().regex(/^\d+$/), routeSeq: z.number().int().min(1).max(9).default(1) }).parse(d))
  .handler(async ({ data }) => {
    const r = await fetch(`${GMB_API}/route-stop/${data.routeId}/${data.routeSeq}`);
    if (!r.ok) throw new Error("無法取得專綫小巴車站資料");
    const payload: any = await r.json();
    const stops = payload?.data?.route_stops ?? payload?.data?.route_stop ?? payload?.data?.stops ?? payload?.data ?? [];
    return Promise.all((Array.isArray(stops) ? stops : []).map(async (s: any) => {
      const stopSeq = Number(s.stop_seq ?? s.stop_sequence ?? s.seq);
      const etaRes = await fetch(`${GMB_API}/eta/route-stop/${data.routeId}/${data.routeSeq}/${stopSeq}`).catch(() => null);
      const etaPayload: any = etaRes?.ok ? await etaRes.json().catch(() => null) : null;
      const entries = etaPayload?.data?.eta ?? etaPayload?.data?.etas ?? [];
      return {
        seq: stopSeq, id: String(s.stop_id ?? s.id ?? ""),
        name: String(s.stop_name_tc ?? s.name_tc ?? s.name ?? ""),
        etas: (Array.isArray(entries) ? entries : []).filter((e: any) => e.timestamp || e.diff != null).slice(0, 3).map((e: any) => ({
          timestamp: e.timestamp ? String(e.timestamp) : null, diff: e.diff == null ? null : Number(e.diff), remarks: String(e.remarks_tc ?? ""),
        })),
      };
    }));
  });

export const getMtr = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ line: z.string().max(4), sta: z.string().max(4) }).parse(d))
  .handler(async ({ data }) => {
    const x = await j(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${data.line}&sta=${data.sta}&lang=TC`);
    const s = x?.data?.[`${data.line}-${data.sta}`] ?? {};
    const map = (a: any[] = []) => a.map((t) => ({ dest: String(t.dest), plat: String(t.plat), time: String(t.time), ttnt: String(t.ttnt ?? "") }));
    return { up: map(s.UP), down: map(s.DOWN), status: Number(x?.status ?? 0), message: String(x?.message ?? ""), delay: x?.isdelay === "Y" };
  });
