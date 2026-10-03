import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ArrowUpDown, Check, ChevronDown, Clock, TramFront, Wallet } from "lucide-react";
import { getLrtNetwork, getLrtSchedule, getLrtFare, type LrtRoute, type LrtStop } from "@/lib/lrt.functions";

const MIN_PER_STOP = 1.8;
const LRT_COLOR = "#D3A809";
const LRT_ROUTE_COLORS = ["#0072BC", "#E87511", "#7B3F98", "#008A45", "#D33F49", "#008C95", "#B06A00"];
const routeColor = (route: string) => LRT_ROUTE_COLORS[(Number(route) || 0) % LRT_ROUTE_COLORS.length];

type StopOption = { id: string; name: string; code: string; routes: string[] };
type PlannedSegment = { route: string; dir: string; from: LrtStop; to: LrtStop; stops: LrtStop[] };
type PlannedRoute = { segments: PlannedSegment[]; stops: LrtStop[]; transfers: number };

type StationPickerProps = {
  label: string;
  value: string;
  stations: StopOption[];
  onChange: (value: string) => void;
  exclude?: string;
};

function StationPicker({ label, value, stations, onChange, exclude }: StationPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = stations.find((station) => station.id === value);
  const options = stations.filter((station) => station.id !== exclude);

  return <div className="relative text-xs text-muted-foreground">
    <span>{label}</span>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="mt-1 flex w-full items-center justify-between rounded-xl border bg-card px-3 py-3 text-left text-base font-semibold text-foreground">
      <span className="flex min-w-0 items-center gap-2 truncate">
        {selected ? <span className="flex shrink-0 gap-1" aria-hidden="true">{selected.routes.map((route) => <i key={route} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: routeColor(route) }} />)}</span> : null}
        {selected ? `${selected.name}（${selected.code}）` : "請選擇車站"}
      </span>
      <ChevronDown size={17} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div role="listbox" aria-label={`${label}站點`} className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border bg-card p-1 shadow-lg">
      {options.map((station) => <button type="button" role="option" aria-selected={station.id === value} key={station.id} onClick={() => { onChange(station.id); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted">
        <span className="flex shrink-0 gap-1" aria-label={`途經 ${station.routes.join("、")} 號線`}>{station.routes.map((route) => <i key={route} className="h-3 w-3 rounded-full" style={{ backgroundColor: routeColor(route) }} />)}</span>
        <span className="min-w-0 flex-1 truncate">{station.name}（{station.code}）</span>
        {station.id === value && <Check size={15} className="shrink-0 text-primary" />}
      </button>)}
    </div>}
  </div>;
}

function buildRoute(routes: LrtRoute[], from: string, to: string): PlannedRoute | null {
  if (!from || !to || from === to) return null;

  type State = { routeIndex: number; stopIndex: number };
  type Previous = { state: State; kind: "ride" | "transfer" };
  const key = (state: State) => `${state.routeIndex}:${state.stopIndex}`;
  const occurrences = new Map<string, State[]>();
  routes.forEach((route, routeIndex) => route.stops.forEach((stop, stopIndex) => {
    const list = occurrences.get(stop.id) ?? [];
    list.push({ routeIndex, stopIndex });
    occurrences.set(stop.id, list);
  }));

  const starts = occurrences.get(from) ?? [];
  const goals = new Set((occurrences.get(to) ?? []).map(key));
  if (!starts.length || !goals.size) return null;

  const distance = new Map<string, number>();
  const previous = new Map<string, Previous>();
  const queue = starts.map((state) => ({ state, cost: 0 }));
  starts.forEach((state) => distance.set(key(state), 0));

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    const currentKey = key(current.state);
    if (current.cost !== distance.get(currentKey)) continue;
    if (goals.has(currentKey)) {
      const states: State[] = [current.state];
      let cursor = currentKey;
      while (previous.has(cursor)) {
        const prior = previous.get(cursor)!.state;
        states.unshift(prior);
        cursor = key(prior);
      }
      const segments: PlannedSegment[] = [];
      let combinedStops: LrtStop[] = [];
      let transfers = 0;
      for (let index = 1; index < states.length; index++) {
        const before = states[index - 1]!;
        const after = states[index]!;
        if (before.routeIndex === after.routeIndex && before.stopIndex !== after.stopIndex) {
          const route = routes[before.routeIndex]!;
          const step = after.stopIndex > before.stopIndex ? 1 : -1;
          const fromStop = route.stops[before.stopIndex]!;
          const toStop = route.stops[after.stopIndex]!;
          const last = segments.at(-1);
          if (last && last.route === route.route && last.dir === route.dir && last.to.id === fromStop.id) {
            last.stops.push(toStop);
            last.to = toStop;
          } else {
            const stops = [fromStop, toStop];
            segments.push({ route: route.route, dir: step > 0 ? route.dir : (routes.find((candidate) => candidate.route === route.route && candidate.stops.some((stop) => stop.id === fromStop.id) && candidate.stops.some((stop) => stop.id === toStop.id))?.dir ?? route.dir), from: fromStop, to: toStop, stops });
          }
        } else if (before.routeIndex !== after.routeIndex) {
          transfers++;
        }
      }
      combinedStops = segments.flatMap((segment, segmentIndex) => segmentIndex ? segment.stops.slice(1) : segment.stops);
      return segments.length ? { segments, stops: combinedStops, transfers } : null;
    }

    const route = routes[current.state.routeIndex]!;
    for (const nextIndex of [current.state.stopIndex - 1, current.state.stopIndex + 1]) {
      if (nextIndex < 0 || nextIndex >= route.stops.length) continue;
      const next = { routeIndex: current.state.routeIndex, stopIndex: nextIndex };
      const nextKey = key(next);
      const nextCost = current.cost + 1;
      if (nextCost < (distance.get(nextKey) ?? Infinity)) {
        distance.set(nextKey, nextCost);
        previous.set(nextKey, { state: current.state, kind: "ride" });
        queue.push({ state: next, cost: nextCost });
      }
    }
    for (const transfer of occurrences.get(route.stops[current.state.stopIndex]!.id) ?? []) {
      if (transfer.routeIndex === current.state.routeIndex) continue;
      const transferKey = key(transfer);
      const transferCost = current.cost + 3;
      if (transferCost < (distance.get(transferKey) ?? Infinity)) {
        distance.set(transferKey, transferCost);
        previous.set(transferKey, { state: current.state, kind: "transfer" });
        queue.push({ state: transfer, cost: transferCost });
      }
    }
  }
  return null;
}

