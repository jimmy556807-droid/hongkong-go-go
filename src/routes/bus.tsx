import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Search, Clock, MapPin, X, Bus } from "lucide-react";
import {
  getBus,
  getBusRoutes,
  getNearbyRoutes,
  getNearbyGmbRoutes,
  getStopEta,
  getGmbRoutes,
  getGmbEta,
  getGmbDetail,
} from "@/lib/hk.functions";
import { getBusFare } from "@/lib/fare.functions";
import { Wallet } from "lucide-react";
import { MiniMapNavigation } from "@/components/MiniMapNavigation";

function BusStopFare({
  route,
  co,
  dir,
  idx,
}: {
  route: string;
  co: "KMB" | "CTB" | "NLB";
  dir: "outbound" | "inbound";
  idx: number;
}) {
  const fn = useServerFn(getBusFare);
  const q = useQuery({
    queryKey: ["busFare", route, co, dir],
    queryFn: () => fn({ data: { route, co, dir } }),
    staleTime: 3600000,
    enabled: !!route,
  });
  const fare = q.data?.fares?.[Math.min(idx, (q.data?.fares.length ?? 1) - 1)];

  if (q.isLoading) return <span className="text-[11px] text-muted-foreground">車資…</span>;
  if (fare == null) return null;
  return <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">${fare.toFixed(1)}</span>;
}

