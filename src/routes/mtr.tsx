import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, MapPin, ArrowRight, Wallet, Navigation, DoorOpen, LocateFixed } from "lucide-react";
import { getMtr } from "@/lib/hk.functions";
import { getMtrFare } from "@/lib/fare.functions";

function MtrFareBox({ from, to }: { from: string; to: string }) {
  const fn = useServerFn(getMtrFare);
  const q = useQuery({ queryKey: ["mtrFare", from, to], queryFn: () => fn({ data: { from, to } }), staleTime: 86400000 });
  const f = q.data;
  const rows: [string, number | undefined][] = [
    ["八達通成人", f?.octAdult], ["八達通學生", f?.octStudent], ["八達通小童", f?.octChild],
    ["長者優惠", f?.octElder], ["單程票成人", f?.single], ["單程票小童", f?.singleChild],
  ];
  return (
    <div className="mt-3 border-t pt-3">
      <p className="flex items-center gap-2 font-semibold"><Wallet size={16} className="text-primary" />車資詳情</p>
      {q.isLoading && <p className="mt-1 text-muted-foreground">載入中…</p>}
      {q.isError && <p className="mt-1 text-muted-foreground">暫時未能取得車資</p>}
      {q.data === null && <p className="mt-1 text-muted-foreground">此行程暫無車資資料</p>}
      {f && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5"><span className="text-muted-foreground">{k}</span><b>${v?.toFixed(1)}</b></div>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">資料來源：港鐵公開數據（未計機場快綫及東鐵綫頭等）</p>
    </div>
  );
}
import { LINES, STATIONS, STATION_DETAILS } from "@/lib/mtr-data";
import { PageHeader, Countdown, useNow } from "@/components/BottomNav";

export const Route = createFileRoute("/mtr")({
  head: () => ({
    meta: [
      { title: "港鐵下一班車 — 港行" },
      { name: "description", content: "港鐵路線搜尋、跨綫轉乘、車站詳情、列車到站倒數及預計行程時間。" },
      { property: "og:title", content: "港鐵下一班車 — 港行" },
      { property: "og:description", content: "港鐵路線搜尋、跨綫轉乘、車站詳情、列車到站倒數及預計行程時間。" },
    ],
  }),
  component: MtrPage,
});

const MIN_PER_STOP = 2.3;
const TRANSFER_MIN = 4;
type Line = (typeof LINES)[number];

const ALL_STATIONS = Object.keys(STATIONS).sort((a, b) =>
  STATIONS[a]!.localeCompare(STATIONS[b]!, "zh-HK"),
);
const LINE_BY_CODE = Object.fromEntries(LINES.map((l) => [l.code, l]));

type Seg = { line: Line; from: string; to: string; stops: number };

// Dijkstra over (station, line) states: ride 1 stop = 1, change line at same station = 2
function planRoute(from: string, to: string): { segs: Seg[]; stops: number; transfers: number } | null {
  if (from === to) return null;
  const key = (s: string, l: string) => `${s}|${l}`;
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const pq: [number, string][] = [];
  const push = (d: number, k: string) => {
    pq.push([d, k]);
    pq.sort((a, b) => a[0] - b[0]);
  };
  for (const l of LINES) if (l.stations.includes(from)) {
    dist.set(key(from, l.code), 0);
    push(0, key(from, l.code));
  }
  let endKey = "";
  while (pq.length) {
    const [d, k] = pq.shift()!;
    if (d > (dist.get(k) ?? Infinity)) continue;
    const [s, lc] = k.split("|") as [string, string];
    if (s === to) { endKey = k; break; }
    const line = LINE_BY_CODE[lc]!;
    const i = line.stations.indexOf(s);
    for (const ns of [line.stations[i - 1], line.stations[i + 1]]) {
      if (!ns) continue;
      const nk = key(ns, lc);
      if (d + 1 < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, d + 1);
        prev.set(nk, k);
        push(d + 1, nk);
      }
    }
    for (const l of LINES) {
      if (l.code !== lc && l.stations.includes(s)) {
        const nk = key(s, l.code);
        if (d + 2 < (dist.get(nk) ?? Infinity)) {
          dist.set(nk, d + 2);
          prev.set(nk, k);
          push(d + 2, nk);
        }
      }
    }
  }
  if (!endKey) return null;
  const path: string[] = [];
  for (let k: string | undefined = endKey; k; k = prev.get(k)) path.unshift(k);
  const segs: Seg[] = [];
  for (let i = 0; i < path.length; ) {
    const [s, lc] = path[i]!.split("|") as [string, string];
    let j = i;
    while (j + 1 < path.length && path[j + 1]!.split("|")[1] === lc) j++;
    const [e] = path[j]!.split("|") as [string];
    if (s !== e) segs.push({ line: LINE_BY_CODE[lc]!, from: s, to: e, stops: j - i });
    i = j + 1;
  }
  return { segs, stops: segs.reduce((a, x) => a + x.stops, 0), transfers: segs.length - 1 };
}