export function LrtPanel() {
  const netFn = useServerFn(getLrtNetwork);
  const schedFn = useServerFn(getLrtSchedule);
  const fareFn = useServerFn(getLrtFare);
  const [tab, setTab] = useState<"route" | "trains">("trains");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sta, setSta] = useState("");
  const net = useQuery({ queryKey: ["lrt-net"], queryFn: () => netFn(), staleTime: 3600e3 });
  const routes = net.data ?? [];
  const allStations = useMemo<StopOption[]>(() => {
    const map = new Map<string, StopOption>();
    const order = new Map<string, { route: number; stop: number }>();
    for (const route of routes) for (const [stopIndex, stop] of route.stops.entries()) {
      const item = map.get(stop.id) ?? { id: stop.id, name: stop.name, code: stop.code, routes: [] };
      if (!item.routes.includes(route.route)) item.routes.push(route.route);
      const routeNumber = Number(route.route) || Number.MAX_SAFE_INTEGER;
      const current = order.get(stop.id);
      if (!current || routeNumber < current.route || (routeNumber === current.route && stopIndex < current.stop)) {
        order.set(stop.id, { route: routeNumber, stop: stopIndex });
      }
      map.set(stop.id, item);
    }
    return [...map.values()].sort((a, b) => {
      const left = order.get(a.id)!;
      const right = order.get(b.id)!;
      return left.route - right.route || left.stop - right.stop || a.name.localeCompare(b.name, "zh-HK");
    });
  }, [routes]);
  const fromId = from || allStations[0]?.id || "";
  const toId = to || allStations.find((s) => s.id !== fromId)?.id || "";
  const staId = sta || fromId;
  const plan = useMemo(() => buildRoute(routes, fromId, toId), [routes, fromId, toId]);
  const fare = useQuery({ queryKey: ["lrt-fare", fromId, toId], queryFn: () => fareFn({ data: { from: fromId, to: toId } }), enabled: Boolean(plan) });
  const sched = useQuery({ queryKey: ["lrt-sched", staId], queryFn: () => schedFn({ data: { id: staId } }), enabled: Boolean(staId), refetchInterval: 20000 });

  if (net.isLoading) return <p className="px-5 py-6 text-sm text-muted-foreground">載入輕鐵路線中…</p>;
  if (net.isError || !routes.length) return <p className="px-5 py-6 text-sm text-destructive">未能載入輕鐵資料</p>;

  return <div>
    <div className="mx-5 mt-3 grid grid-cols-2 rounded-2xl bg-muted p-1" role="tablist" aria-label="輕鐵功能分類">
      {([["trains", "下班列車"], ["route", "路線"]] as const).map(([value, label]) => (
        <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-xl px-2 py-2.5 text-sm font-semibold ${tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>
      ))}
    </div>

    {tab === "route" && <>
      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2"><div className="rounded-full bg-primary/10 p-2 text-primary"><TramFront size={18} /></div><div><h2 className="font-bold">輕鐵路線規劃</h2><p className="text-xs text-muted-foreground">選擇任意站點，查看行程時間及車資</p></div></div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <StationPicker label="起點" value={fromId} stations={allStations} onChange={setFrom} exclude={toId} />
          <button type="button" aria-label="互換起點及終點" title="互換起點及終點" onClick={() => { setFrom(toId); setTo(fromId); }} className="mx-auto rounded-full border bg-card p-2 text-primary transition hover:bg-muted sm:mb-1">
            <ArrowUpDown size={17} />
          </button>
          <StationPicker label="終點" value={toId} stations={allStations} onChange={setTo} exclude={fromId} />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />支援不同路線之間轉乘，時間為估算值</div>
      </div>
      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm shadow-sm">
        {!plan ? <p className="text-muted-foreground">請選擇不同的起點及終點</p> : <>
          <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 font-semibold"><Clock size={16} className="text-primary" />預計行程時間</p><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">約 {Math.ceil((plan.stops.length - 1) * MIN_PER_STOP + plan.transfers * 4 + 2)} 分鐘</span></div>
          <p className="mt-2 text-base font-semibold">{allStations.find((s) => s.id === fromId)?.name} <ArrowRight className="mx-1 inline text-muted-foreground" size={15} /> {allStations.find((s) => s.id === toId)?.name}</p>
<p className="mt-1 text-xs text-muted-foreground">{plan.stops.length - 1} 個站 · {plan.transfers ? `轉乘 ${plan.transfers} 次` : `直達 ${plan.segments[0]!.route} 號車`}</p>
  <div className="mt-3 space-y-2">{plan.segments.map((segment, segmentIndex) => <div key={`${segment.route}-${segmentIndex}`} className="rounded-xl bg-muted/50 p-2.5"><p className="text-xs font-semibold">乘搭 <span className="text-primary">{segment.route} 號車</span>（往 {segment.dir}）</p><p className="mt-1 text-xs text-muted-foreground">{segment.from.name} → {segment.to.name} · {segment.stops.length - 1} 個站</p></div>)}{plan.transfers > 0 && <p className="flex items-center gap-1 text-xs font-semibold text-primary"><ArrowRight size={12} />在 {plan.segments[0]!.to.name}：{plan.segments[0]!.route} 號車轉乘 {plan.segments[1]!.route} 號車</p>}</div>
          <div className="mt-4 border-t pt-3"><p className="flex items-center gap-2 font-semibold"><Wallet size={16} className="text-primary" />對應車資</p>{fare.data ? <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">{([["八達通成人", fare.data.octopusAdult], ["單程票成人", fare.data.singleAdult], ["八達通學生", fare.data.octopusStudent], ["八達通小童", fare.data.octopusChild], ["八達通長者", fare.data.octopusElderly]] as const).map(([label, value]) => <div key={label} className="flex justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5"><span className="text-muted-foreground">{label}</span><b>${value.toFixed(1)}</b></div>)}</div> : <p className="mt-1 text-xs text-muted-foreground">暫未有此起終點的車資資料，請以現場收費為準</p>}</div>
        </>}
      </div>
    </>}

    {tab === "trains" && <div className="mx-5 mt-3 space-y-3"><div className="rounded-2xl border bg-card p-4"><StationPicker label="車站" value={staId} stations={allStations} onChange={setSta} /><p className="mt-2 text-xs text-muted-foreground">選擇車站後查看該站各月台的下班列車。</p></div>{sched.data?.map((platform) => <div key={platform.platform} className="rounded-2xl border bg-card p-4"><p className="mb-2 text-sm font-semibold">{platform.platform} 號月台</p>{platform.trains.length ? platform.trains.map((train, index) => <div key={index} className="flex items-center justify-between border-t py-2 text-sm first:border-0"><span><b className="mr-2 rounded-md px-2 py-0.5 text-xs text-white" style={{ background: LRT_COLOR }}>{train.route}</b><span className="text-muted-foreground">往</span> <b>{train.dest}</b><span className="ml-1 text-xs text-muted-foreground">（終點站）</span></span><b className="text-primary">{train.time}</b></div>) : <p className="text-xs text-muted-foreground">暫無列車</p>}</div>)}{sched.isLoading && <p className="text-sm text-muted-foreground">載入班次中…</p>}{!sched.isLoading && !sched.data?.length && <p className="text-sm text-muted-foreground">暫無班次</p>}</div>}
  </div>;
}
