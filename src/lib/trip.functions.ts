import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LINES, STATIONS, STATION_DETAILS } from "./mtr-data";

export type Leg = {
  mode: "mtr" | "bus" | "ferry" | "walk";
  name: string;
  from: string;
  to: string;
  mins: number;
  note: string;
  line?: string;
  sta?: string;
  co?: "KMB" | "CTB";
  live?: string;
};

export type WebSource = {
  title: string;
  url: string;
  snippet: string;
};

export type PlaceSuggestion = {
  id: string;
  name: string;
  area: string;
  type: "mtr" | "spot" | "building" | "border";
};

export type Plan = {
  title: string;
  totalMins: number;
  fare: string;
  tags: string[];
  legs: Leg[];
  tip: string;
  weatherNote: string;
  sources?: WebSource[];
};

const Input = z.object({
  from: z.string().min(1).max(60),
  to: z.string().min(1).max(60),
  prefs: z.array(z.string().max(20)).max(6).optional().default([]),
});

const LOCAL_PLACES: PlaceSuggestion[] = [
  { id: "spot-airport", name: "香港國際機場", area: "大嶼山赤鱲角", type: "spot" },
  { id: "spot-hzmb", name: "港珠澳大橋香港口岸", area: "大嶼山東北部", type: "border" },
  { id: "spot-sz-bay", name: "深圳灣口岸", area: "元朗流浮山", type: "border" },
  { id: "spot-heung-yuen-wai", name: "香園圍口岸", area: "北區打鼓嶺", type: "border" },
  { id: "spot-west-kowloon", name: "西九龍高鐵站", area: "油尖旺區柯士甸道西", type: "spot" },
  { id: "spot-disney", name: "香港迪士尼樂園", area: "大嶼山竹篙灣", type: "spot" },
  { id: "spot-apm", name: "apm", area: "觀塘道418號，觀塘", type: "building" },
  { id: "spot-langham", name: "朗豪坊", area: "旺角亞皆老街8號", type: "building" },
  { id: "spot-wilmax", name: "Wilmax England Office", area: "香港", type: "building" },
  { id: "spot-harbour-city", name: "海港城", area: "尖沙咀廣東道", type: "building" },
  { id: "spot-times-square", name: "時代廣場", area: "銅鑼灣勿地臣街", type: "building" },
  { id: "spot-festival-walk", name: "又一城", area: "九龍塘達之路", type: "building" },
  { id: "spot-new-town-plaza", name: "新城市廣場", area: "沙田沙田正街", type: "building" },
  { id: "spot-langham-place", name: "Langham Place", area: "旺角亞皆老街", type: "building" },
  { id: "spot-megabox", name: "MegaBox", area: "九龍灣宏照道", type: "building" },
  { id: "spot-the-wai", name: "圍方", area: "大圍車公廟路", type: "building" },
  { id: "spot-airside", name: "AIRSIDE", area: "啟德協調道", type: "building" },
  { id: "spot-yoho", name: "Yoho Mall", area: "元朗朗日路", type: "building" },
  { id: "spot-central-piers", name: "中環碼頭", area: "中環民光街", type: "spot" },
  { id: "spot-star-ferry", name: "尖沙咀天星碼頭", area: "尖沙咀梳士巴利道", type: "spot" },
  { id: "spot-lo-wu", name: "羅湖口岸", area: "上水羅湖", type: "border" },
  { id: "spot-lok-ma-chau", name: "落馬洲口岸", area: "元朗落馬洲", type: "border" },
  { id: "spot-mary", name: "瑪麗醫院", area: "薄扶林道", type: "spot" },
  { id: "spot-polyu", name: "香港理工大學", area: "紅磡理工道", type: "spot" },
  { id: "spot-hku", name: "香港大學", area: "薄扶林道", type: "spot" },
  { id: "spot-cuhk", name: "香港中文大學", area: "沙田馬料水", type: "spot" },
  { id: "spot-ocean-park", name: "海洋公園", area: "香港仔黃竹坑道", type: "spot" },
];

const normalizePlaceQuery = (value: string) =>
  value.toLowerCase().replace(/[香港地區、，,\s]/g, "");