function toHkIso(t: string) { return t.replace(" ", "T") + "+08:00"; }

function MtrPage() {
  const [line, setLine] = useState<Line>(LINES[0]!);
  const [sta, setSta] = useState("CEN");
  const [dest, setDest] = useState("TSW");
  const [activeTab, setActiveTab] = useState<"route" | "trains" | "station">("route");
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "denied">("idle");
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const now = useNow();

  const locateNearestStation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = Object.entries(STATION_DETAILS).reduce<{ code: string; distance: number } | null>((best, [code, details]) => {
          const [lat, lng] = details.coordinates;
          const latDelta = (coords.latitude - lat) * 111.32;
          const lngDelta = (coords.longitude - lng) * 111.32 * Math.cos((coords.latitude * Math.PI) / 180);
          const distance = Math.sqrt(latDelta ** 2 + lngDelta ** 2);
          return !best || distance < best.distance ? { code, distance } : best;
        }, null);
        if (nearest) {
          setSta(nearest.code);
          setNearestDistance(nearest.distance);
          const nearestLine = LINES.find((candidate) => candidate.stations.includes(nearest.code));
          if (nearestLine) setLine(nearestLine);
        }
        setLocationStatus("ready");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    locateNearestStation();
  }, [locateNearestStation]);

  const stationDetails = STATION_DETAILS[sta];
  const locationLabel = locationStatus === "loading" ? "定位中…" : locationStatus === "ready" && nearestDistance != null ? `距你約 ${nearestDistance.toFixed(1)} 公里` : "未使用定位";
  const fn = useServerFn(getMtr);

  const route = useMemo(() => planRoute(sta, dest), [sta, dest]);
  const boardLine = route?.segs[0]?.line ?? line;

  const q = useQuery({
    queryKey: ["mtr", boardLine.code, sta],
    queryFn: () => fn({ data: { line: boardLine.code, sta } }),
    refetchInterval: 20000,
  });
  const groups = q.data ? [{ k: "UP", t: q.data.up }, { k: "DOWN", t: q.data.down }].filter((g) => g.t.length) : [];
  const otherLines = LINES.filter((l) => l.code !== boardLine.code && l.stations.includes(sta));

  // direction of first segment for live wait time
  const seg0 = route?.segs[0];
  const wantUp = seg0 ? seg0.line.stations.indexOf(seg0.to) > seg0.line.stations.indexOf(seg0.from) : true;
  const next = (wantUp ? q.data?.up : q.data?.down)?.[0];
  const waitMin = next ? Math.max(0, (new Date(toHkIso(next.time)).getTime() - now) / 60000) : null;
  const ride = route ? Math.round(route.stops * MIN_PER_STOP + route.transfers * TRANSFER_MIN) : 0;

  const selectLine = (l: Line) => { setLine(l); setSta(l.stations[0]!); setDest(l.stations[l.stations.length - 1]!); };

  return (
    <div>
      <PageHeader title="地鐵" sub="港鐵實時班次" />
      <div className="mx-5 mt-3 grid grid-cols-3 rounded-2xl bg-muted p-1" role="tablist" aria-label="地鐵功能分類">
        {([['route', '路線規劃'], ['trains', '下班列車'], ['station', '車站詳情']] as const).map(([value, label]) => (
          <button key={value} role="tab" aria-selected={activeTab === value} onClick={() => setActiveTab(value)}
            className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors ${activeTab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-2 pt-3">
        {LINES.map((l) => (
          <button key={l.code} onClick={() => selectLine(l)}
            className="shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium"
            style={line.code === l.code ? { background: l.color, color: "white", borderColor: l.color } : { borderColor: l.color }}>
            {l.name}
          </button>
        ))}
      </div>

      {activeTab === "route" && <>
      <div className="mx-5 mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">起點（全綫車站）
          <select value={sta} onChange={(e) => setSta(e.target.value)} className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground">
            {ALL_STATIONS.map((s) => <option key={s} value={s}>{STATIONS[s] ?? s}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">終點（全綫車站）
          <select value={dest} onChange={(e) => setDest(e.target.value)} className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground">
            {ALL_STATIONS.map((s) => <option key={s} value={s}>{STATIONS[s] ?? s}</option>)}
          </select>
        </label>
      </div>

      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold"><Clock size={16} className="text-primary" />預計行程時間</p>
        {!route ? <p className="mt-1 text-muted-foreground">請選擇不同的起點和終點</p> : (
          <>
            <p className="mt-1">{STATIONS[sta]} → {STATIONS[dest]}（{route.stops} 個站{route.transfers > 0 ? ` · 轉乘 ${route.transfers} 次` : ""}）約 <b className="text-lg text-primary">{ride}</b> 分鐘</p>
            <div className="mt-2 space-y-1.5">
              {route.segs.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="shrink-0 rounded-full px-2 py-0.5 font-medium text-white" style={{ background: s.line.color }}>{s.line.name}</span>
                  <span className="text-muted-foreground">{STATIONS[s.from]} <ArrowRight size={10} className="inline" /> {STATIONS[s.to]}（{s.stops} 站）</span>
                </div>
              ))}
            </div>
            {waitMin != null && <p className="mt-2 text-muted-foreground">下班車 {Math.round(waitMin)} 分鐘後，預計 {new Date(now + (waitMin + ride) * 60000).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Hong_Kong" })} 到達</p>}
            <MtrFareBox from={sta} to={dest} />
          </>
        )}
      </div>
      </>}

      {activeTab === "station" && <>
      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-semibold"><MapPin size={16} className="text-primary" />{STATIONS[sta]}站詳情</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>車站代號 {sta} · {locationLabel}</span>
              <button
                type="button"
                onClick={locateNearestStation}
                disabled={locationStatus === "loading"}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60"
                aria-label="重新定位最近的地鐵站"
              >
                <LocateFixed size={13} className={locationStatus === "loading" ? "animate-spin" : undefined} />
                {locationStatus === "loading" ? "定位中…" : "重新定位"}
              </button>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">最近車站</span>
        </div>
        {otherLines.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">轉乘：{otherLines.map((l) => <button key={l.code} onClick={() => setLine(l)} className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: l.color }}>{l.name}</button>)}</div>}
      </div>

      <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4 text-sm"><p className="flex items-center gap-2 font-semibold"><Clock size={16} className="text-primary" />服務時間</p><p className="mt-2 text-lg font-bold">{stationDetails?.openingHours ?? "05:50 – 01:00"}</p><p className="mt-1 text-xs text-muted-foreground">實際開放時間或因特別安排調整</p></div>
        <div className="rounded-2xl border bg-card p-4 text-sm"><p className="flex items-center gap-2 font-semibold"><Navigation size={16} className="text-primary" />途經路線</p><p className="mt-2 font-bold">{boardLine.name}</p><p className="mt-1 text-xs text-muted-foreground">第 {boardLine.stations.indexOf(sta) + 1} 站</p></div>
      </div>

      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold"><DoorOpen size={16} className="text-primary" />出口資訊</p>
        <div className="mt-3 space-y-2">{(stationDetails?.exits ?? [{ code: "—", places: "出口資料載入中" }]).map((exit) => <div key={exit.code} className="flex gap-3 rounded-xl bg-muted/60 px-3 py-2.5"><span className="min-w-8 rounded-md bg-card px-1.5 py-0.5 text-center font-bold text-primary shadow-sm">{exit.code}</span><span className="text-muted-foreground">{exit.places}</span></div>)}</div>
      </div>

      {line.firstLast && <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm"><p className="font-semibold">首末班車（{line.name}，約數）</p><p className="mt-1">往{STATIONS[line.stations[line.stations.length - 1]!]}：首班 {line.firstLast.up[0]} · 尾班 {line.firstLast.up[1]}</p><p>往{STATIONS[line.stations[0]!]}：首班 {line.firstLast.down[0]} · 尾班 {line.firstLast.down[1]}</p><p className="mt-1 text-xs text-muted-foreground">各站實際時間略有不同，以港鐵公布為準</p></div>}
      </>}

      {activeTab === "trains" && <>
      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold"><Clock size={16} className="text-primary" />下班列車 <span className="ml-auto flex items-center gap-1 text-xs font-medium text-primary"><LocateFixed size={13} />最近車站</span></p>
        <p className="mt-1 text-muted-foreground">{STATIONS[sta]}站 · {boardLine.name} · {locationLabel} · 每 20 秒更新</p>
      </div>

      {q.isLoading && <p className="mx-5 mt-6 text-muted-foreground">載入中…</p>}
      {q.data?.delay && <p className="mx-5 mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">列車服務延誤</p>}
      {q.data && !groups.length && <p className="mx-5 mt-6 text-muted-foreground">暫無班次資料{q.data.message ? `（${q.data.message}）` : ""}</p>}
      <div className="mx-5 mt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.k} className="overflow-hidden rounded-2xl border bg-card">
            <div className="px-4 py-2 text-sm font-semibold text-white" style={{ background: boardLine.color }}>往 {STATIONS[g.t[0]!.dest] ?? g.t[0]!.dest}</div>
            {g.t.map((t, k) => (
              <div key={k} className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-muted-foreground">{t.plat} 號月台 · {t.time.slice(11, 16)}</span>
                <Countdown at={toHkIso(t.time)} now={now} />
              </div>
            ))}
          </div>
        ))}
      </div>
      </>}
    </div>
  );
}
