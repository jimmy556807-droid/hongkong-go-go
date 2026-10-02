import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Search, Clock, MapPin, Navigation, X } from "lucide-react";
import { getBus, getBusRoutes, getNearbyRoutes, getStopEta } from "@/lib/hk.functions";
import { getBusFare } from "@/lib/fare.functions";
import { Wallet } from "lucide-react";

function BusFareBox({
  route,
  co,
  dir,
  idx,
  name,
}: {
  route: string;
  co: "KMB" | "CTB";
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
import { PageHeader, Countdown, useNow } from "@/components/BottomNav";

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

function BusPage() {
  const [input, setInput] = useState("");
  const [route, setRoute] = useState<string | null>(null);
  const [co, setCo] = useState<"KMB" | "CTB">("KMB");
  const [dir, setDir] = useState<"outbound" | "inbound">("outbound");
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [stop, setStop] = useState<{ id: string; name: string; co: "KMB" | "CTB" } | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 8000 },
    );
  }, []);
  const now = useNow();
  const fn = useServerFn(getBus);
  const routesFn = useServerFn(getBusRoutes);
  const nearFn = useServerFn(getNearbyRoutes);
  const routes = useQuery({ queryKey: ["busRoutes"], queryFn: routesFn, staleTime: 86400000 });
  const nearby = useQuery({
    queryKey: ["nearbyRoutes", pos?.lat, pos?.lng],
    queryFn: () => nearFn({ data: pos! }),
    enabled: !!pos && !route,
    refetchInterval: 30000,
  });
  const q = useQuery({
    queryKey: ["bus", co, route, dir],
    queryFn: () => fn({ data: { route: route!, dir, co } }),
    refetchInterval: 30000,
    enabled: !!route,
  });

  const matches = useMemo(() => {
    const t = input.trim().toUpperCase();
    if (!t) return [];
    return (routes.data ?? [])
      .filter((r) => r.route.startsWith(t) || r.dest.includes(t) || r.orig.includes(t))
      .slice(0, 20);
  }, [input, routes.data]);

  const pick = (r: string, d: "outbound" | "inbound", c: "KMB" | "CTB") => {
    setRoute(r);
    setDir(d);
    setCo(c);
    setInput("");
    setFrom(null);
    setTo(null);
  };
  const stops = q.data?.stops ?? [];
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
      <PageHeader title="巴士" sub="九巴 / 龍運 / 城巴（含前新巴）實時到站" />
      <div className="relative mx-5">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border bg-card px-3">
            <Search size={18} className="text-muted-foreground" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="搜尋路線或目的地"
              className="w-full bg-transparent py-3 outline-none"
            />
          </div>
          <button
            type="button"
            aria-label="轉方向"
            onClick={() => {
              setDir(dir === "outbound" ? "inbound" : "outbound");
              setFrom(null);
              setTo(null);
            }}
            className="rounded-xl border bg-card px-4"
          >
            <ArrowLeftRight />
          </button>
        </div>
        {matches.length > 0 && (
          <ul className="absolute inset-x-0 z-20 mt-1 max-h-80 overflow-auto rounded-xl border bg-card shadow-lg">
            {matches.map((r) => (
              <li key={r.co + r.route + r.dir}>
                <button
                  onClick={() => pick(r.route, r.dir, r.co)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted"
                >
                  <b className="w-12 text-primary">{r.route}</b>
                  <CoTag co={r.co} />
                  <span className="text-sm">
                    {r.orig} → {r.dest}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!route && (
        <div className="mx-5 mt-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Navigation size={16} className="text-primary" />
            附近巴士路線
          </p>
          {!pos && (
            <p className="mt-1 text-sm text-muted-foreground">
              正在取得你嘅位置…如未能定位，請用上面搜尋路線。
            </p>
          )}
          {pos && nearby.isLoading && (
            <p className="mt-1 text-sm text-muted-foreground">搵緊附近路線…</p>
          )}
          {pos && nearby.data?.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">附近 800 米內搵唔到巴士路線</p>
          )}
          {!!nearby.data?.length && (
            <div className="mt-2 divide-y rounded-2xl border bg-card">
              {nearby.data.map((r) => (
                <button
                  key={r.route + r.dir}
                  onClick={() => pick(r.route, r.dir, "KMB")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <b className="w-12 shrink-0 text-primary">{r.route}</b>
                  <span className="flex-1 text-sm">
                    往 {r.dest}
                    <span className="block text-xs text-muted-foreground">
                      <MapPin size={10} className="mr-0.5 inline" />
                      {r.stopName} ·{" "}
                      {r.dist < 1000
                        ? `${Math.round(r.dist)} 米`
                        : `${(r.dist / 1000).toFixed(1)} 公里`}
                    </span>
                  </span>
                  <span className="flex gap-2 text-sm">
                    {r.etas.length ? (
                      r.etas.slice(0, 2).map((e, i) => <Countdown key={i} at={e} now={now} />)
                    ) : (
                      <span className="text-xs text-muted-foreground">暫無班次</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            附近路線根據最近車站嘅實時班次整理；城巴路線請用上面搜尋。
          </p>
        </div>
      )}

      {route && (
        <button
          onClick={() => {
            setRoute(null);
            setFrom(null);
            setTo(null);
          }}
          className="mx-5 mt-3 text-sm text-primary underline"
        >
          ← 返回附近巴士路線
        </button>
      )}

      {q.data?.dest && (
        <p className="mx-5 mt-4 text-sm text-muted-foreground">
          <b className="mr-2 text-lg text-foreground">{q.data.route}</b>
          <CoTag co={co} /> 往 {q.data.dest}
        </p>
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

      {route && q.data?.dest && (
        <BusFareBox
          route={route}
          co={co}
          dir={dir}
          idx={from != null ? stops.findIndex((s) => s.seq === from) : null}
          name={stops.find((s) => s.seq === from)?.name}
        />
      )}
      {q.isLoading && <p className="mx-5 mt-6 text-muted-foreground">載入中…</p>}
      {q.isError && <p className="mx-5 mt-6 text-destructive">無法載入，請檢查路線</p>}
      {q.data && stops.length === 0 && (
        <p className="mx-5 mt-6 text-muted-foreground">找不到此路線</p>
      )}
      <ol className="mx-5 mt-4 border-l-2 border-primary/30">
        {stops.map((s) => {
          const inTrip = from != null && to != null && s.seq >= from && s.seq <= to;
          return (
            <li key={s.seq} className="relative pb-4 pl-5">
              <span
                className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-primary ${inTrip ? "bg-primary" : "bg-background"}`}
              />
              <button
                onClick={() => setStop({ id: s.id, name: s.name, co })}
                className="text-left font-medium underline-offset-2 hover:underline"
              >
                {s.name}
              </button>
              <div className="flex items-center gap-3 text-sm">
                {s.etas.length ? (
                  s.etas.map((e, i) => <Countdown key={i} at={e} now={now} />)
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
            </li>
          );
        })}
      </ol>
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
            setFrom(null);
            setTo(null);
          }}
        />
      )}
    </div>
  );
}

function CoTag({ co }: { co: "KMB" | "CTB" }) {
  return (
    <span
      className={`mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${co === "KMB" ? "bg-destructive/15 text-destructive" : "bg-accent text-accent-foreground"}`}
    >
      {co === "KMB" ? "九巴" : "城巴"}
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
  stop: { id: string; name: string };
  co: "KMB" | "CTB";
  route: string | null;
  onClose: () => void;
  onPick: (r: string) => void;
}) {
  const fn = useServerFn(getStopEta);
  const now = useNow();
  const canEta = co === "KMB" || !!route;
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
          {co === "KMB" ? "所有經過路線" : route ? `城巴 ${route} 到站` : "城巴車站"}
        </p>
        {!canEta && (
          <p className="mt-4 text-sm text-muted-foreground">
            城巴車站暫未能一次過顯示所有路線班次，請用上面搜尋欄揀路線查看。
          </p>
        )}
        {canEta && q.isLoading && <p className="mt-4 text-muted-foreground">載入中…</p>}
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
          {q.data?.length === 0 && <p className="p-4 text-sm text-muted-foreground">暫無班次</p>}
        </div>
      </div>
    </div>
  );
}
