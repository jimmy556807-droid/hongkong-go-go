import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Clock, MapPin, TramFront, Wallet } from "lucide-react";
import { getLrtNetwork, getLrtSchedule, getLrtFare, type LrtRoute, type LrtStop } from "@/lib/lrt.functions";

const MIN_PER_STOP = 1.8;
const LRT_COLOR = "#D3A809";
const LRT_ROUTE_COLORS = ["#0072BC", "#E87511", "#7B3F98", "#008A45", "#D33F49", "#008C95", "#B06A00"];
const routeColor = (route: string) => LRT_ROUTE_COLORS[(Number(route) || 0) % LRT_ROUTE_COLORS.length];

type StopOption = { id: string; name: string; code: string; routes: string[] };
type PlannedSegment = { route: string; dir: string; from: LrtStop; to: LrtStop; stops: LrtStop[] };
type PlannedRoute = { segments: PlannedSegment[]; stops: LrtStop[]; transfers: number };

function buildRoute(routes: LrtRoute[], from: string, to: string): PlannedRoute | null {
  if (!from || !to || from === to) return null;
  const candidates: PlannedRoute[] = [];
  for (const first of routes) {
    const fromIndex = first.stops.findIndex((s) => s.id === from);
    if (fromIndex < 0) continue;
    const directTo = first.stops.findIndex((s, index) => s.id === to && index > fromIndex);
    if (directTo >= 0) candidates.push({ segments: [{ route: first.route, dir: first.dir, from: first.stops[fromIndex], to: first.stops[directTo], stops: first.stops.slice(fromIndex, directTo + 1) }], stops: first.stops.slice(fromIndex, directTo + 1), transfers: 0 });
    for (const second of routes) {
      const toIndex = second.stops.findIndex((s) => s.id === to);
      if (toIndex < 0) continue;
      const interchangeIndex = first.stops.findIndex((s, index) => index > fromIndex && second.stops.slice(0, toIndex).some((next) => next.id === s.id));
      if (interchangeIndex < 0) continue;
      const secondIndex = second.stops.findIndex((s) => s.id === first.stops[interchangeIndex].id);
      const firstStops = first.stops.slice(fromIndex, interchangeIndex + 1);
      const secondStops = second.stops.slice(secondIndex, toIndex + 1);
      candidates.push({ segments: [{ route: first.route, dir: first.dir, from: firstStops[0], to: firstStops.at(-1)!, stops: firstStops }, { route: second.route, dir: second.dir, from: secondStops[0], to: secondStops.at(-1)!, stops: secondStops }], stops: [...firstStops, ...secondStops.slice(1)], transfers: 1 });
    }
  }
  return candidates.sort((a, b) => a.stops.length + a.transfers * 2 - (b.stops.length + b.transfers * 2))[0] ?? null;
}