const LOCAL_SUGGESTIONS: PlaceSuggestion[] = Object.entries(STATIONS)
  .map(([id, name]): PlaceSuggestion => ({
    id: `mtr-${id}`,
    name: `${name}站`,
    area: "港鐵車站",
    type: "mtr",
  }))
  .concat(LOCAL_PLACES);

function localPlaceSearch(query: string) {
  const normalized = normalizePlaceQuery(query);
  return LOCAL_SUGGESTIONS.filter((place) =>
    normalizePlaceQuery(`${place.name}${place.area}`).includes(normalized),
  ).sort(
    (a, b) =>
      normalizePlaceQuery(a.name).indexOf(normalized) -
      normalizePlaceQuery(b.name).indexOf(normalized),
  );
}

type AlsAddress = {
  Address?: {
    PremisesAddress?: {
      ChiPremisesAddress?: {
        Region?: string;
        ChiDistrict?: { DcDistrict?: string };
        ChiStreet?: { StreetName?: string; BuildingNoFrom?: string };
        ChiEstate?: { EstateName?: string };
        BuildingName?: string;
      };
      GeospatialInformation?: { Latitude?: string; Longitude?: string };
    };
  };
  ValidationInformation?: { Score?: number };
};

function parseAlsResults(payload: unknown): PlaceSuggestion[] {
  const records = (payload as { SuggestedAddress?: AlsAddress[] })?.SuggestedAddress ?? [];
  return records
    .map((record, index) => {
      const address = record.Address?.PremisesAddress?.ChiPremisesAddress;
      const street = address?.ChiStreet;
      const building = address?.BuildingName || address?.ChiEstate?.EstateName || "";
      const streetLine = [street?.StreetName, street?.BuildingNoFrom].filter(Boolean).join(" ");
      const name = building || streetLine || address?.Region || "";
      const area = [address?.ChiDistrict?.DcDistrict, streetLine, address?.Region]
        .filter(Boolean)
        .join("、");
      const lower = `${name}${area}`.toLowerCase();
      const type = /口岸|管制站|邊境|boundary|port/.test(lower)
        ? "border"
        : /商場|中心|大廈|屋邨|廣場|mall|plaza|building|estate/.test(lower)
          ? "building"
          : "spot";
      return {
        id: `als-${index}-${encodeURIComponent(name)}`,
        name,
        area: area || "香港",
        type: type as PlaceSuggestion["type"],
      };
    })
    .filter((place) => place.name);
}

export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z.object({ query: z.string().trim().min(1).max(80) }).parse(value),
  )
  .handler(async ({ data }): Promise<PlaceSuggestion[]> => {
    const local = localPlaceSearch(data.query).slice(0, 6);
    if (local.length >= 6) return local;
    try {
      const response = await fetch(
        `https://www.als.gov.hk/lookup?q=${encodeURIComponent(data.query)}&n=6&t=20`,
        {
          headers: {
            accept: "application/json",
            "accept-language": "zh-Hant",
          },
        },
      );
      if (!response.ok) return local;
      const remote = parseAlsResults(await response.json());
      return [...local, ...remote]
        .filter((place, index, all) => all.findIndex((item) => item.name === place.name) === index)
        .slice(0, 6);
    } catch {
      return local;
    }
  });

async function readStream(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      const t = l.trim();
      if (!t.startsWith("data:")) continue;
      const p = t.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        out += JSON.parse(p)?.choices?.[0]?.delta?.content ?? "";
      } catch {
        /* partial */
      }
    }
  }
  return out;
}

async function liveMtr(line: string, sta: string) {
  try {
    const r = await fetch(
      `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${sta}&lang=TC`,
    );
    const x: any = await r.json();
    const s = x?.data?.[`${line}-${sta}`] ?? {};
    const t = [...(s.UP ?? []), ...(s.DOWN ?? [])]
      .map((v: any) => Number(v.ttnt))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)[0];
    return t === undefined ? "" : t <= 0 ? "列車即將到站" : `下班車約 ${t} 分鐘`;
  } catch {
    return "";
  }
}

