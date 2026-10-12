import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LocateFixed, MapPin, RefreshCw, TramFront, Wallet } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getTramEta, TRAM_STOPS, type TramStop } from "@/lib/tram.functions";
import { useCurrentLocation } from "@/components/BottomNav";

export function TramPanel() {
  const [direction, setDirection] = useState<"eastbound" | "westbound">("eastbound");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TramStop>(TRAM_STOPS[0]!);
  const { position, locate } = useCurrentLocation();
  const etaFn = useServerFn(getTramEta);
  const stops = useMemo(() => TRAM_STOPS.filter((s) => s.direction === direction && `${s.name}${s.nameEn}${s.alias ?? ""}${s.code}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    if (!position) return 0;
    return ((a.lat - position.lat) ** 2 + (a.lng - position.lng) ** 2) - ((b.lat - position.lat) ** 2 + (b.lng - position.lng) ** 2);
  }), [direction, position, search]);
  const eta = useQuery({ queryKey: ["tram-eta", selected.code, direction], queryFn: () => etaFn({ data: { stationCode: selected.code, direction } }), refetchInterval: 20000, enabled: Boolean(selected) });

  return <section className="space-y-3 px-5 pb-6 pt-3">
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold"><TramFront size={18} className="text-[#d83b2d]" />香港電車 · 叮叮</div>
      <div className="mt-3 grid grid-cols-2 rounded-xl bg-muted p-1" role="tablist" aria-label="電車行駛方向">
        {([["eastbound", "東行 · 跑馬地／筲箕灣"], ["westbound", "西行 · 上環／堅尼地城"]] as const).map(([value, label]) => <button key={value} onClick={() => { setDirection(value); setSelected(TRAM_STOPS.find((s) => s.direction === value)!); }} className={`rounded-lg px-2 py-2 text-xs font-semibold ${direction === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`} aria-selected={direction === value}>{label}</button>)}
      </div>
    </div>
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2"><MapPin size={16} className="text-[#d83b2d]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋電車站，例如太古城" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button type="button" onClick={locate} aria-label="按距離排序" className="rounded-lg p-1.5 text-primary hover:bg-muted"><LocateFixed size={17} /></button></div>
      <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">{stops.map((stop) => <button key={stop.code} onClick={() => setSelected(stop)} className={`rounded-full border px-3 py-1.5 text-xs ${selected.code === stop.code ? "border-[#d83b2d] bg-[#d83b2d] text-white" : "border-border"}`}>{stop.name}</button>)}</div>
    </div>
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between"><div><p className="font-semibold">{selected.name}站</p><p className="text-xs text-muted-foreground">{selected.nameEn} · 官方實時資料</p></div><button type="button" onClick={() => eta.refetch()} className="rounded-lg p-2 text-primary hover:bg-muted" aria-label="刷新到站資料"><RefreshCw size={17} className={eta.isFetching ? "animate-spin" : ""} /></button></div>
      {eta.isLoading ? <p className="mt-5 text-sm text-muted-foreground">載入中…</p> : eta.error ? <p className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">暫時未能取得到站資料</p> : <div className="mt-3 space-y-2">{eta.data?.length ? eta.data.map((train, index) => <div key={`${train.dest}-${index}`} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-3"><span className="text-sm">往 {train.dest}{train.etaType === "ACTUAL" ? <small className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600">實時 GPS</small> : null}</span><strong className={train.arrivingIn === "ARRIVED" || train.arrivingIn === 0 ? "text-[#d83b2d]" : "text-primary"}>{train.arrivingIn === "ARRIVED" ? "已到站" : train.arrivingIn === 0 ? "即將抵達" : `約 ${train.arrivingIn} 分鐘`}</strong></div>) : <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">暫無班次資料</p>}</div>}
    </div>
    <div className="rounded-2xl border bg-card p-4 text-sm"><p className="flex items-center gap-2 font-semibold"><Wallet size={16} className="text-[#d83b2d]" />劃一票價</p><p className="mt-2 text-muted-foreground">成人 $3.0 · 小童 $1.5 · 長者 $1.3 · $2 乘車優惠</p><p className="mt-2 text-xs text-muted-foreground">後門上車，前門拍卡下車。</p></div>
  </section>;
}
