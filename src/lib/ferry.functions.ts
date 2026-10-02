import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  serviceCode?: string;
  operator?: string;
  phone?: string;
  schedule?: string;
  fareDetail?: string;
};

const KAITO_DETAILS: Array<{
  match: string;
  code: string;
  operator: string;
  phone: string;
  schedule: string;
  fareDetail: string;
}> = [
  {
    match: "香港仔—鴨脷洲",
    code: "S 1",
    operator: "香港仔小輪有限公司",
    phone: "2873 0310",
    schedule: "每日服務；約每 5–8 分鐘一班",
    fareDetail: "成人 $3.0；小童 $1.5；航程約 4 分鐘",
  },
  {
    match: "蒲台島",
    code: "ABDN 15",
    operator: "翠華船務（香港）有限公司",
    phone: "2272 2022",
    schedule: "星期二、四、六、日及公眾假期服務",
    fareDetail: "蒲台島居民 $22–24；非居民 $30（單程）",
  },
  {
    match: "荔枝窩",
    code: "TP 16",
    operator: "聲威實業有限公司",
    phone: "2555 9269",
    schedule: "週末及公眾假期；平日按需求而定",
    fareDetail: "成人單程 $45；航程約 90 分鐘",
  },
  {
    match: "吉澳／鴨洲",
    code: "TP 17",
    operator: "聲威實業有限公司",
    phone: "2555 9269",
    schedule: "星期六、日及公眾假期服務",
    fareDetail: "成人單程 $45（包括往來鴨洲）",
  },
  {
    match: "深涌／荔枝莊／塔門",
    code: "TP 3",
    operator: "翠華船務（香港）有限公司",
    phone: "2272 2022",
    schedule: "每日服務；按平日及假日時間表運行",
    fareDetail: "平日 $20；星期六、日及公眾假期 $30",
  },
  {
    match: "東平洲",
    code: "TP 1",
    operator: "翠華船務（香港）有限公司",
    phone: "2272 2022",
    schedule: "星期六、日及公眾假期；星期六加開下午班次",
    fareDetail: "成人／小童 $100（即日來回）；居民 $60",
  },
  {
    match: "東龍島",
    code: "SKW 6",
    operator: "碧海船務有限公司",
    phone: "2337 6568",
    schedule: "只在星期六、日及公眾假期服務",
    fareDetail: "成人來回 $60；居民及 5–12 歲小童 $40",
  },
  {
    match: "三家村",
    code: "SKW 7",
    operator: "珊瑚海航運有限公司",
    phone: "2368 8885",
    schedule: "星期六、日及公眾假期服務",
    fareDetail: "非居民單程 $22.5；居民優惠；去程須一併購買回程票",
  },
  {
    match: "伙頭墳洲",
    code: "SK 154",
    operator: "晨曦會",
    phone: "2714 2434",
    schedule: "星期一至六；星期日及公眾假期除外",
    fareDetail: "成人單程 $80；10 歲以下小童 $20",
  },
  {
    match: "滘西村／糧船灣",
    code: "SKW 8",
    operator: "翠華船務（香港）有限公司",
    phone: "2272 2022",
    schedule: "星期六、日及公眾假期服務",
    fareDetail: "乘客單程最高 $65",
  },
  {
    match: "沙頭角",
    code: "TP 20",
    operator: "聲威實業有限公司",
    phone: "2555 9269",
    schedule: "每日服務；星期二暫停（公眾假期除外）",
    fareDetail: "沙頭角往返各站單程 $40；島嶼之間轉乘免費",
  },
  {
    match: "高流灣／赤徑／黃石",
    code: "TP 2",
    operator: "翠華船務（香港）有限公司",
    phone: "2272 2022",
    schedule: "每日服務；部分班次經高流灣及赤徑",
    fareDetail: "平日 $11；星期六、日及公眾假期 $16",
  },
  {
    match: "將軍澳（南）",
    code: "SKW 9",
    operator: "潤利海事控股有限公司",
    phone: "2771 7742",
    schedule: "星期六、日及公眾假期服務",
    fareDetail: "成人單程 $16.8；小童及合資格人士 $8.5",
  },
  {
    match: "大水坑",
    code: "TP 19",
    operator: "聲威實業有限公司",
    phone: "2555 9269",
    schedule: "星期二及星期四（公眾假期除外）",
    fareDetail: "由大水坑登船全程 $80；其他站登船 $60",
  },
];

function splitNote(raw: string): { label: string; note: string } {
  const text = (raw ?? "").trim();
  const sentence = text.match(/^(.*?)((?:單程|去程|前往|由).*收費.*)$/);
  if (sentence && sentence[1])
    return { label: sentence[1].trim(), note: (sentence[2] ?? "").replace(/^\(|\)$/g, "").trim() };
  const paren = text.match(/^(.*?)\(([^()]*收費[^()]*)\)$/);
  if (paren) return { label: (paren[1] ?? "").trim(), note: (paren[2] ?? "").trim() };
  return { label: text, note: "" };
}

