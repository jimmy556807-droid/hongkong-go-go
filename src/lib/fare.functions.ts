import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type MtrFare = {
  octAdult: number;
  octStudent: number;
  octChild: number;
  octElder: number;
  single: number;
  singleChild: number;
};

let mtrCache: Promise<{ ids: Map<string, string>; fares: Map<string, MtrFare> }> | null = null;

function csv(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "")));
}

function loadMtr() {
  if (!mtrCache) {
    mtrCache = (async () => {
      const [a, b] = await Promise.all([
        fetch("https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv").then((r) => r.text()),
        fetch("https://opendata.mtr.com.hk/data/mtr_lines_fares.csv").then((r) => r.text()),
      ]);
      const ids = new Map<string, string>();
      for (const r of csv(a).slice(1)) if (r[2] && r[3]) ids.set(r[2], r[3]);
      const fares = new Map<string, MtrFare>();
      for (const r of csv(b).slice(1)) {
        fares.set(`${r[1]}-${r[3]}`, {
          octAdult: +r[4]!,
          octStudent: +r[5]!,
          octElder: +r[9]!,
          octChild: +r[8]!,
          single: +r[7]!,
          singleChild: +r[11]!,
        });
      }
      return { ids, fares };
    })().catch((e) => {
      mtrCache = null;
      throw e;
    });
  }
  return mtrCache;
}

export const getMtrFare = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ from: z.string().max(5), to: z.string().max(5) }).parse(d),
  )
  .handler(async ({ data }): Promise<MtrFare | null> => {
    const { ids, fares } = await loadMtr();
    const a = ids.get(data.from),
      b = ids.get(data.to);
    return (a && b && fares.get(`${a}-${b}`)) || null;
  });

let busCache: { at: number; p: Promise<Record<string, any>> } | null = null;
function loadBus() {
  if (!busCache || Date.now() - busCache.at > 6 * 3600e3) {
    const p = fetch("https://data.hkbus.app/routeFareList.min.json")
      .then((r) => r.json())
      .then((x: any) => x.routeList as Record<string, any>);
    p.catch(() => {
      busCache = null;
    });
    busCache = { at: Date.now(), p };
  }
  return busCache.p;
}

export const getBusFare = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        route: z.string().max(6),
        co: z.enum(["KMB", "CTB"]),
        dir: z.enum(["outbound", "inbound"]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ fares: number[]; holiday: number[] | null } | null> => {
    const list = await loadBus();
    const co = data.co.toLowerCase();
    const b = data.dir === "outbound" ? "O" : "I";
    const hits = Object.entries(list).filter(
      ([k, v]) =>
        k.split("+")[0] === data.route.toUpperCase() &&
        v.co?.includes(co) &&
        String(v.bound?.[co] ?? "").includes(b) &&
        v.fares,
    );
    const hit = hits.find(([k]) => k.split("+")[1] === "1") ?? hits[0];
    if (!hit) return null;
    return { fares: hit[1].fares.map(Number), holiday: hit[1].faresHoliday?.map(Number) ?? null };
  });
