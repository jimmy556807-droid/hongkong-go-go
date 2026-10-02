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
};

const Input = z
  .object({
    from: z.string().trim().min(1).max(60),
    to: z.string().trim().min(1).max(60),
    prefs: z.array(z.string().trim().max(20)).max(6),
  })
  .superRefine((value, ctx) => {
    const stationNames = new Set(Object.values(STATIONS));
    const stationCodes = new Set(Object.keys(STATIONS));
    for (const [field, input] of [
      ["from", value.from],
      ["to", value.to],
    ] as const) {
      if (!stationNames.has(input) && !stationCodes.has(input)) {
        ctx.addIssue({ code: "custom", path: [field], message: "請選擇有效的車站" });
      }
    }
  });

const safeText = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[<>`]/g, "").trim().slice(0, max) : "";
const safeMinutes = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(240, Math.max(0, Math.round(number))) : 0;
};

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

async function weather() {
  try {
    const r = await fetch(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?lang=tc&dataType=rhrread",
    );
    const x: any = await r.json();
    const t = x?.temperature?.data?.[0];
    return `氣溫約 ${t?.value ?? "--"}°C，濕度 ${x?.humidity?.data?.[0]?.value ?? "--"}%`;
  } catch {
    return "";
  }
}

export const planTrip = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ plans: Plan[]; error?: string }> => {
    const key = process.env["DEEPSEEK_API_KEY"];
    if (!key) return { plans: [], error: "未設定 DeepSeek 金鑰，請先在設定加入。" };

    const [n, w] = await Promise.all([news(), weather()]);
    const lines = LINES.map(
      (l) => `${l.name}(${l.code}): ${l.stations.map((s) => `${STATIONS[s]}=${s}`).join(" ")}`,
    ).join("\n");

    const sys = `你是香港交通路線規劃專家，熟悉港鐵、九巴、城巴、渡輪及小巴。
只輸出 JSON，格式：
{"plans":[{"title":"方案名稱","totalMins":35,"fare":"約 $12.5","tags":["最快","一次轉乘"],"tip":"一句實用提示","legs":[{"mode":"mtr|bus|ferry|walk","name":"荃灣綫 / 巴士 1A / 步行","from":"起點站名","to":"落車站名","mins":12,"note":"簡短說明","line":"TWL","sta":"CEN","co":"KMB"}]}]}
規則：
- 只提供 1 個方案：喺所有可行路線入面，揀條又平又快嘅（時間同車費都合理最低），唔好列備用方案。
- mode 為 mtr 時，必須填上 line（路綫代碼）同 sta（上車站代碼），只可用下列代碼。
- mode 為 bus 時，name 用「巴士 <路線號>」，co 填 KMB 或 CTB。
- 全部文字用香港繁體中文口語書面語。
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
              content: `由「${data.from}」去「${data.to}」。偏好：${data.prefs.join("、") || "無特別偏好"}。現在時間：${new Date().toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" })}`,
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

    const plans: Plan[] = (Array.isArray(parsed?.plans) ? parsed.plans : [])
      .slice(0, 1)
      .map((p: any) => ({
        title: safeText(p?.title, 80) || "建議路線",
        totalMins: safeMinutes(p?.totalMins),
        fare: safeText(p?.fare, 40),
        tags: (Array.isArray(p?.tags) ? p.tags : [])
          .slice(0, 3)
          .map((tag: unknown) => safeText(tag, 24))
          .filter(Boolean),
        tip: safeText(p?.tip, 160),
        legs: (Array.isArray(p?.legs) ? p.legs : []).slice(0, 8).map((l: any) => ({
          mode: (["mtr", "bus", "ferry", "walk"].includes(l?.mode)
            ? l.mode
            : "walk") as Leg["mode"],
          name: safeText(l?.name, 60),
          from: safeText(l?.from, 60),
          to: safeText(l?.to, 60),
          mins: safeMinutes(l?.mins),
          note: safeText(l?.note, 120),
          line: l?.line ? safeText(l.line, 12) : undefined,
          sta: l?.sta ? safeText(l.sta, 12) : undefined,
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

    return { plans };
  });