export function LrtPanel() {
  const netFn = useServerFn(getLrtNetwork);
  const schedFn = useServerFn(getLrtSchedule);
  const fareFn = useServerFn(getLrtFare);
  const [tab, setTab] = useState<"route" | "trains" | "station">("trains");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sta, setSta] = useState("");
  const [stationsExpanded, setStationsExpanded] = useState(false);
  const net = useQuery({ queryKey: ["lrt-net"], queryFn: () => netFn(), staleTime: 3600e3 });
  const routes = net.data ?? [];
  const allStations = useMemo<StopOption[]>(() => {
    const map = new Map<string, StopOption>();
    for (const route of routes) for (const stop of route.stops) {
      const item = map.get(stop.id) ?? { id: stop.id, name: stop.name, code: stop.code, routes: [] };
      if (!item.routes.includes(route.route)) item.routes.push(route.route);
      map.set(stop.id, item);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-HK"));
  }, [routes]);
  const fromId = from || allStations[0]?.id || "";
  const toId = to || allStations.find((s) => s.id !== fromId)?.id || "";
  const staId = sta || fromId;
  const plan = useMemo(() => buildRoute(routes, fromId, toId), [routes, fromId, toId]);
  const fare = useQuery({ queryKey: ["lrt-fare", fromId, toId], queryFn: () => fareFn({ data: { from: fromId, to: toId } }), enabled: Boolean(plan && plan.transfers === 0) });
  const sched = useQuery({ queryKey: ["lrt-sched", staId], queryFn: () => schedFn({ data: { id: staId } }), enabled: Boolean(staId), refetchInterval: 20000 });
  const staInfo = allStations.find((station) => station.id === staId);

  if (net.isLoading) return <p className="px-5 py-6 text-sm text-muted-foreground">載入輕鐵路線中…</p>;
  if (net.isError || !routes.length) return <p className="px-5 py-6 text-sm text-destructive">未能載入輕鐵資料</p>;

  const stationSelect = (label: string, value: string, onChange: (value: string) => void, exclude?: string) => (
    <label className="text-xs text-muted-foreground">{label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground">
        <option value="" disabled>請選擇車站</option>
        {allStations.filter((station) => station.id !== exclude).map((station) => (
          <option key={station.id} value={station.id}>{station.name}（{station.code}）</option>
        ))}
      </select>
    </label>
  );

  return <div>
    <div className="mx-5 mt-3 grid grid-cols-3 rounded-2xl bg-muted p-1" role="tablist" aria-label="輕鐵功能分類">
      {([["trains", "下班列車"], ["route", "路線"], ["station", "車站詳情"]] as const).map(([value, label]) => (
        <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-xl px-2 py-2.5 text-sm font-semibold ${tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>
      ))}
    </div>

    {tab === "route" && <>
      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2"><div className="rounded-full bg-primary/10 p-2 text-primary"><TramFront size={18} /></div><div><h2 className="font-bold">輕鐵路線規劃</h2><p className="text-xs text-muted-foreground">選擇任意站點，查看行程時間及車資</p></div></div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stationSelect("起點", fromId, setFrom, toId)}
          {stationSelect("終點", toId, setTo, fromId)}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />支援不同路線之間轉乘，時間為估算值</div>
      </div>
      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm shadow-sm">
        {!plan ? <p className="text-muted-foreground">請選擇不同的起點及終點</p> : <>
          <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 font-semibold"><Clock size={16} className="text-primary" />預計行程時間</p><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">約 {Math.ceil((plan.stops.length - 1) * MIN_PER_STOP + plan.transfers * 4 + 2)} 分鐘</span></div>
          <p className="mt-2 text-base font-semibold">{allStations.find((s) => s.id === fromId)?.name} <ArrowRight className="mx-1 inline text-muted-foreground" size={15} /> {allStations.find((s) => s.id === toId)?.name}</p>
<p className="mt-1 text-xs text-muted-foreground">{plan.stops.length - 1} 個站 · {plan.transfers ? `轉乘 ${plan.transfers} 次` : `直達 ${plan.segments[0].route} 號車`}</p>
  <div className="mt-3 space-y-2">{plan.segments.map((segment, segmentIndex) => <div key={`${segment.route}-${segmentIndex}`} className="rounded-xl bg-muted/50 p-2.5"><p className="text-xs font-semibold">乘搭 <span className="text-primary">{segment.route} 號車</span>（往 {segment.dir}）</p><p className="mt-1 text-xs text-muted-foreground">{segment.from.name} → {segment.to.name} · {segment.stops.length - 1} 個站</p></div>)}{plan.transfers > 0 && <p className="flex items-center gap-1 text-xs font-semibold text-primary"><ArrowRight size={12} />在 {plan.segments[0].to.name}：{plan.segments[0].route} 號車轉乘 {plan.segments[1].route} 號車</p>}</div>
          <div className="mt-4 border-t pt-3"><p className="flex items-center gap-2 font-semibold"><Wallet size={16} className="text-primary" />對應車資</p>{fare.data ? <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">{([["八達通成人", fare.data.adult], ["單程票成人", fare.data.single], ["八達通學生", fare.data.student], ["八達通小童", fare.data.child], ["長者優惠", fare.data.elder]] as const).map(([label, value]) => <div key={label} className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5"><span className="text-muted-foreground">{label}</span><b>${value.toFixed(1)}</b></div>)}</div> : <p className="mt-1 text-xs text-muted-foreground">轉乘路線或暫未有對應車資資料，請以現場收費為準</p>}</div>
        </>}
      </div>
    </>}

    {tab === "station" && <div className="mx-5 mt-3 rounded-2xl border bg-card p-4">{stationSelect("車站", staId, setSta)}{staInfo && <><p className="mt-4 flex items-center gap-2 text-lg font-bold"><TramFront size={18} style={{ color: LRT_COLOR }} />{staInfo.name}</p><p className="mt-1 text-xs text-muted-foreground">車站編號 {staId} · 途經 {staInfo.routes.join("、")} 號線</p><a className="mt-3 inline-flex items-center gap-1 text-sm text-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("輕鐵 " + staInfo.name + "站")}`}><MapPin size={14} />在地圖查看</a><button type="button" aria-expanded={stationsExpanded} onClick={() => setStationsExpanded((expanded) => !expanded)} className="mt-4 flex w-full justify-between border-t pt-3 text-left text-sm font-semibold">站點資訊<span>{stationsExpanded ? "−" : "+"}</span></button>{stationsExpanded && <p className="mt-2 text-sm text-muted-foreground">可在「路線」頁選擇此站作為起點或終點。</p>}</>}</div>}
    {tab !== "route" && tab !== "station" && <div className="mx-5 mt-3 space-y-3">{sched.data?.map((platform) => <div key={platform.platform} className="rounded-2xl border bg-card p-4"><p className="mb-2 text-sm font-semibold">{platform.platform} 號月台</p>{platform.trains.length ? platform.trains.map((train, index) => <div key={index} className="flex items-center justify-between border-t py-2 text-sm first:border-0"><span><b className="mr-2 rounded-md px-2 py-0.5 text-xs text-white" style={{ background: LRT_COLOR }}>{train.route}</b>往 {train.dest}</span><b className="text-primary">{train.time}</b></div>) : <p className="text-xs text-muted-foreground">暫無列車</p>}</div>)}{sched.isLoading && <p className="text-sm text-muted-foreground">載入班次中…</p>}{!sched.isLoading && !sched.data?.length && <p className="text-sm text-muted-foreground">暫無班次</p>}</div>}
  </div>;
}
