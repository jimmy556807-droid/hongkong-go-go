import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Wallet, MapPin, TramFront } from "lucide-react";
import { getLrtNetwork, getLrtSchedule, getLrtFare, type LrtRoute } from "@/lib/lrt.functions";

const MIN_PER_STOP = 1.8;
const LRT_COLOR = "#D3A809";
const LRT_ROUTE_COLORS = ["#0072BC", "#E87511", "#7B3F98", "#008A45", "#D33F49", "#008C95", "#B06A00"];

const routeColor = (route: string) => LRT_ROUTE_COLORS[(Number(route) || 0) % LRT_ROUTE_COLORS.length];

export function LrtPanel() {
  const netFn = useServerFn(getLrtNetwork);
  const schedFn = useServerFn(getLrtSchedule);
  const fareFn = useServerFn(getLrtFare);
  const [tab, setTab] = useState<"route" | "trains" | "station">("trains");
  const [key, setKey] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sta, setSta] = useState("");
  const [stationsExpanded, setStationsExpanded] = useState(false);

  const net = useQuery({ queryKey: ["lrt-net"], queryFn: () => netFn(), staleTime: 3600e3 });
  const routes = net.data ?? [];
  const cur: LrtRoute | undefined = routes.find((r) => `${r.route}-${r.dir}` === key) ?? routes[0];
  const stops = cur?.stops ?? [];
  const fromId = from || (stops[0]?.id ?? "");
  const toId = to || (stops[stops.length - 1]?.id ?? "");
  const staId = sta || fromId;

  const allStations = useMemo(() => {
    const m = new Map<string, { name: string; routes: Set<string> }>();
    for (const r of routes) for (const s of r.stops) {
      const v = m.get(s.id) ?? { name: s.name, routes: new Set() };
      v.routes.add(r.route); m.set(s.id, v);
    }
    return [...m.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "zh-HK"));
  }, [routes]);

  const stationGroups = useMemo(() => {
    const groups = new Map<string, Map<string, { name: string; code: string }>>();
    for (const r of routes) {
      const stations = groups.get(r.route) ?? new Map();
      for (const s of r.stops) stations.set(s.id, { name: s.name, code: s.code });
      groups.set(r.route, stations);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
  }, [routes]);

  const fi = stops.findIndex((s) => s.id === fromId), ti = stops.findIndex((s) => s.id === toId);
  const nStops = fi >= 0 && ti > fi ? ti - fi : 0;
  const sched = useQuery({
    queryKey: ["lrt-sched", tab === "route" ? fromId : staId],
    queryFn: () => schedFn({ data: { id: tab === "route" ? fromId : staId } }),
    enabled: !!(tab === "route" ? fromId : staId),
    refetchInterval: 20000,
  });
  const fare = useQuery({
    queryKey: ["lrt-fare", fromId, toId],
    queryFn: () => fareFn({ data: { from: fromId, to: toId } }),
    enabled: nStops > 0,
  });
  const nextOnRoute = sched.data?.flatMap((p) => p.trains.map((t) => ({ ...t, platform: p.platform })))
    .find((t) => t.route === cur?.route);
  const staInfo = allStations.find(([id]) => id === staId)?.[1];

  if (net.isLoading) return <p className="px-5 py-6 text-sm text-muted-foreground">載入輕鐵路線中…</p>;
  if (net.isError || !cur) return <p className="px-5 py-6 text-sm text-destructive">未能載入輕鐵資料</p>;

  const Trains = () => (
    <div className="mx-5 mt-3 space-y-3">
      {sched.isLoading && <p className="text-sm text-muted-foreground">載入班次中…</p>}
      {sched.data?.length === 0 && <p className="text-sm text-muted-foreground">暫無班次</p>}
      {sched.data?.map((p) => (
        <div key={p.platform} className="rounded-2xl border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">{p.platform} 號月台</p>
          {p.trains.length === 0 && <p className="text-xs text-muted-foreground">暫無列車</p>}
          {p.trains.map((t, i) => (
            <div key={i} className="flex items-center justify-between border-t py-2 text-sm first:border-0">
              <span className="flex items-center gap-2"><b className="rounded-md px-2 py-0.5 text-xs" style={{ background: LRT_COLOR, color: "white" }}>{t.route}</b>往 {t.dest}<span className="text-xs text-muted-foreground">{t.cars} 卡</span></span>
              <b className="text-primary">{t.time}</b>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mx-5 mt-3 grid grid-cols-3 rounded-2xl bg-muted p-1" role="tablist" aria-label="輕鐵功能分類">
        {([["trains", "下班列車"], ["route", "路線"], ["station", "車站詳情"]] as const).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={`rounded-xl px-2 py-2.5 text-sm font-semibold ${tab === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "route" && <>
        <div className="flex gap-2 overflow-x-auto px-5 pb-2 pt-3">
          {routes.map((r) => {
            const k = `${r.route}-${r.dir}`, on = k === `${cur.route}-${cur.dir}`;
            return (
              <button key={k} onClick={() => { setKey(k); setFrom(""); setTo(""); }}
                className="shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium"
                style={on ? { background: LRT_COLOR, color: "white", borderColor: LRT_COLOR } : { borderColor: LRT_COLOR }}>
                {r.route} 往{r.stops[r.stops.length - 1]?.name}
              </button>
            );
          })}
        </div>
        <div className="mx-5 mt-2 grid grid-cols-2 gap-2">
          {([["起點", fromId, setFrom], ["終點", toId, setTo]] as const).map(([l, v, set]) => (
            <label key={l} className="text-xs text-muted-foreground">{l}
              <select value={v} onChange={(e) => set(e.target.value)} className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground">
                {stationGroups.map(([route, stations]) => (
                  <optgroup key={route} label={`路線 ${route}`}>
                    {[...stations.entries()].map(([id, s]) => (
                      <option key={`${route}-${id}`} value={id} style={{ color: routeColor(route) }}>
                        ● {s.name}（{s.code}）
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="mx-5 mt-3 rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-2 font-semibold"><Clock size={16} className="text-primary" />預計行程時間</p>
          {nStops > 0 ? <>
            <p className="mt-1 text-2xl font-bold">約 {Math.round(nStops * MIN_PER_STOP)} 分鐘</p>
            <p className="text-xs text-muted-foreground">{nStops} 個站（每站約 {MIN_PER_STOP} 分鐘估算）</p>
            <p className="mt-2 text-sm">下班 {cur.route} 號：<b className="text-primary">{nextOnRoute ? `${nextOnRoute.time}（${nextOnRoute.platform} 號月台）` : sched.isLoading ? "載入中…" : "暫無資料"}</b></p>
          </> : <p className="mt-1 text-sm text-muted-foreground">請揀喺起點之後嘅終點（此方向）</p>}
          {fare.data && (
            <div className="mt-3 border-t pt-3">
              <p className="flex items-center gap-2 font-semibold"><Wallet size={16} className="text-primary" />車資</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                {([["八達通成人", fare.data.adult], ["單程票成人", fare.data.single], ["八達通學生", fare.data.student], ["八達通小童", fare.data.child], ["長者優惠", fare.data.elder]] as const).map(([l, v]) => (
                  <div key={l} className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5"><span className="text-muted-foreground">{l}</span><b>${v.toFixed(1)}</b></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>}

      {tab !== "route" && (
        <div className="mx-5 mt-3">
          <label className="text-xs text-muted-foreground">車站
            <select value={staId} onChange={(e) => setSta(e.target.value)} className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground">
              {stationGroups.map(([route, stations]) => (
                <optgroup key={route} label={`路線 ${route}`}>
                  {[...stations.entries()].map(([id, s]) => (
                    <option key={`${route}-${id}`} value={id} style={{ color: routeColor(route) }}>
                      ● {s.name}（{s.code}）
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      )}

      {tab === "station" && staInfo && (
        <div className="mx-5 mt-3 rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-2 text-lg font-bold"><TramFront size={18} style={{ color: LRT_COLOR }} />{staInfo.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">車站編號 {staId}</p>
          <p className="mt-3 text-sm font-semibold">途經路線</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[...staInfo.routes].sort((a, b) => a.localeCompare(b, "en", { numeric: true })).map((r) => (
              <button key={r} onClick={() => { const k = routes.find((x) => x.route === r && x.stops.some((s) => s.id === staId)); if (k) { setKey(`${k.route}-${k.dir}`); setFrom(staId); setTo(""); setTab("route"); } }}
                className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: LRT_COLOR, color: "white" }}>{r}</button>
            ))}
          </div>
          <a className="mt-3 inline-flex items-center gap-1 text-sm text-primary" target="_blank" rel="noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("輕鐵 " + staInfo.name + "站")}`}><MapPin size={14} />喺地圖睇</a>
          <button
            type="button"
            aria-expanded={stationsExpanded}
            onClick={() => setStationsExpanded((expanded) => !expanded)}
            className="mt-4 flex w-full items-center justify-between border-t pt-3 text-left text-sm font-semibold"
          >
            <span>輕鐵站點</span>
            <span aria-hidden="true" className="text-lg leading-none text-muted-foreground">{stationsExpanded ? "−" : "+"}</span>
          </button>
          {stationsExpanded && (
            <ol className="mt-1">
              {stops.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: LRT_COLOR, background: s.id === staId ? LRT_COLOR : "transparent" }} />
                  <button className="text-left hover:underline" onClick={() => setSta(s.id)}>{s.name}</button>
                  <span className="ml-auto text-xs text-muted-foreground">{s.code}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {tab !== "route" && <Trains />}
    </div>
  );
}
