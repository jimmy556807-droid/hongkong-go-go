import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LINES, STATIONS } from "./mtr-data";

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

export type Plan = {
  title: string;
  totalMins: number;
  fare: string;
  tags: string[];
  legs: Leg[];
  tip: string;
  weatherNote: string;
};

const Input = z.object({
  from: z.string().min(1).max(60),
  to: z.string().min(1).max(60),
  prefs: z.array(z.string().max(20)).max(6).optional().default([]),
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
      ? list.find((e: any) => String(e.dest_tc ?? "").includes(stopName)) ?? list[0]
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

async function geocode(place: string): Promise<GeoPlace | null> {
  try {
    const query = place.includes("香港") ? place : `${place}, 香港`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=hk&accept-language=zh-TW&q=${encodeURIComponent(query)}`,
      { headers: { accept: "application/json", "user-agent": "HongKongGoGo/1.0 (trip planner)" } },
    );
    if (!response.ok) return null;
    const result = (await response.json())?.[0];
    const lat = Number(result?.lat);
    const lng = Number(result?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { displayName: String(result.display_name ?? place), lat, lng };
  } catch {
    return null;
  }
}

async function weather() {
  try {
    const base = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?lang=tc&dataType=";
    const [x, wr]: any[] = await Promise.all([
      fetch(base + "rhrread").then((r) => r.json()),
      fetch(base + "warnsum").then((r) => r.json()).catch(() => ({})),
    ]);
    const t = x?.temperature?.data?.[0];
    const rain = Math.max(0, ...((x?.rainfall?.data ?? []).map((d: any) => Number(d?.max) || 0)));
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
  .handler(async ({ data }): Promise<{ plans: Plan[]; error?: string; weather?: string; locations?: { from: GeoPlace; to: GeoPlace } }> => {
    const key = process.env["DEEPSEEK_API_KEY"];
    if (!key) return { plans: [], error: "未設定 DeepSeek 金鑰，請先在設定加入。" };

    const [fromLocation, toLocation] = await Promise.all([geocode(data.from), geocode(data.to)]);
    if (!fromLocation || !toLocation) {
      return { plans: [], error: "搵唔到其中一個地點，請輸入較完整嘅香港地點名稱（例如：中環港鐵站）。" };
    }
    const [n, w] = await Promise.all([news(), weather()]);
    const lines = LINES.map(
      (l) => `${l.name}(${l.code}): ${l.stations.map((s) => `${STATIONS[s]}=${s}`).join(" ")}`,
    ).join("\n");

    const sys = `你是香港交通出行規劃專家，精通港鐵、九巴、城巴、渡輪及專綫小巴網絡。你必須站在香港本地人真實出行角度，推薦最實際、門對門最快最方便的路線。

【重要核心準則】
0. 地點解析結果（必須以此作為路線判斷基礎）：出發地「${fromLocation.displayName}」座標 ${fromLocation.lat.toFixed(6)}, ${fromLocation.lng.toFixed(6)}；目的地「${toLocation.displayName}」座標 ${toLocation.lat.toFixed(6)}, ${toLocation.lng.toFixed(6)}。先按座標判斷兩地所屬區域、最近車站／巴士站及步行距離，不可只按地名猜測。
1. 嚴禁盲目推薦多次轉乘港鐵：凡起點或終點遠離港鐵站，或港鐵需要轉乘 2 次或以上時，如有公路／隧道直達特快巴士，必須優先推薦直達巴士。例：新界東往九龍東優先考慮 74X、89X、89D；大埔往港珠澳口岸／機場考慮 A47X；新界西往港島考慮 968、960；維港兩岸考慮天星小輪；前往香園圍、深圳灣及港珠澳口岸考慮 B7、B8、B2、B3、B3X、A 線或 B6。
2. 計算真實門對門時間：合理估算由具體地標步行至最近車站的時間，並計入金鐘、中環、美孚等深層港鐵轉乘的步行時間。
3. 因應天氣與路況調整：落雨、暴雨、雷暴、颱風或酷熱警告時，減少長距離露天步行及渡輪，優先有瓦遮頭的路線及港鐵室內轉乘；天氣良好時可積極推薦直達巴士或渡輪。

【輸出雙方案規則】
固定輸出 2 個互補方案：
- 方案一【最推薦・最快最方便】：門對門最快、轉乘最少的最優解；如有合適的 74X、A47X、968 等直達特快，必須優先考慮。
- 方案二【備用／替代方案】：若方案一為巴士，方案二推薦港鐵或鐵路組合；若方案一為港鐵，方案二推薦純巴士或路面交通方案。方案二不應只是方案一的改寫。

【輸出格式】
只輸出有效 JSON，不要 Markdown、不要額外解釋：
{"plans":[{"title":"方案簡短標題","totalMins":42,"fare":"約 $11.1","tags":["特快直達","無需轉乘"],"tip":"實用搭車貼士","weatherNote":"因應天氣點解揀呢條路線","legs":[{"mode":"walk|bus|mtr|ferry","name":"路線名稱","from":"上車站／出發地名","to":"落車站／目的地名","mins":35,"note":"簡短說明","line":"港鐵路綫代碼（僅限港鐵）","sta":"港鐵上車站代碼（僅限港鐵）","co":"KMB 或 CTB（僅限巴士）"}]}]}

【資料及欄位規則】
- 全部文字使用香港繁體中文，語氣口語化但清晰。
- 必須比較步行、港鐵、九巴、城巴、渡輪及可行的轉乘組合；不可因偏好某一種交通工具而忽略其他可行方式。
- 只推薦在目前時間仍有機會運作的公共交通。若交通消息顯示停駛、改道、封路或服務受限，必須排除或在 note 清楚警告；不要把沒有即時班次資料當成「正常運行」。
- 以門對門總時間、等候／轉乘麻煩程度、成人八達通車資及實時服務可靠性綜合排序，tags 必須反映實際取捨；若資料不足，明確寫「未能確認實時班次」。
- totalMins 必須是包括步行、等車及轉乘的全程門對門分鐘數；fare 必須估算成人八達通全程總車資。
- legs 按實際出行次序排列，mins 為該段合理耗時；不可捏造不合理的路線、車站、票價或班次。
- mode 為 mtr 時，必須填寫正確的 line 與 sta 代碼，只可使用下列港鐵資料；mode 為 bus 時，name 必須以「巴士 <路線號>」表示，co 必須準確填寫 KMB 或 CTB，以便系統串接實時班次；mode 為 ferry 或 walk 時不要填寫 line、sta 或 co。
- 如沒有可靠的實時資料，不要聲稱有即時班次；weatherNote 必須簡短交代天氣對選線的影響。

港鐵路綫及車站代碼：
${lines}
現時實時資訊：
天氣：${w}
特別交通消息：${n || "暫無"}`;

    let res: Response;
    try {
      res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          stream: true,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            {
              role: "user",
              content: `由「${data.from}」去「${data.to}」。已先完成地理編碼：出發點 (${fromLocation.lat}, ${fromLocation.lng})，終點 (${toLocation.lat}, ${toLocation.lng})。請根據座標、現時交通消息、天氣及各交通工具的可用性推薦最適合嘅路線。現在時間：${new Date().toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" })}`,
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
      return { plans: [], error: `DeepSeek 錯誤 (${res.status})${body ? `：${body.slice(0, 120)}` : ""}` };
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
      legs: (p?.legs ?? []).slice(0, 8).map((l: any) => ({
        mode: (["mtr", "bus", "ferry", "walk"].includes(l?.mode) ? l.mode : "walk") as Leg["mode"],
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

    return { plans, weather: w, locations: { from: fromLocation, to: toLocation } };
  });
