import { createServerFn } from "@tanstack/react-start";

const Q = "https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data";
const STAT = "https://www.immd.gov.hk/opendata/hkt/transport/immigration_clearance/statistics_on_daily_passenger_traffic.csv";

type Queue = Record<string, { arrQueue: number; depQueue: number }>;
type Flow = { arr: number[]; dep: number[] }; // [居民, 內地, 其他, 總計]

let statCache: { at: number; date: string; data: Record<string, Flow> } | null = null;

async function getStats() {
  if (statCache && Date.now() - statCache.at < 3 * 3600e3) return statCache;
  const r = await fetch(STAT);
  if (!r.ok) return null;
  const lines = (await r.text()).trim().split(/\r?\n/);
  const last = lines[lines.length - 1]!.split(",")[0]!;
  const data: Record<string, Flow> = {};
  for (let i = lines.length - 1; i > 0; i--) {
    const c = lines[i]!.split(",");
    if (c[0] !== last) break;
    const f = (data[c[1]!] ??= { arr: [], dep: [] });
    const nums = c.slice(3, 7).map(Number);
    if (c[2]?.includes("入")) f.arr = nums;
    else f.dep = nums;
  }
  statCache = { at: Date.now(), date: last, data };
  return statCache;
}

export const getBorder = createServerFn({ method: "GET" }).handler(async () => {
  const [r, v, s] = await Promise.all([
    fetch(`${Q}/CPQueueTimeR.json`).then((x) => (x.ok ? (x.json() as Promise<Queue>) : null)).catch(() => null),
    fetch(`${Q}/CPQueueTimeV.json`).then((x) => (x.ok ? (x.json() as Promise<Queue>) : null)).catch(() => null),
    getStats().catch(() => null),
  ]);
  return { resident: r ?? {}, visitor: v ?? {}, statDate: s?.date ?? "", stats: s?.data ?? {}, at: new Date().toISOString() };
});