export type FerryTimetableTable = { title: string; headers: string[]; rows: string[][] };
export type FerryTimetable = { tables: FerryTimetableTable[]; notes: string[]; source: string };

const TD_PAGE =
  /^https:\/\/www\.td\.gov\.hk\/tc\/transport_in_hong_kong\/public_transport\/ferries\/(?:kaito_services_map\/)?service_details\/index\.html$/;
const pageCache = new Map<string, { at: number; html: string }>();

function decode(s: string) {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseTable(html: string): FerryTimetableTable | null {
  const t: FerryTimetableTable = { title: "", headers: [], rows: [] };
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = [...tr.matchAll(/<t([hd])([^>]*)>([\s\S]*?)<\/t[hd]>/gi)].map((m) => ({
      attrs: m[2] ?? "",
      text: decode(m[3] ?? ""),
    }));
    if (!cells.length) continue;
    if (
      cells.some((c) => /TLevel1/.test(c.attrs)) ||
      (cells.length === 1 && /colspan/i.test(cells[0]?.attrs ?? "") && !t.rows.length)
    ) {
      const text = cells
        .map((c) => c.text)
        .filter(Boolean)
        .join(" ");
      if (!t.title) t.title = text;
      else t.rows.push([text]);
    } else if (cells.some((c) => /TLevel2/.test(c.attrs))) {
      t.headers = cells.map((c) => c.text);
    } else if (cells.some((c) => c.text)) {
      t.rows.push(cells.map((c) => c.text));
    }
  }
  return t.rows.length ? t : null;
}

export const getFerryTimetable = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ link: z.string().max(300) }).parse(d))
  .handler(async ({ data }): Promise<FerryTimetable> => {
    const [page = "", anchor = ""] = data.link.split("#");
    if (!TD_PAGE.test(page) || !anchor || !/^[a-z]\d{1,3}$/.test(anchor))
      return { tables: [], notes: [], source: data.link };
    let cached = pageCache.get(page);
    if (!cached || Date.now() - cached.at > 6 * 3600_000) {
      const res = await fetch(page);
      if (!res.ok) throw new Error("無法讀取運輸署班次資料");
      cached = { at: Date.now(), html: (await res.text()).replace(/<!--[\s\S]*?-->/g, "") };
      pageCache.set(page, cached);
    }
    const parts = cached.html.split(/<a\s+name="([a-z]\d+)"\s*>\s*<\/a>/i);
    let section = "";
    for (let i = 1; i < parts.length; i += 2) if (parts[i] === anchor) section += parts[i + 1];
    const start = section.search(/班次|時間表/);
    if (start < 0) return { tables: [], notes: [], source: data.link };
    let body = section.slice(start);
    const end = body.search(/船隻編號|<p class="HLevel1"/);
    if (end > 0) body = body.slice(0, end);
    const tables: FerryTimetableTable[] = [];
    body = body.replace(/<table[^>]*content_table1[^>]*>[\s\S]*?<\/table>/gi, (m) => {
      const t = parseTable(m);
      if (t) tables.push(t);
      return "\n";
    });
    const notes = body
      .replace(/<(?:br|\/p|\/li|\/tr|\/td|\/th|\/div|\/h\d)[^>]*>/gi, "\n")
      .split("\n")
      .map(decode)
      .filter((l) => l && !/^(班次|時間表)[:：]?$/.test(l))
      .slice(0, 60);
    return { tables, notes, source: data.link };
  });

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
    r.stops.push({
      seq: p.stopSeq,
      name: p.stopNameC,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    });
  }
  const byRoute = new Map<number, FerryRoute>();
  for (const route of [...map.values()].sort((a, b) => a.routeSeq - b.routeSeq)) {
    route.stops.sort((a, b) => a.seq - b.seq);
    if (route.district === "KAITO") {
      const detail = KAITO_DETAILS.find(
        (item) =>
          route.name.includes(item.match) || `${route.from}—${route.to}`.includes(item.match),
      );
      if (detail) Object.assign(route, detail);
    }
    const existing = byRoute.get(route.routeId);
    if (existing) {
      existing.bidirectional = true;
      continue;
    }
    const { label: to, note } = splitNote(route.to);
    const { label: from, note: fromNote } = splitNote(route.from);
    byRoute.set(route.routeId, {
      ...route,
      from,
      to,
      note: [fromNote, note].filter(Boolean).join(" "),
      bidirectional: false,
    });
  }
  const order: Record<string, number> = { INNER: 0, OUTLYING: 1, KAITO: 2 };
  const data = [...byRoute.values()].sort(
    (a, b) =>
      (order[a.district] ?? 9) - (order[b.district] ?? 9) ||
      a.from.localeCompare(b.from, "zh-HK") ||
      a.routeId - b.routeId,
  );
  cache = { at: Date.now(), data };
  return data;
});