async function liveBus(route: string, co: "KMB" | "CTB", stopName: string) {
  try {
    if (co === "CTB") return "";
    const r = await fetch(
      `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${route.toUpperCase()}/1`,
    );
    const x: any = await r.json();
    const list: any[] = (x?.data ?? []).filter((e: any) => e.eta);
    if (!list.length) return "現時暫無班次";
    const hit = stopName
      ? (list.find((e: any) => String(e.dest_tc ?? "").includes(stopName)) ?? list[0])
      : list[0];
    const m = Math.round((new Date(hit.eta).getTime() - Date.now()) / 60000);
    return m <= 0 ? "車輛即將到站" : `下班車約 ${m} 分鐘`;
  } catch {
    return "";
  }
}

async function news() {
  try {
    const r = await fetch("https://resource.data.one.gov.hk/td/tc/specialtrafficnews.xml");
    const xml = await r.text();
    return xml
      .split(/<message>/i)
      .slice(1, 9)
      .map((s) => s.match(/<ChinText>([\s\S]*?)<\/ChinText>/i)?.[1] ?? "")
      .map((s) => s.replace(/<!\[CDATA\[|\]\]>/g, "").trim())
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

type GeoPlace = {
  displayName: string;
  lat: number;
  lng: number;
};

const COMMON_HK_PLACES: Record<string, GeoPlace> = {
  中環: { displayName: "中環, 香港", lat: 22.2819, lng: 114.1582 },
  尖沙咀: { displayName: "尖沙咀, 香港", lat: 22.2966, lng: 114.1722 },
  旺角: { displayName: "旺角, 香港", lat: 22.3193, lng: 114.1694 },
  銅鑼灣: { displayName: "銅鑼灣, 香港", lat: 22.28, lng: 114.1848 },
  觀塘: { displayName: "觀塘, 香港", lat: 22.312, lng: 114.2259 },
  沙田: { displayName: "沙田, 香港", lat: 22.3833, lng: 114.1882 },
  屯門: { displayName: "屯門, 香港", lat: 22.391, lng: 113.977 },
  機場: { displayName: "香港國際機場", lat: 22.308, lng: 113.9185 },
};

async function geocode(place: string): Promise<GeoPlace | null> {
  const input = place.trim();
  if (!input) return null;

  const normalized = input
    .replace(/[香港地區]/g, "")
    .replace(/(港鐵|地鐵|東鐵|屯馬|輕鐵)?線?站/g, "")
    .replace(/[、，,\s]/g, "")
    .trim();
  const stationHit = Object.entries(STATIONS).find(
    ([, name]) => normalized === name.replace(/[、，,\s]/g, "") || normalized === `${name}站`,
  );
  if (stationHit) {
    const details = STATION_DETAILS[stationHit[0]];
    if (details) {
      return {
        displayName: `${stationHit[1]}站, 香港`,
        lat: details.coordinates[0],
        lng: details.coordinates[1],
      };
    }
  }

  // Nominatim 對只有區名或香港口語站名的結果不穩定，先用常見地點作可靠兜底。
  const direct = COMMON_HK_PLACES[input.replace(/香港|(港鐵|地鐵)站$/g, "").trim()];
  if (direct) return direct;

  const coordinateMatch = input.match(
    /^\\s*(-?\\d+(?:\\.\\d+)?)\\s*[,， ]\\s*(-?\\d+(?:\\.\\d+)?)\\s*$/,
  );
  if (coordinateMatch) {
    const lat = Number(coordinateMatch[1]);
    const lng = Number(coordinateMatch[2]);
    if (lat >= 22.1 && lat <= 22.6 && lng >= 113.7 && lng <= 114.5) {
      return { displayName: "目前位置", lat, lng };
    }
  }

  const queries = [
    `${input}, Hong Kong`,
    input.includes("香港") ? input : `${input}, 香港`,
    `${input.replace(/(港鐵|地鐵)站/g, "站")}, Hong Kong`,
  ].filter((query, index, all) => query && all.indexOf(query) === index);

  for (const query of queries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&bounded=1&viewbox=113.7,22.1,114.5,22.6&accept-language=zh-Hant,zh-TW,en&addressdetails=1&q=${encodeURIComponent(query)}`,
        {
          signal: controller.signal,
          headers: { accept: "application/json", "user-agent": "HongKongGoGo/1.0 (trip planner)" },
        },
      );
      clearTimeout(timeout);
      if (!response.ok) continue;
      const result = (await response.json())?.[0];
      const lat = Number(result?.lat);
      const lng = Number(result?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { displayName: String(result.display_name ?? place), lat, lng };
      }
    } catch {
      // 嘗試下一個查詢格式，避免一次上游逾時令整個行程失敗。
    }
  }
  return null;
}

async function webSearch(from: string, to: string): Promise<WebSource[]> {
  const queries = [`${from} 到 ${to} 公共交通 路線 香港`, `${from} ${to} 港鐵 巴士 渡輪 交通消息`];
  const sources: WebSource[] = [];
  for (const query of queries) {
    try {
      const response = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        {
          headers: { "user-agent": "HongKongGoGo/1.0 (route research)" },
        },
      );
      if (!response.ok) continue;
      const html = await response.text();
      const matches = [
        ...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi),
      ];
      for (const match of matches.slice(0, 5)) {
        const url = match[1]?.replace(/&amp;/g, "&");
        const title = match[2]
          ?.replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .trim();
        if (!url || !title || sources.some((source) => source.url === url)) continue;
        sources.push({ title, url, snippet: "網上搜尋結果，請以官方即時資料及現場資訊核實。" });
      }
    } catch {
      // 搜尋服務不可用時仍可使用官方交通資料規劃。
    }
  }
  return sources.slice(0, 8);
}

async function journeyTimes() {
  try {
    const response = await fetch("https://resource.data.one.gov.hk/td/jss/Journeytimev2.xml");
    if (!response.ok) return "";
    const xml = await response.text();
    const value = (source: string, tag: string) =>
      source
        .match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))?.[1]
        ?.replace(/<!\\[CDATA\\[|\\]\\]>/g, "")
        .trim() ?? "";
    return xml
      .split(/(?=<LOCATION_ID>)/i)
      .map((block) => ({
        location: value(block, "LOCATION_ID"),
        destination: value(block, "DESTINATION_ID"),
        minutes: value(block, "JOURNEY_DATA"),
        capturedAt: value(block, "CAPTURE_DATE"),
      }))
      .filter((item) => item.location && item.destination && item.minutes)
      .slice(0, 80)
      .map((item) => `${item.location}->${item.destination}: ${item.minutes} (${item.capturedAt})`)
      .join("\\n");
  } catch {
    return "";
  }
}

async function weather() {
  try {
    const base = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?lang=tc&dataType=";
    const [x, wr]: any[] = await Promise.all([
      fetch(base + "rhrread").then((r) => r.json()),
      fetch(base + "warnsum")
        .then((r) => r.json())
        .catch(() => ({})),
    ]);
    const t = x?.temperature?.data?.[0];
    const rain = Math.max(0, ...(x?.rainfall?.data ?? []).map((d: any) => Number(d?.max) || 0));
    const warns = Object.values(wr ?? {})
      .map((v: any) => v?.name)
      .filter(Boolean)
      .join("、");
    return `氣溫約 ${t?.value ?? "--"}°C，濕度 ${x?.humidity?.data?.[0]?.value ?? "--"}%，過去一小時最高雨量 ${rain}mm${warns ? `，生效警告：${warns}` : "，冇天氣警告"}`;
  } catch {
    return "";
  }
}

export const planTrip = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(
    async ({
      data,
    }): Promise<{
      plans: Plan[];
      error?: string;
      weather?: string;
      locations?: { from?: GeoPlace; to?: GeoPlace };
    }> => {
      const key = process.env["DEEPSEEK_API_KEY"];
      if (!key) return { plans: [], error: "未設定 DeepSeek 金鑰，請先在設定加入。" };

      const [fromLocation, toLocation] = await Promise.all([
        geocode(data.from),
        geocode(data.to),
      ]).catch(() => [null, null]);
      const [n, w, jt, webSources] = await Promise.all([
        news(),
        weather(),
        journeyTimes(),
        webSearch(data.from, data.to),
      ]);
      const lines = LINES.map(
        (l) => `${l.name}(${l.code}): ${l.stations.map((s) => `${STATIONS[s]}=${s}`).join(" ")}`,
      ).join("\n");

      const sys = `你是香港本土交通出行研究 AI，會先分析網上搜尋結果，再結合官方即時資料，為用戶提供可核實的公共交通路線。
你精通全港港鐵、九巴、城巴、渡輪及專綫小巴網絡，必須以香港本地人真實出行角度回答。
網上搜尋結果不是保證正確的班次資料；只可用來發現可能的路線，路線、站名、方向及交通工具必須與官方資料一致。不可將搜尋摘要當成即時班次。

【用戶行程需求】
- 出發地：${data.from}
- 目的地：${data.to}
- 出發地解析：${fromLocation ? `${fromLocation.displayName} (${fromLocation.lat}, ${fromLocation.lng})` : "未能可靠解析，必須降低信心並避免虛構附近車站"}
- 目的地解析：${toLocation ? `${toLocation.displayName} (${toLocation.lat}, ${toLocation.lng})` : "未能可靠解析，必須降低信心並避免虛構附近車站；如無法確認終點，優先要求用戶提供更完整地址"}
- 地理位置使用規則：先以解析後的 displayName、緯度及經度確認兩端實際位置，再選擇最近的港鐵站、巴士站、渡輪碼頭或步行接駁；不得只憑相似地名猜測路線。若只有一端成功解析，仍可規劃但必須明確標示另一端為估算。

【核心規劃原則】
1. 嚴禁盲目推薦多次轉乘港鐵：凡出發地或目的地非地鐵上蓋、或港鐵���要轉乘 2 次或以上時，若路面有「公路/隧道直達特快巴士」，必須優先推薦直達特快為第一方案！
   - 新界東 ↔ 九龍東：大埔/廣福道 ↔ 觀塘/apm 優先推薦 74X；沙田 ↔ 觀塘優先 89X/89D 等。
   - 新界東/其他區 ↔ 港珠澳口岸/機場：大埔 ↔ 港珠澳大橋旅檢��樓/機場優先推薦 A47X；其他區優先推薦對應 A 線。
   - 新界西 ↔ 港島：元朗/屯門 ↔ 中上環/灣仔優先推薦 968、960 等。
   - 維港兩岸：中環碼頭 ↔ 尖沙咀碼頭優先推薦天星小輪。
   - 陸路口岸：香園圍（B7/B8）、深圳灣（B2/B3/B3X）、港珠澳（A線/B6）。
2. 計算真實門對門時間：合理估算由地標步行至最近車站的時間，並計入深層港鐵站轉乘步行耗時。
3. 因應實時天氣與路況調整：惡劣天氣減少長距離露天步行與渡輪，優先有遮蔽路線及港鐵室內轉乘；天氣良好時積極推薦直達特快巴士或渡輪。

【輸出雙方案規則】
固定輸出 2 個互補方案：
- 方案一【最推薦・最快最方便】：門對門最快、轉乘最少的最優解（有 74X、A47X、968 等直達特快時必選）。
- 方案二【備用／替代方案】：若方案一為巴士，推薦港鐵或鐵路組合；若方案一為港鐵，推薦純巴士或路面交通方案。

【輸出格式】
必須只輸出有效 JSON，不可有 Markdown，格式如下：
{"plans":[{"title":"方案名稱","totalMins":42,"fare":"約 $11.1","tags":["特快直達","無需轉乘"],"tip":"實用搭車貼士","weatherNote":"因應天氣點解揀呢條路線","sources":[{"title":"來源標題","url":"https://example.com","snippet":"來源如何支持此路線"}],"legs":[{"mode":"walk|bus|mtr|ferry","name":"路線名稱","from":"上車站／出發地名","to":"落車站／目的地名","mins":35,"note":"簡短說明","line":"港鐵路綫代碼（僅限港鐵）","sta":"港鐵上車站代碼（僅限港鐵）","co":"KMB 或 CTB（僅限巴士）"}]}]}

【資料可信度規則】
- 交通消息、天氣及行車時間顯示器只可作為即時背景，不可據此捏造不存在的巴士班次或渡輪班次。
- 路線名稱、方向、車站及轉乘必須與香港現有公共交通網絡一致；不確定時寧願省略該方案，或在 note 清楚標示「資料未能核實」。
- 優先選擇有官方資料支持的港鐵、九巴、城巴及運輸署渡輪；專綫小巴只能在確實知道路線與上落客位置時使用。
- totalMins 必須約等於所有 legs 的 mins 總和；mins 要包括步行、等車、轉乘及預留的路況時間，不可只填車程。

【代碼對接規則】
- mode 為 mtr 時，line 與 sta 只可填寫下列有效港鐵代碼：
${lines}
- mode 為 bus 時，name 必須以「巴士 <路線號>」表示，co 必須填 KMB 或 CTB。
- mode 為 ferry 或 walk 時，不要填寫 line、sta 或 co。

【網上搜尋結果】
${webSources.length ? webSources.map((source, index) => `${index + 1}. ${source.title}\nURL: ${source.url}\n${source.snippet}`).join("\n") : "暫時未取得搜尋結果，必須只使用官方資料及已知交通網絡。"}

現時實時資訊：
天氣：${w || "暫無"}
特別交通消息：${n || "暫無"}
行車時間顯示器（僅供估算路面延誤）：${jt || "暫無"}`;

      let res: Response;
      try {
        res = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "deepseek-flash",
            stream: true,
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: sys },
              {
                role: "user",
                content: `由「${data.from}」去「${data.to}」。地理編碼座標：出發點 (${fromLocation?.lat ?? "未能解析"}, ${fromLocation?.lng ?? "未能解析"})，終點 (${toLocation?.lat ?? "未能解析"}, ${toLocation?.lng ?? "未能解析"})。請根據可用座標、地點名稱、現時交通消息、天氣及各交通工具的可用性推薦最適合嘅路線。現在時間：${new Date().toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" })}`,
              },
            ],
          }),
        });
      } catch {
        return { plans: [], error: "連接 DeepSeek 失敗，請稍後再試。" };
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 401) return { plans: [], error: "DeepSeek 金鑰無效，請更新。" };
        if (res.status === 402) return { plans: [], error: "DeepSeek 帳戶餘額不足。" };
        if (res.status === 429) return { plans: [], error: "查詢太頻密，請稍等再試。" };
        return {
          plans: [],
          error: `DeepSeek 錯誤 (${res.status})${body ? `：${body.slice(0, 120)}` : ""}`,
        };
      }

      const text = await readStream(res);
      let parsed: any;
      try {
        parsed = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim());
      } catch {
        return { plans: [], error: "建議格式有誤，請再試一次。" };
      }

      const plans: Plan[] = (parsed?.plans ?? []).slice(0, 2).map((p: any) => ({
        title: String(p?.title ?? "建議路線"),
        totalMins: Number(p?.totalMins) || 0,
        fare: String(p?.fare ?? ""),
        tags: (p?.tags ?? []).slice(0, 3).map(String),
        tip: String(p?.tip ?? ""),
        weatherNote: String(p?.weatherNote ?? ""),
        sources: (p?.sources ?? [])
          .slice(0, 4)
          .map((source: any) => ({
            title: String(source?.title ?? "網上資料"),
            url: String(source?.url ?? ""),
            snippet: String(source?.snippet ?? ""),
          }))
          .filter((source: WebSource) => /^https?:\/\//.test(source.url)),
        legs: (p?.legs ?? []).slice(0, 8).map((l: any) => ({
          mode: (["mtr", "bus", "ferry", "walk"].includes(l?.mode)
            ? l.mode
            : "walk") as Leg["mode"],
          name: String(l?.name ?? ""),
          from: String(l?.from ?? ""),
          to: String(l?.to ?? ""),
          mins: Number(l?.mins) || 0,
          note: String(l?.note ?? ""),
          line: l?.line ? String(l.line) : undefined,
          sta: l?.sta ? String(l.sta) : undefined,
          co: l?.co === "CTB" ? "CTB" : l?.co === "KMB" ? "KMB" : undefined,
        })),
      }));

      await Promise.all(
        plans.flatMap((p) =>
          p.legs.map(async (leg) => {
            if (leg.mode === "mtr" && leg.line && leg.sta) {
              leg.live = await liveMtr(leg.line, leg.sta);
            } else if (leg.mode === "bus") {
              const num = leg.name.match(/[0-9]+[A-Za-z]?/)?.[0];
              if (num) leg.live = await liveBus(num, leg.co ?? "KMB", leg.to);
            }
          }),
        ),
      );

      return {
        plans,
        weather: w,
        ...(fromLocation || toLocation
          ? {
              locations: {
                ...(fromLocation ? { from: fromLocation } : {}),
                ...(toLocation ? { to: toLocation } : {}),
              },
            }
          : {}),
      };
    },
  );