function BusFareBox({
  route,
  co,
  dir,
  idx,
  name,
}: {
  route: string;
  co: "KMB" | "CTB" | "NLB";
  dir: "outbound" | "inbound";
  idx: number | null;
  name?: string | undefined;
}) {
  const fn = useServerFn(getBusFare);
  const q = useQuery({
    queryKey: ["busFare", route, co, dir],
    queryFn: () => fn({ data: { route, co, dir } }),
    staleTime: 3600000,
    enabled: !!route,
  });
  const f = q.data;
  const pick = (a: number[] | null | undefined) =>
    a && a.length ? a[Math.min(idx ?? 0, a.length - 1)] : undefined;
  const full = f ? Math.max(...f.fares) : undefined;
  const cur = pick(f?.fares),
    hol = pick(f?.holiday);
  return (
    <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Wallet size={16} className="text-primary" />
        車資詳情
      </p>
      {q.isLoading && <p className="mt-1 text-muted-foreground">載入中…</p>}
      {(q.isError || q.data === null) && (
        <p className="mt-1 text-muted-foreground">暫無此路線車資資料</p>
      )}
      {f && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
            <span className="text-muted-foreground">全程成人</span>
            <b>${full?.toFixed(1)}</b>
          </div>
          <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
            <span className="text-muted-foreground">
              {idx != null ? `${name ?? "此站"}上車` : "分段收費"}
            </span>
            <b>
              {idx != null ? `$${cur?.toFixed(1)}` : f.fares.some((x) => x !== full) ? "有" : "無"}
            </b>
          </div>
          {cur != null && (
            <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
              <span className="text-muted-foreground">小童 / 長者（約半價）</span>
              <b>${(cur / 2).toFixed(1)}</b>
            </div>
          )}
          <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
            <span className="text-muted-foreground">$2 優惠（65 歲以上）</span>
            <b>{(cur ?? 0) > 2 ? "$2.0" : `$${cur?.toFixed(1)}`}</b>
          </div>
          {hol != null && hol !== cur && (
            <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
              <span className="text-muted-foreground">假日車資</span>
              <b>${hol.toFixed(1)}</b>
            </div>
          )}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        撳「起點」可查分段車資；小童 / 長者車資為估算，以車上公布為準。
      </p>
    </div>
  );
}
function NlbFareBox({ stops, fromSeq }: { stops: Array<{ seq: number; name: string; fare?: number | null }>; fromSeq: number | null }) {
  const fares = stops.map((s) => s.fare).filter((f): f is number => f != null);
  if (!fares.length) return null;
  const full = Math.max(...fares);
  const fromStop = fromSeq != null ? stops.find((s) => s.seq === fromSeq) : null;
  const fromFare = fromStop?.fare ?? null;
  const hasSectional = fares.some((f) => f !== full);
  return (
    <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Wallet size={16} className="text-sky-600" />
        車資詳情
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">全程成人</span>
          <b>${full.toFixed(1)}</b>
        </div>
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">{fromFare != null ? `${fromStop?.name ?? "此站"}上車` : "分段收費"}</span>
          <b>{fromFare != null ? `${fromFare.toFixed(1)}` : hasSectional ? "有" : "無"}</b>
        </div>
        {fromFare != null && (
          <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
            <span className="text-muted-foreground">小童 / 長者（約半價）</span>
            <b>${(fromFare / 2).toFixed(1)}</b>
          </div>
        )}
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">$2 優惠（65 歲以上）</span>
          <b>{(fromFare ?? full) > 2 ? "$2.0" : `${(fromFare ?? full).toFixed(1)}`}</b>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        撳「起點」可查分段車資；小童 / 長者車資為估算，以車上公布為準。
      </p>
    </div>
  );
}

import { PageHeader, Countdown, useNow, useCurrentLocation } from "@/components/BottomNav";

export const Route = createFileRoute("/bus")({
  head: () => ({
    meta: [
      { title: "巴士到站時間 — 港行" },
      { name: "description", content: "搜尋九巴路線，查看站點詳情、到站倒數及預計行程時間。" },
      { property: "og:title", content: "巴士到站時間 — 港行" },
      {
        property: "og:description",
        content: "搜尋九巴路線，查看站點詳情、到站倒數及預計行程時間。",
      },
    ],
  }),
  component: BusPage,
});

const MIN_PER_STOP = 2.2;

type BusEtaStop = { seq: number; etas: string[] };
type BusTrackerPosition = {
  slot: number;
  segmentIndex: number;
  nextArrivalAt: number;
  observedAt: number;
};

const BUS_TRACKER_MAX_LEG_MINUTES = 8;
const BUS_TRACKER_STALE_MS = 45_000;

function etaMinutes(eta: string, now: number) {
  const arrivalAt = new Date(eta).getTime();
  return Number.isFinite(arrivalAt) ? (arrivalAt - now) / 60000 : null;
}

function inferTerminalWaitMinutes(stops: BusEtaStop[], now: number) {
  const origin = stops[0];
  if (!origin || origin.etas.length < 2) return null;

  const arrivalMinutes = origin.etas
    .map((eta) => etaMinutes(eta, now))
    .filter((minutes): minutes is number => minutes != null && minutes > 0)
    .sort((a, b) => a - b);
  if (arrivalMinutes.length < 2) return null;

  const headways = arrivalMinutes
    .slice(1)
    .map((minutes, index) => minutes - arrivalMinutes[index]!)
    .filter((minutes) => minutes > 1);
  if (!headways.length) return null;

  const regularHeadway = [...headways].sort((a, b) => a - b)[Math.floor(headways.length / 2)]!;
  return arrivalMinutes[0]! > regularHeadway ? Math.ceil(arrivalMinutes[0]!) : null;
}

function inferBusPositions(stops: BusEtaStop[], now: number): BusTrackerPosition[] {
  const positions: BusTrackerPosition[] = [];

  for (let segmentIndex = 0; segmentIndex < stops.length - 1; segmentIndex += 1) {
    const current = stops[segmentIndex]!;
    const next = stops[segmentIndex + 1]!;
    const slots = Math.max(current.etas.length, next.etas.length);

    for (let slot = 0; slot < slots; slot += 1) {
      const currentEta = current.etas[slot];
      const nextEta = next.etas[slot];
      if (!nextEta) continue;

      const currentMinutes = currentEta ? etaMinutes(currentEta, now) : null;
      const nextMinutes = etaMinutes(nextEta, now);
      if (nextMinutes == null) continue;

      const hasJustLeft =
        currentMinutes != null &&
        currentMinutes >= -1 &&
        currentMinutes <= 1 &&
        nextMinutes > currentMinutes &&
        nextMinutes <= BUS_TRACKER_MAX_LEG_MINUTES &&
        nextMinutes - currentMinutes >= 1;
      const isNearNextStop =
        current.etas.length === 0 && slot === 0 && nextMinutes >= 0 && nextMinutes <= 2;

      if (hasJustLeft || isNearNextStop) {
        positions.push({
          slot,
          segmentIndex,
          nextArrivalAt: new Date(nextEta).getTime(),
          observedAt: now,
        });
      }
    }
  }

  return positions;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(lat2 - lat1);
  const lngDelta = radians(lng2 - lng1);
  const arc =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(lngDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function routeMatchRank(route: string, orig: string, dest: string, term: string) {
  const normalizedRoute = route.toUpperCase();
  if (normalizedRoute === term) return 0;
  if (normalizedRoute.startsWith(term)) return 1;
  if (dest.toUpperCase().includes(term)) return 2;
  if (orig.toUpperCase().includes(term)) return 3;
  return -1;
}

function compareRouteFamily(a: string, b: string) {
  const aDigits = a.match(/^\d+/)?.[0] ?? "";
  const bDigits = b.match(/^\d+/)?.[0] ?? "";
  const digitLengthOrder = aDigits.length - bDigits.length;
  if (digitLengthOrder) return digitLengthOrder;

  const numberOrder = Number(aDigits || 0) - Number(bDigits || 0);
  if (numberOrder) return numberOrder;

  const suffixOrder: Record<string, number> = { "": -1, A: 0, M: 1, K: 2, X: 3, N: 4 };
  const aSuffix = a.slice(aDigits.length).toUpperCase();
  const bSuffix = b.slice(bDigits.length).toUpperCase();
  const suffixOrderDifference = (suffixOrder[aSuffix] ?? 5) - (suffixOrder[bSuffix] ?? 5);
  return suffixOrderDifference || a.localeCompare(b, "en", { numeric: true });
}

function nearbyEtaMinutes(eta: string | number, now: number) {
  return typeof eta === "number" ? eta : etaMinutes(eta, now);
}

function GmbPanel({ searchQuery = "" }: { searchQuery?: string }) {
  const routesFn = useServerFn(getGmbRoutes);
  const etaFn = useServerFn(getGmbEta);
  const [query, setQuery] = useState(searchQuery);
  const [selected, setSelected] = useState<GmbRoute | null>(null);
  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);
  const routes = useQuery({ queryKey: ["gmb-routes"], queryFn: routesFn, staleTime: 3600e3 });
  const eta = useQuery({
    queryKey: ["gmb-eta", selected?.id],
    queryFn: () => etaFn({ data: { routeId: selected!.id, routeSeq: 1 } }),
    enabled: !!selected,
    refetchInterval: 60000,
  });
  const filtered = (routes.data ?? [])
    .filter((r) => `${r.name} ${r.start} ${r.end}`.includes(query.trim()))
    .slice(0, 12);
  return (
    <section className="mx-5 mt-6" aria-labelledby="gmb-title">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            專綫小巴
          </p>
          <h2 id="gmb-title" className="text-xl font-bold">
            小巴實時到站
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
          GMB
        </span>
      </div>
      {!selected ? (
        <div className="rounded-2xl border bg-card p-3 shadow-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋小巴路綫或地點"
            aria-label="搜尋專綫小巴"
            className="w-full rounded-xl border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30"
          />
          {routes.isLoading && <p className="p-3 text-sm text-muted-foreground">載入小巴路綫中…</p>}
          {routes.isError && <p className="p-3 text-sm text-destructive">未能載入專綫小巴資料</p>}
          <div className="mt-2 divide-y">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="flex w-full items-center gap-3 px-2 py-3 text-left transition hover:bg-muted/60"
              >
                <b className="w-14 text-amber-700">{r.name}</b>
                <span className="min-w-0 flex-1 text-sm">
                  {r.start} → {r.end}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    全程 ${r.fare.toFixed(1)} · 約 {r.journeyTime} 分鐘
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">查看到站</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <button onClick={() => setSelected(null)} className="text-sm text-primary underline">
            ← 返回小巴路綫
          </button>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold text-amber-700">{selected.name}</p>
              <p className="mt-1 text-sm">
                {selected.start} → {selected.end}
              </p>
            </div>
            <b className="rounded-lg bg-amber-100 px-2 py-1 text-sm text-amber-800">
              ${selected.fare.toFixed(1)}
            </b>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            全程收費 · 預計 {selected.journeyTime} 分鐘 · 每分鐘更新
          </p>
          {eta.isLoading && <p className="mt-4 text-sm text-muted-foreground">載入實時到站中…</p>}
          {eta.isError && (
            <p className="mt-4 text-sm text-destructive">此路綫暫未提供實時到站資料</p>
          )}
          <ol className="mt-3 divide-y">
            {eta.data?.map((s) => (
              <li key={s.seq} className="flex items-center gap-3 py-2.5">
                <span className="w-6 text-xs text-muted-foreground">{s.seq}</span>
                <span className="flex-1 text-sm">{s.name}</span>
                <span className="text-right text-xs">
                  {s.etas.length ? (
                    s.etas.map((e, i) => (
                      <b key={i} className="ml-2 text-amber-700">
                        {e.diff != null ? `${e.diff} 分鐘` : e.timestamp?.slice(11, 16)}
                      </b>
                    ))
                  ) : (
                    <span className="text-muted-foreground">暫無班次</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

type GmbRoute = {
  id: string;
  name: string;
  district: string;
  start: string;
  end: string;
  fare: number;
  journeyTime: number;
  serviceMode: string;
  detailUrl: string;
};

function BusPage() {
  const [input, setInput] = useState("");
  const [route, setRoute] = useState<string | null>(null);
  const [co, setCo] = useState<"KMB" | "CTB" | "NLB">("KMB");
  const [activeCo, setActiveCo] = useState<"KMB" | "CTB" | "NLB" | "GMB">("KMB");
  const [dir, setDir] = useState<"outbound" | "inbound">("outbound");
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [stop, setStop] = useState<{ id: string; name: string; co: "KMB" | "CTB" | "NLB"; lat?: number | null; lng?: number | null; fare?: number | null } | null>(null);
  const [gmb, setGmb] = useState<{ id: string; dest?: string } | null>(null);
  const { position: pos, status: locationStatus } = useCurrentLocation();
  const now = useNow();
  const fn = useServerFn(getBus);
  const routesFn = useServerFn(getBusRoutes);
  const gmbRoutesFn = useServerFn(getGmbRoutes);
  const nearFn = useServerFn(getNearbyRoutes);
  const routes = useQuery({ queryKey: ["busRoutes"], queryFn: routesFn, staleTime: 86400000 });
  const gmbRoutes = useQuery({ queryKey: ["gmb-routes"], queryFn: gmbRoutesFn, staleTime: 3600e3 });
  const gmbNearFn = useServerFn(getNearbyGmbRoutes);
  const nearby = useQuery({
    queryKey: ["nearbyRoutes", pos?.lat, pos?.lng],
    queryFn: () => nearFn({ data: pos! }),
    enabled: !!pos && !route,
    refetchInterval: 30000,
  });
  const nearbyGmb = useQuery({
    queryKey: ["nearbyGmbRoutes", pos?.lat, pos?.lng],
    queryFn: () => gmbNearFn({ data: pos! }),
    enabled: !!pos && !route,
    refetchInterval: 60000,
  });
  const sortedNearbyRoutes = useMemo(() => {
    const candidates = (nearby.data ?? [])
      .filter((item) => item.co === activeCo)
      .map((item) => {
        const arrivals = item.etas
          .map((eta) => etaMinutes(eta, now))
          .filter((minutes): minutes is number => minutes != null && minutes >= -1);
        const nextArrival = arrivals.length ? Math.min(...arrivals) : null;
        const walkMins = Math.ceil(item.dist / 75);
        const priority = nextArrival == null ? 2 : nextArrival >= walkMins ? 0 : 1;
        return { ...item, nextArrival, priority };
      })
      .sort(
        (a, b) =>
          a.priority - b.priority ||
          (a.priority === 0
            ? (a.nextArrival ?? Number.POSITIVE_INFINITY) -
              (b.nextArrival ?? Number.POSITIVE_INFINITY)
            : a.dist - b.dist) ||
          a.route.localeCompare(b.route, "en", { numeric: true }),
      );

    const seenRoutes = new Set<string>();
    return candidates.filter((item) => {
      const key = `${item.co}:${item.route}`;
      if (seenRoutes.has(key)) return false;
      seenRoutes.add(key);
      return true;
    });
  }, [nearby.data, activeCo, now]);
  const sortedNearbyGmbRoutes = useMemo(() => {
    const candidates = (nearbyGmb.data ?? [])
      .map((item) => {
        const arrivals = item.etas
          .map((eta) => nearbyEtaMinutes(eta, now))
          .filter((minutes): minutes is number => minutes != null && minutes >= -1);
        const nextArrival = arrivals.length ? Math.min(...arrivals) : null;
        const walkMins = Math.ceil(item.dist / 75);
        const priority = nextArrival == null ? 2 : nextArrival >= walkMins ? 0 : 1;
        return { ...item, nextArrival, priority };
      })
      .sort(
        (a, b) =>
          a.priority - b.priority ||
          (a.priority === 0
            ? (a.nextArrival ?? Number.POSITIVE_INFINITY) -
              (b.nextArrival ?? Number.POSITIVE_INFINITY)
            : a.dist - b.dist) ||
          a.route.localeCompare(b.route, "en", { numeric: true }),
      );

    const seenRoutes = new Set<string>();
    return candidates.filter((item) => {
      if (seenRoutes.has(item.route)) return false;
      seenRoutes.add(item.route);
      return true;
    });
  }, [nearbyGmb.data, now]);
  const q = useQuery({
    queryKey: ["bus", co, route, dir],
    queryFn: () => fn({ data: { route: route!, dir, co } }),
    refetchInterval: 30000,
    enabled: !!route,
  });

  useEffect(() => {
    if (route && dir === "inbound" && q.isSuccess && q.data.stops.length === 0) {
      setDir("outbound");
      setFrom(null);
      setTo(null);
    }
  }, [route, dir, q.data, q.isSuccess]);

  const matches = useMemo(() => {
    const term = input.trim().toUpperCase();
    if (!term) return [];

    const scoredBuses = (routes.data ?? [])
      .map((route) => ({ route, rank: routeMatchRank(route.route, route.orig, route.dest, term) }))
      .filter((item) => item.rank >= 0);
    const busesByCompany = (company: string, count: number) =>
      scoredBuses
        .filter((item) => item.route.co === company)
        .sort((a, b) => a.rank - b.rank || compareRouteFamily(a.route.route, b.route.route))
        .slice(0, count);
    const busMatches = [
      ...busesByCompany("KMB", 14),
      ...busesByCompany("CTB", 14),
      ...busesByCompany("NLB", 14),
    ].map((item) => ({
      type: "bus" as const,
      route: item.route,
      routeName: item.route.route,
      company: item.route.co,
      rank: item.rank,
    }));
    const gmbMatches = (gmbRoutes.data ?? [])
      .map((route) => ({ route, rank: routeMatchRank(route.name, route.start, route.end, term) }))
      .filter((item) => item.rank >= 0)
      .sort((a, b) => a.rank - b.rank || compareRouteFamily(a.route.name, b.route.name))
      .slice(0, 10)
      .map((item) => ({
        type: "gmb" as const,
        route: item.route,
        routeName: item.route.name,
        company: "GMB" as const,
        rank: item.rank,
      }));

    return [...busMatches, ...gmbMatches]
      .sort((a, b) => {
        const rankOrder = a.rank - b.rank;
        if (rankOrder) return rankOrder;

        if (a.rank <= 1) {
          const familyOrder = compareRouteFamily(a.routeName, b.routeName);
          if (familyOrder) return familyOrder;
          if (a.type !== b.type) return a.type === "bus" ? -1 : 1;
        }

        const companyOrder = Number(a.company !== activeCo) - Number(b.company !== activeCo);
        return companyOrder || compareRouteFamily(a.routeName, b.routeName);
      })
      .map(({ rank: _rank, routeName: _routeName, company: _company, ...match }) => match);
  }, [input, routes.data, gmbRoutes.data, activeCo]);

  const pick = (r: string, d: "outbound" | "inbound", c: "KMB" | "CTB" | "NLB") => {
    setRoute(r);
    setDir(d);
    setCo(c);
    setInput("");
    setFrom(null);
    setTo(null);
  };
  const stops = useMemo(() => q.data?.stops ?? [], [q.data?.stops]);
  const nearestStop = useMemo(() => {
    if (!pos || !stops.length) return null;

    let nearest: (typeof stops)[number] | null = null;
    let shortestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of stops) {
      const lat = "lat" in candidate && typeof candidate.lat === "number" ? candidate.lat : null;
      const lng = "lng" in candidate && typeof candidate.lng === "number" ? candidate.lng : null;
      if (lat == null || lng == null) continue;

      const distance = distanceMeters(pos.lat, pos.lng, lat, lng);
      if (distance < shortestDistance) {
        nearest = candidate;
        shortestDistance = distance;
      }
    }
    return nearest;
  }, [pos, stops]);
  const nearestStopRef = useRef<HTMLLIElement | null>(null);
  const nearestStopSeq = nearestStop?.seq;

  useEffect(() => {
    if (!route || q.data?.route !== route || q.data.co !== co || nearestStopSeq == null) return;
    nearestStopRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [route, dir, co, q.data?.route, q.data?.co, nearestStopSeq]);

  const trackerKey = route ? `${co}:${route}:${dir}` : "";
  const canInferBusPositions = Boolean(
    route && q.data?.route === route && q.data.co === co && !q.isFetching,
  );
  const [trackerSnapshot, setTrackerSnapshot] = useState<{
    key: string;
    positions: BusTrackerPosition[];
  }>({ key: "", positions: [] });
  const [activeTrackerTooltip, setActiveTrackerTooltip] = useState<string | null>(null);

  useEffect(() => {
    if (!canInferBusPositions || !trackerKey) return;

    const observedAt = Date.now();
    const candidates = inferBusPositions(stops, observedAt);
    setTrackerSnapshot((previous) => {
      const previousPositions = previous.key === trackerKey ? previous.positions : [];
      const previousBySlot = new Map(
        previousPositions.map((position) => [position.slot, position]),
      );
      const nextPositions: BusTrackerPosition[] = [];
      const seenSlots = new Set<number>();

      for (const candidate of candidates) {
        if (seenSlots.has(candidate.slot)) continue;
        seenSlots.add(candidate.slot);

        const previousPosition = previousBySlot.get(candidate.slot);
        if (
          previousPosition &&
          candidate.segmentIndex < previousPosition.segmentIndex &&
          observedAt - previousPosition.observedAt < BUS_TRACKER_STALE_MS
        ) {
          nextPositions.push(previousPosition);
        } else {
          nextPositions.push(candidate);
        }
      }

      for (const previousPosition of previousPositions) {
        if (
          !seenSlots.has(previousPosition.slot) &&
          observedAt - previousPosition.observedAt < BUS_TRACKER_STALE_MS
        ) {
          nextPositions.push(previousPosition);
        }
      }

      return { key: trackerKey, positions: nextPositions };
    });
  }, [canInferBusPositions, q.dataUpdatedAt, route, stops, trackerKey]);

  const trackedBuses = useMemo(
    () =>
      trackerSnapshot.key === trackerKey
        ? trackerSnapshot.positions.filter(
            (position) => now - position.observedAt < BUS_TRACKER_STALE_MS,
          )
        : [],
    [now, trackerKey, trackerSnapshot],
  );
  const terminalWaitMinutes =
    canInferBusPositions && !trackedBuses.some((bus) => bus.segmentIndex === 0)
      ? inferTerminalWaitMinutes(stops, now)
      : null;
  const busesBySegment = useMemo(() => {
    const grouped = new Map<number, BusTrackerPosition[]>();
    for (const bus of trackedBuses) {
      const segment = grouped.get(bus.segmentIndex) ?? [];
      segment.push(bus);
      grouped.set(bus.segmentIndex, segment);
    }
    return grouped;
  }, [trackedBuses]);

  const trip =
    from != null && to != null && to > from
      ? (() => {
          const a = stops.find((s) => s.seq === from),
            b = stops.find((s) => s.seq === to);
          const n = to - from;
          const wait = a?.etas[0]
            ? Math.max(0, (new Date(a.etas[0]).getTime() - now) / 60000)
            : null;
          const ride = Math.round(n * MIN_PER_STOP);
          return {
            a,
            b,
            n,
            ride,
            wait,
            arrive: wait != null ? new Date(now + (wait + ride) * 60000) : null,
          };
        })()
      : null;

  return (
    <div>
      <PageHeader title="巴士"/>
      <div className="relative mx-5">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border bg-card px-3">
            <Search size={18} className="text-muted-foreground" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
  placeholder="搜尋九巴、城巴、大嶼山巴士或目的地"
  aria-label="搜尋九巴、城巴、大嶼山巴士或專綫小巴路線"
  className="w-full bg-transparent py-3 outline-none"
            />
          </div>
        </div>
        {matches.length > 0 && (
          <ul className="absolute inset-x-0 z-20 mt-1 max-h-80 overflow-auto rounded-xl border bg-card shadow-lg">
            {matches.map((match) =>
              match.type === "bus" ? (
                <li key={match.route.co + match.route.route + match.route.dir}>
                  <button
                    onClick={() => pick(match.route.route, match.route.dir, match.route.co)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted"
                  >
                    <b className="w-12 text-primary">{match.route.route}</b>
                    <CoTag co={match.route.co} />
                    <span className="text-sm">
                      {match.route.orig} → {match.route.dest}
                    </span>
                  </button>
                </li>
              ) : (
                <li key={`GMB-${match.route.id}`}>
                  <button
                    onClick={() => {
                      setInput("");
                      setGmb({ id: match.route.id });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted"
                  >
                    <b className="w-12 text-amber-700">{match.route.name}</b>
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                      專綫小巴
                    </span>
                    <span className="text-sm">
                      {match.route.start} → {match.route.end}
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {!route && (
        <div className="mx-5 mt-4">
          <div
            className="mt-3 grid grid-cols-4 rounded-xl bg-muted p-1"
            role="tablist"
            aria-label="巴士公司"
          >
            <button
              role="tab"
              aria-selected={activeCo === "KMB"}
              onClick={() => setActiveCo("KMB")}
              className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${activeCo === "KMB" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              九巴
            </button>
            <button
              role="tab"
              aria-selected={activeCo === "CTB"}
              onClick={() => setActiveCo("CTB")}
              className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${activeCo === "CTB" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              城巴
            </button>
            <button
              role="tab"
              aria-selected={activeCo === "NLB"}
              onClick={() => setActiveCo("NLB")}
              className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${activeCo === "NLB" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              嶼巴
            </button>
            <button
              role="tab"
              aria-selected={activeCo === "GMB"}
              onClick={() => setActiveCo("GMB")}
              className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${activeCo === "GMB" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              專綫小巴
            </button>
          </div>
          {activeCo === "NLB" && !input && (
            <div className="mt-3 rounded-2xl border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">熱門嶼巴路線</p>
                <span className="text-xs text-muted-foreground">官方路線資料</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(routes.data ?? [])
                  .filter((r) => r.co === "NLB")
                  .filter((r, i, all) => all.findIndex((x) => x.route === r.route) === i)
                  .sort((a, b) => {
                    const popular = ["11", "23", "37M", "38", "B4", "B6", "1R"];
                    return (popular.indexOf(a.route) < 0 ? 99 : popular.indexOf(a.route)) - (popular.indexOf(b.route) < 0 ? 99 : popular.indexOf(b.route));
                  })
                  .slice(0, 8)
                  .map((r) => (
                    <button
                      key={r.route}
                      type="button"
                      onClick={() => pick(r.route, r.dir, "NLB")}
                      className="rounded-xl border px-3 py-2 text-left transition hover:bg-muted/60"
                    >
                      <b className="text-sky-700">{r.route}</b>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">往 {r.dest}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
          {!pos && (
            <p className="mt-2 text-sm text-muted-foreground">
              正在取得你嘅位置…如未能定位，請用上面搜尋路線。
            </p>
          )}
          {pos && (nearby.isLoading || nearbyGmb.isLoading) && (
            <p className="mt-2 text-sm text-muted-foreground">搵緊附近九巴、城巴及專綫小巴路線…</p>
          )}
          {pos &&
            !nearby.isLoading &&
            !nearbyGmb.isLoading &&
            !nearby.data?.length &&
            !nearbyGmb.data?.length && (
              <p className="mt-2 text-sm text-muted-foreground">附近 800 米內搵唔到巴士路線</p>
            )}
          {!!(nearby.data?.length || nearbyGmb.data?.length) && (
            <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-2 border-b px-4 py-3 text-xs text-muted-foreground">
                <span>
                  <i className="mr-1 inline-block size-2 rounded-full bg-destructive" />
                  九巴
                </span>
                <span>
                  <i className="mr-1 inline-block size-2 rounded-full bg-accent-foreground" />
                  城巴
                </span>
                <span>
                  <i className="mr-1 inline-block size-2 rounded-full bg-sky-500" />
                  嶼巴
                </span>
                <span>
                  <i className="mr-1 inline-block size-2 rounded-full bg-amber-500" />
                  專綫小巴
                </span>
                <span className="ml-auto">每 60 秒更新</span>
              </div>
              <div className="divide-y">
                {activeCo !== "GMB" &&
                  sortedNearbyRoutes.map((r) => (
                      <button
                        key={r.co + r.route + r.dir}
                        onClick={() => pick(r.route, r.dir, r.co)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60"
                      >
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${r.co === "KMB" ? "bg-destructive/15 text-destructive" : "bg-accent text-accent-foreground"}`}
                        >
                          {r.co === "KMB" ? "九巴" : "城巴"}
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          <b className="mr-2 text-base">{r.route}</b>往 {r.dest}
                          <span className="block text-xs text-muted-foreground">
                            <MapPin size={10} className="mr-0.5 inline" />
                            {r.stopName} ·{" "}
                            {r.dist < 1000
                              ? `${Math.round(r.dist)} 米`
                              : `${(r.dist / 1000).toFixed(1)} 公里`}
                          </span>
                        </span>
                        <span className="flex gap-1.5 text-sm">
                          {r.etas.length ? (
                            r.etas
                              .slice(0, 2)
                              .map((e, i) => (
                                <Countdown
                                  key={i}
                                  at={
                                    typeof e === "number"
                                      ? new Date(now + e * 60000).toISOString()
                                      : e
                                  }
                                  now={now}
                                />
                              ))
                          ) : (
                            <span className="text-xs text-muted-foreground">暫無班次</span>
                          )}
                        </span>
                      </button>
                    ))}
                {activeCo === "GMB" &&
                  sortedNearbyGmbRoutes.map((r) => (
                    <button
                      key={`GMB${r.routeId}${r.dest}`}
                      onClick={() => setGmb({ id: r.routeId, dest: r.dest })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xs font-bold text-amber-800">
                        小巴
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <b className="mr-2 text-base">{r.route}</b>往 {r.dest}
                        <span className="block text-xs text-muted-foreground">
                          <MapPin size={10} className="mr-0.5 inline" />
                          {r.stopName} ·{" "}
                          {r.dist < 1000
                            ? `${Math.round(r.dist)} 米`
                            : `${(r.dist / 1000).toFixed(1)} 公里`}
                        </span>
                      </span>
                      <span className="flex gap-1.5 text-sm">
                        {r.etas.length ? (
                          r.etas
                            .slice(0, 2)
                            .map((e, i) =>
                              typeof e === "number" ? (
                                <b key={i}>{e <= 1 ? "即將到站" : `${e} 分鐘`}</b>
                              ) : (
                                <span key={i}>
                                  {new Date(e).toLocaleTimeString("zh-HK", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              ),
                            )
                        ) : (
                          <span className="text-xs text-muted-foreground">暫無班次</span>
                        )}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {route && (
        <button
          onClick={() => {
            setRoute(null);
            setDir("outbound");
            setFrom(null);
            setTo(null);
          }}
          className="mx-5 mt-3 text-sm text-primary underline"
        >
          ← 返回
        </button>
      )}

      {q.data?.dest && (
        <div className="mx-5 mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <p className="min-w-0">
            <b className="mr-2 text-lg text-foreground">{q.data.route}</b>
            <CoTag co={co} /> {"orig" in q.data && q.data.orig ? `${q.data.orig} → ` : "往 "}{q.data.dest}
          </p>
          <button
            type="button"
            aria-label="調換起點和終點"
            onClick={() => {
              setDir(dir === "outbound" ? "inbound" : "outbound");
              setFrom(null);
              setTo(null);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            <ArrowLeftRight size={14} />
            調換
          </button>
        </div>
      )}

      {route && (
        <div className="mx-5 mt-3 rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Clock size={16} className="text-primary" />
            預計行程時間
          </p>
          {!trip ? (
            <p className="mt-1 text-sm text-muted-foreground">在下面點選「起點」及「終點」車站</p>
          ) : (
            <div className="mt-2 text-sm">
              <p>
                {trip.a?.name} → {trip.b?.name}（{trip.n} 個站）
              </p>
              <p className="mt-1">
                乘車約 <b className="text-lg text-primary">{trip.ride}</b> 分鐘
                {trip.wait != null && <>，下班車 {Math.round(trip.wait)} 分鐘後</>}
              </p>
              {trip.arrive && (
                <p className="text-muted-foreground">
                  預計{" "}
                  {trip.arrive.toLocaleTimeString("zh-HK", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Hong_Kong",
                  })}{" "}
                  到達
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {route && q.data?.dest && co !== "NLB" && (
        <BusFareBox
          route={route}
          co={co}
          dir={dir}
          idx={from != null ? stops.findIndex((s) => s.seq === from) : null}
          name={stops.find((s) => s.seq === from)?.name}
        />
      )}
      {route && q.data?.dest && co === "NLB" && (
        <NlbFareBox stops={stops} fromSeq={from} />
      )}
      {q.isLoading && <p className="mx-5 mt-6 text-muted-foreground">載入中…</p>}
      {q.isError && <p className="mx-5 mt-6 text-destructive">無法載入，請檢查路線</p>}
      {q.data && stops.length === 0 && (
        <p className="mx-5 mt-6 text-muted-foreground">找不到此路線</p>
      )}
      <ol className="mx-5 mt-4 border-l-2 border-primary/30">
        {stops.map((s, index) => {
          const inTrip = from != null && to != null && s.seq >= from && s.seq <= to;
          const etaIsApproaching = s.etas.some((eta: string) => {
            const minutes = etaMinutes(eta, now);
            return minutes != null && minutes >= -1 && minutes <= 1;
          });
          const isOriginWaiting = index === 0 && terminalWaitMinutes != null;
          const segmentBuses = busesBySegment.get(index) ?? [];
          const isNearestStop = nearestStop?.seq === s.seq;
          const allTrackedBusesPassed =
            trackedBuses.length > 0 &&
            trackedBuses.every((bus) => bus.segmentIndex >= index);

          return (
            <li
              key={s.seq}
              ref={isNearestStop ? nearestStopRef : undefined}
              aria-current={isNearestStop ? "location" : undefined}
              className={`relative scroll-mt-24 pb-8 pl-5 transition-opacity ${allTrackedBusesPassed ? "opacity-50" : ""} ${isNearestStop ? "rounded-xl bg-primary/5 py-3" : ""}`}
            >
              {etaIsApproaching && (
                <span
                  aria-hidden="true"
                  className="absolute -left-[2px] top-0 h-full w-0.5 rounded-full bg-primary"
                />
              )}
              <span
                aria-hidden="true"
                className={`absolute -left-[7px] top-1.5 size-3 rounded-full border-2 ${etaIsApproaching ? "border-primary bg-primary ring-4 ring-primary/20" : `border-primary ${inTrip ? "bg-primary" : "bg-background"}`}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    setStop({
                      id: s.id,
                      name: s.name,
                      co,
                      lat: "lat" in s ? (s.lat ?? null) : null,
                      lng: "lng" in s ? (s.lng ?? null) : null,
                      fare: "fare" in s ? (s.fare ?? null) : null,
                    })
                  }
                  className="text-left font-medium underline-offset-2 hover:underline"
                >
                  {s.name}
                </button>
                {etaIsApproaching && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    即將抵站
                  </span>
                )}
                {isNearestStop && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    <MapPin size={11} aria-hidden="true" />
                    當前最近上車站
                  </span>
                )}
                {isOriginWaiting && (
                  <span
                    title="按起點站後續 ETA 班距推算"
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                  >
                    <Bus size={12} aria-hidden="true" />
                    總站候發 · 約 {terminalWaitMinutes} 分鐘後
                  </span>
                )}
                {route && co !== "NLB" && (
                  <BusStopFare
                    route={route}
                    co={co}
                    dir={dir}
                    idx={stops.findIndex((stop) => stop.seq === s.seq)}
                  />
                )}
                {route && co === "NLB" && "fare" in s && s.fare != null && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    ${s.fare.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                {s.etas.length ? (
                  s.etas.map((e: string, i: number) => <Countdown key={i} at={e} now={now} />)
                ) : (
                  <span className="text-muted-foreground">暫無班次</span>
                )}
              </div>
              <div className="mt-1 flex gap-2 text-xs">
                <button
                  onClick={() => setFrom(s.seq)}
                  className={`rounded-full border px-2 py-0.5 ${from === s.seq ? "bg-primary text-primary-foreground" : ""}`}
                >
                  起點
                </button>
                <button
                  onClick={() => setTo(s.seq)}
                  className={`rounded-full border px-2 py-0.5 ${to === s.seq ? "bg-primary text-primary-foreground" : ""}`}
                >
                  終點
                </button>
              </div>
              {segmentBuses.map((bus) => {
                const nextStopName = stops[bus.segmentIndex + 1]?.name ?? "下一站";
                const minutesToNextStop = Math.max(1, Math.ceil((bus.nextArrivalAt - now) / 60000));
                const description = `行駛中，預計 ${minutesToNextStop} 分鐘到達${nextStopName}`;
                const busKey = `${trackerKey}-${bus.slot}-${bus.segmentIndex}`;
                const isTooltipOpen = activeTrackerTooltip === busKey;

                return (
                  <button
                    key={`${bus.slot}-${bus.segmentIndex}`}
                    type="button"
                    title={description}
                    aria-label={description}
                    aria-expanded={isTooltipOpen}
                    aria-describedby={isTooltipOpen ? `bus-tooltip-${busKey}` : undefined}
                    onClick={() => setActiveTrackerTooltip(isTooltipOpen ? null : busKey)}
                    className="group absolute -left-[15px] bottom-0 z-10 inline-flex size-7 animate-pulse items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:animate-none"
                  >
                    <Bus size={15} aria-hidden="true" />
                    <span
                      id={`bus-tooltip-${busKey}`}
                      role="tooltip"
                      aria-hidden={!isTooltipOpen}
                      className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background shadow-lg ${isTooltipOpen ? "block" : "hidden group-hover:block group-focus-visible:block"}`}
                    >
                      {description}
                    </span>
                  </button>
                );
              })}
            </li>
          );
        })}
      </ol>
      {gmb && <GmbSheet routeId={gmb.id} dest={gmb.dest} onClose={() => setGmb(null)} />}
      {stop && (
        <StopSheet
          stop={stop}
          co={stop.co}
          route={stop.co === co ? route : null}
          onClose={() => setStop(null)}
          onPick={(r) => {
            setStop(null);
            setCo(stop.co);
            setRoute(r);
            setDir("outbound");
            setFrom(null);
            setTo(null);
          }}
        />
      )}
    </div>
  );
}

function GmbSheet({ routeId, dest, onClose }: { routeId: string; dest?: string | undefined; onClose: () => void }) {
  const detailFn = useServerFn(getGmbDetail);
  const etaFn = useServerFn(getGmbEta);
  const [seq, setSeq] = useState<number | null>(null);
  const detail = useQuery({
    queryKey: ["gmb-detail", routeId],
    queryFn: () => detailFn({ data: { routeId } }),
    staleTime: 3600e3,
  });
  const dirs = detail.data?.directions ?? [];
  const cur = dirs.find((d) => d.routeSeq === seq) ?? dirs.find((d) => d.dest === dest) ?? dirs[0];
  const eta = useQuery({
    queryKey: ["gmb-eta", routeId, cur?.routeSeq],
    queryFn: () => etaFn({ data: { routeId, routeSeq: cur!.routeSeq } }),
    enabled: !!cur,
    refetchInterval: 60000,
  });
  const full = cur?.fares.length ? Math.max(...cur.fares) : null;
  const sectional = !!cur?.fares.some((f) => f !== full);
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-foreground/40" onClick={onClose}>
      <div
        className="mx-auto max-h-[85vh] w-full max-w-md overflow-auto rounded-t-3xl bg-background p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">小巴</span>
            {detail.data?.route || "專綫小巴"}
          </h2>
          <button aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </div>
        {detail.isLoading && <p className="mt-4 text-sm text-muted-foreground">載入路線資料中…</p>}
        {detail.isError && <p className="mt-4 text-sm text-destructive">未能載入此小巴路線</p>}
        {cur && (
          <>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <p>
                {cur.orig} → <b>{cur.dest}</b>
              </p>
              {dirs.length > 1 && (
                <button
                  onClick={() => setSeq(dirs.find((d) => d.routeSeq !== cur.routeSeq)!.routeSeq)}
                  aria-label="調換起點終點"
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  <ArrowLeftRight size={12} /> 調換
                </button>
              )}
            </div>
            <div className="mt-3 rounded-2xl border bg-card p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Wallet size={16} className="text-primary" />
                車資詳情
              </p>
              {full == null ? (
                <p className="mt-1 text-muted-foreground">暫無此路線車資資料</p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                  <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
                    <span className="text-muted-foreground">全程成人</span>
                    <b>${full.toFixed(1)}</b>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
                    <span className="text-muted-foreground">分段收費</span>
                    <b>{sectional ? "有" : "無"}</b>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
                    <span className="text-muted-foreground">$2 優惠（65 歲以上）</span>
                    <b>$2.0</b>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs font-semibold text-muted-foreground">
              沿途站點（{cur.stops.length} 個）· 每分鐘更新
            </p>
            <ol className="mt-2 border-l-2 border-amber-300">
              {cur.stops.map((s, i) => {
                const e = eta.data?.find((x) => x.seq === s.seq);
                const fare = cur.fares[Math.min(i, cur.fares.length - 1)];
                return (
                  <li key={s.seq} className="relative pb-3 pl-5">
                    <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-amber-500 bg-background" />
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {s.name}
                      {fare != null && i < cur.stops.length - 1 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          ${fare.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs">
                      {eta.isLoading ? (
                        <span className="text-muted-foreground">…</span>
                      ) : e?.etas.length ? (
                        e.etas.map((x, k) => (
                          <b key={k} className="mr-2 text-amber-700">
                            {x.diff != null ? (x.diff <= 1 ? "即將到站" : `${x.diff} 分鐘`) : x.timestamp?.slice(11, 16)}
                          </b>
                        ))
                      ) : (
                        <span className="text-muted-foreground">暫無班次</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 text-[11px] text-muted-foreground">站點旁車資為該站上車嘅成人收費，以車上公布為準。</p>
          </>
        )}
      </div>
    </div>
  );
}

  function CoTag({ co }: { co: "KMB" | "CTB" | "NLB" }) {
  return (
  <span
  className={`mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${co === "KMB" ? "bg-destructive/15 text-destructive" : co === "NLB" ? "bg-sky-100 text-sky-700" : "bg-accent text-accent-foreground"}`}
  >
  {co === "KMB" ? "九巴" : co === "NLB" ? "新大嶼山巴士" : "城巴"}
    </span>
  );
}

function StopSheet({
  stop,
  co,
  route,
  onClose,
  onPick,
}: {
  stop: { id: string; name: string; lat?: number | null; lng?: number | null; fare?: number | null };
  co: "KMB" | "CTB" | "NLB";
  route: string | null;
  onClose: () => void;
  onPick: (r: string) => void;
}) {
  const fn = useServerFn(getStopEta);
  const now = useNow();
  const canEta = co === "KMB" || (co === "CTB" && !!route);
  const { position } = useCurrentLocation();
  const q = useQuery({
    queryKey: ["stopEta", co, stop.id, route],
    queryFn: () => fn({ data: { stop: stop.id, co, route: route ?? undefined } }),
    refetchInterval: 30000,
    enabled: canEta,
  });
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-foreground/40" onClick={onClose}>
      <div
        className="mx-auto max-h-[75vh] w-full max-w-md overflow-auto rounded-t-3xl bg-background p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <MapPin size={18} className="text-primary" />
            {stop.name}
          </h2>
          <button aria-label="關閉" onClick={onClose}>
            <X />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          站點編號 {stop.id.slice(0, 8)}… ·{" "}
          {co === "KMB"
            ? "所有經過路線"
            : co === "CTB"
              ? route
                ? `城巴 ${route} 到站`
                : "城巴車站"
              : "嶼巴車站"}
        </p>

        <div className="mt-3">
          <MiniMapNavigation
            name={stop.name}
            lat={stop.lat}
            lng={stop.lng}
            position={position}
          />
        </div>

        {co === "NLB" && (

          <>
            {stop.fare != null && (
              <div className="mt-3 rounded-2xl border bg-card p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <Wallet size={16} className="text-sky-600" />
                  此站上車車資
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                  <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
                    <span className="text-muted-foreground">成人</span>
                    <b>${stop.fare.toFixed(1)}</b>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
                    <span className="text-muted-foreground">小童 / 長者（約半價）</span>
                    <b>${(stop.fare / 2).toFixed(1)}</b>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
                    <span className="text-muted-foreground">$2 優惠（65 歲以上）</span>
                    <b>{stop.fare > 2 ? "$2.0" : `${stop.fare.toFixed(1)}`}</b>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  小童 / 長者車資為估算，以車上公布為準。
                </p>
              </div>
            )}

            <p className="mt-4 text-sm text-muted-foreground">
              嶼巴暫未提供以單一車站查詢所有途經路線嘅功能，請用上面搜尋欄揀路線查看到站時間。
            </p>
          </>
        )}

        {co !== "NLB" && !canEta && (
          <p className="mt-4 text-sm text-muted-foreground">
            城巴車站暫未能一次過顯示所有路線班次，請用上面搜尋欄揀路線查看。
          </p>
        )}
        {co !== "NLB" && canEta && q.isLoading && (
          <p className="mt-4 text-muted-foreground">載入中…</p>
        )}
        {co !== "NLB" && (
          <div className="mt-3 divide-y rounded-2xl border bg-card">
            {q.data?.map((r) => (
              <button
                key={r.route + r.dest}
                onClick={() => onPick(r.route)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <b className="w-12 text-primary">{r.route}</b>
                <span className="flex-1 text-sm">往 {r.dest}</span>
                <span className="flex gap-2 text-sm">
                  {r.etas.slice(0, 2).map((e, i) => (
                    <Countdown key={i} at={e} now={now} />
                  ))}
                </span>
              </button>
            ))}
            {q.data?.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">暫無班次</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
