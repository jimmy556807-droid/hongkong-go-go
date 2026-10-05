import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, ArrowRight, Wallet, Navigation, DoorOpen } from "lucide-react";
import { getMtr } from "@/lib/hk.functions";
import { getMtrFare } from "@/lib/fare.functions";
import { LrtPanel } from "@/components/LrtPanel";
const AIRPORT_EXPRESS_FARES: Record<string, { octopus: number; single: number }> = {
  "HOK-AIR": { octopus: 110, single: 120 },
  "KOW-AIR": { octopus: 100, single: 105 },
  "TSY-AIR": { octopus: 65, single: 75 },
  "HOK-AWE": { octopus: 110, single: 120 },
  "KOW-AWE": { octopus: 100, single: 105 },
  "TSY-AWE": { octopus: 65, single: 75 },
};

function FareBox({
  fare,
}: {
  fare: {
    octAdult: number;
    octStudent: number;
    octChild: number;
    octElder: number;
    single: number;
    singleChild: number;
  };
}) {
  return (
    <div className="mt-3 border-t pt-3">
      <p className="flex items-center gap-2 font-semibold">
        <Wallet size={16} className="text-primary" />
        車資詳情
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">八達通成人</span>
          <b>${fare.octAdult.toFixed(1)}</b>
        </div>
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">單程票成人</span>
          <b>${fare.single.toFixed(1)}</b>
        </div>
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">八達通學生</span>
          <b>${fare.octStudent.toFixed(1)}</b>
        </div>
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">八達通小童</span>
          <b>${fare.octChild.toFixed(1)}</b>
        </div>
      </div>
    </div>
  );
}

function AirportExpressFareBox({ from, to }: { from: string; to: string }) {
  const fare = AIRPORT_EXPRESS_FARES[`${from}-${to}`] ?? AIRPORT_EXPRESS_FARES[`${to}-${from}`];
  if (!fare) return null;

  return (
    <div className="mt-3 border-t pt-3">
      <p className="flex items-center gap-2 font-semibold">
        <Wallet size={16} className="text-[#00888A]" />
        機場快綫車資詳情
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">八達通成人</span>
          <b>${fare.octopus.toFixed(1)}</b>
        </div>
        <div className="flex justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
          <span className="text-muted-foreground">單程票成人</span>
          <b>${fare.single.toFixed(1)}</b>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        適用於香港／九龍／青衣往返機場或博覽館；機場快綫不設學生及小童單程票此項顯示。
      </p>
    </div>
  );
}

import { LINES, STATIONS, STATION_DETAILS } from "@/lib/mtr-data";
import { PageHeader, Countdown, useCurrentLocation, useNow } from "@/components/BottomNav";

export const Route = createFileRoute("/mtr")({
  head: () => ({
    meta: [
      { title: "港鐵下一班車 — 港行" },
      {
        name: "description",
        content: "港鐵路線搜尋、跨綫轉乘、車站詳情、列車到站倒數及預計行程時間。",
      },
      { property: "og:title", content: "港鐵下一班車 — 港行" },
      {
        property: "og:description",
        content: "港鐵路線搜尋、跨綫轉乘、車站詳情、列車到站倒數及預計行程時間。",
      },
    ],
  }),
  component: MtrPage,
});

const MIN_PER_STOP = 2.3;
const TRANSFER_MIN = 4;
type Line = (typeof LINES)[number];

const LINE_BY_CODE = Object.fromEntries(LINES.map((l) => [l.code, l]));

function StationOptions({ mode }: { mode: "mtr" | "lrt" }) {
  const visibleLines = LINES.filter((l) =>
    mode === "lrt" ? l.code.startsWith("LRT") : !l.code.startsWith("LRT"),
  );
  return (
    <>
      {visibleLines.map((l) => (
        <optgroup key={l.code} label={l.name}>
          {l.stations.map((code) => (
            <option key={`${l.code}-${code}`} value={code} style={{ color: l.color }}>
              ● {STATIONS[code] ?? code}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

type Seg = { line: Line; from: string; to: string; stops: number };

// Dijkstra over (station, line) states: ride 1 stop = 1, change line at same station = 2
function planRoute(
  from: string,
  to: string,
): { segs: Seg[]; stops: number; transfers: number } | null {
  if (from === to) return null;
  const key = (s: string, l: string) => `${s}|${l}`;
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const pq: [number, string][] = [];
  const push = (d: number, k: string) => {
    pq.push([d, k]);
    pq.sort((a, b) => a[0] - b[0]);
  };
  for (const l of LINES)
    if (l.stations.includes(from)) {
      dist.set(key(from, l.code), 0);
      push(0, key(from, l.code));
    }
  let endKey = "";
  while (pq.length) {
    const [d, k] = pq.shift()!;
    if (d > (dist.get(k) ?? Infinity)) continue;
    const [s, lc] = k.split("|") as [string, string];
    if (s === to) {
      endKey = k;
      break;
    }
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
  for (let i = 0; i < path.length;) {
    const [s, lc] = path[i]!.split("|") as [string, string];
    let j = i;
    while (j + 1 < path.length && path[j + 1]!.split("|")[1] === lc) j++;
    const [e] = path[j]!.split("|") as [string];
    if (s !== e) segs.push({ line: LINE_BY_CODE[lc]!, from: s, to: e, stops: j - i });
    i = j + 1;
  }
  return { segs, stops: segs.reduce((a, x) => a + x.stops, 0), transfers: segs.length - 1 };
}

function toHkIso(t: string) {
  return t.replace(" ", "T") + "+08:00";
}

function MtrPage() {
  const [mode, setMode] = useState<"mtr" | "lrt">("mtr");
  const [line, setLine] = useState<Line>(LINES[0]!);
  const [sta, setSta] = useState("CEN");
  const [dest, setDest] = useState("TSW");
  const [activeTab, setActiveTab] = useState<"route" | "trains" | "station">("trains");
  const [stationListOpen, setStationListOpen] = useState(false);
  const { position, locate } = useCurrentLocation();
  const now = useNow();
  const stationDetails = STATION_DETAILS[sta];

  useEffect(() => {
    if (!position || activeTab !== "trains") return;
    const nearest = Object.entries(STATION_DETAILS)
      .filter(([code]) => !code.startsWith("LRT"))
      .map(([code, details]) => {
        const [lat, lng] = details.coordinates;
        const distance = (lat - position.lat) ** 2 + (lng - position.lng) ** 2;
        return { code, distance };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest) return;
    const nearestLine = LINES.find((candidate) => candidate.stations.includes(nearest.code));
    if (nearestLine) setLine(nearestLine);
    setSta(nearest.code);
  }, [activeTab, position]);
  const fn = useServerFn(getMtr);
  const fareFn = useServerFn(getMtrFare);

  const route = useMemo(() => planRoute(sta, dest), [sta, dest]);
  const boardLine = route?.segs[0]?.line ?? line;
  const isAirportExpressRoute = route?.segs.some((segment) => segment.line.code === "AEL") ?? false;
  const fareQuery = useQuery({
    queryKey: ["mtr-fare", sta, dest],
    queryFn: () => fareFn({ data: { from: sta, to: dest } }),
    enabled: Boolean(route) && !isAirportExpressRoute,
  });

  const q = useQuery({
    queryKey: ["mtr", boardLine.code, sta],
    queryFn: () => fn({ data: { line: boardLine.code, sta } }),
    refetchInterval: 20000,
  });
  const groups = q.data
    ? [
        { k: "UP", t: q.data.up },
        { k: "DOWN", t: q.data.down },
      ].filter((g) => g.t.length)
    : [];
  const otherLines = LINES.filter((l) => l.code !== boardLine.code && l.stations.includes(sta));

  // direction of first segment for live wait time
  const seg0 = route?.segs[0];
  const wantUp = seg0
    ? seg0.line.stations.indexOf(seg0.to) > seg0.line.stations.indexOf(seg0.from)
    : true;
  const next = (wantUp ? q.data?.up : q.data?.down)?.[0];
  const waitMin = next ? Math.max(0, (new Date(toHkIso(next.time)).getTime() - now) / 60000) : null;
  const ride = route ? Math.round(route.stops * MIN_PER_STOP + route.transfers * TRANSFER_MIN) : 0;

  const selectLine = (l: Line) => {
    setLine(l);
    setSta(l.stations[0]!);
    setDest(l.stations[l.stations.length - 1]!);
  };

  return (
    <div>
      <PageHeader title="地鐵及輕鐵" />
      <div
        className="mx-5 mt-3 grid grid-cols-2 rounded-2xl bg-muted p-1"
        role="tablist"
        aria-label="交通工具分類"
      >
        {(
          [
            ["mtr", "地鐵"],
            ["lrt", "輕鐵"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
  onClick={() => {
  setMode(value);
  if (value === "mtr") locate();
              const firstLine = LINES.find((candidate) =>
                value === "lrt"
                  ? candidate.code.startsWith("LRT")
                  : !candidate.code.startsWith("LRT"),
              )!;
              selectLine(firstLine);
            }}
            className={`rounded-xl px-2 py-2 text-sm font-semibold transition-colors ${mode === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            aria-pressed={mode === value}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "lrt" ? (
        <LrtPanel />
      ) : (
        <>
          <div
            className="mx-5 mt-3 grid grid-cols-3 rounded-2xl bg-muted p-1"
            role="tablist"
            aria-label="地鐵功能分類"
          >
            {(
              [
                ["trains", "下班列車"],
                ["route", "路線規劃"],
                ["station", "車站詳情"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={activeTab === value}
                onClick={() => setActiveTab(value)}
                className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors ${activeTab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab !== "trains" && (
            <div className="flex gap-2 overflow-x-auto px-5 pb-2 pt-3">
              {LINES.filter((l) => !l.code.startsWith("LRT")).map((l) => (
                <button
                  key={l.code}
                  onClick={() => selectLine(l)}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium"
                  style={
                    line.code === l.code
                      ? { background: l.color, color: "white", borderColor: l.color }
                      : { borderColor: l.color }
                  }
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}

          {activeTab === "route" && (
            <>
              <div className="mx-5 mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  起點（按路線選擇）
                  <select
                    value={sta}
                    onChange={(e) => setSta(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground"
                  >
                    <StationOptions mode={mode} />
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  終點（按路線選擇）
                  <select
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground"
                  >
                    <StationOptions mode={mode} />
                  </select>
                </label>
              </div>

              <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <Clock size={16} className="text-primary" />
                  預計行程時間
                </p>
                {!route ? (
                  <p className="mt-1 text-muted-foreground">請選擇不同的起點和終點</p>
                ) : (
                  <>
                    <p className="mt-1">
                      {STATIONS[sta]} → {STATIONS[dest]}（{route.stops} 個站
                      {route.transfers > 0 ? ` · 轉乘 ${route.transfers} 次` : ""}）約{" "}
                      <b className="text-lg text-primary">{ride}</b> 分鐘
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {route.segs.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 font-medium text-white"
                            style={{ background: s.line.color }}
                          >
                            {s.line.name}
                          </span>
                          <span className="text-muted-foreground">
                            {STATIONS[s.from]} <ArrowRight size={10} className="inline" />{" "}
                            {STATIONS[s.to]}（{s.stops} 站）
                          </span>
                        </div>
                      ))}
                    </div>
                    {waitMin != null && (
                      <p className="mt-2 text-muted-foreground">
                        下班車 {Math.round(waitMin)} 分鐘後，預計{" "}
                        {new Date(now + (waitMin + ride) * 60000).toLocaleTimeString("zh-HK", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Hong_Kong",
                        })}{" "}
                        到達
                      </p>
                    )}
                    {isAirportExpressRoute ? (
                      route.segs
                        .filter((segment) => segment.line.code === "AEL")
                        .map((segment) => (
                          <AirportExpressFareBox
                            key={`${segment.from}-${segment.to}`}
                            from={segment.from}
                            to={segment.to}
                          />
                        ))
                    ) : fareQuery.data ? (
                      <FareBox fare={fareQuery.data} />
                    ) : null}
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "station" && (
            <>
              <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      <MapPin size={16} className="text-primary" />
                      {STATIONS[sta]}站詳情
                      <span>車站代號 {sta}</span>
                    </p>
                  </div>
                </div>
                {otherLines.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    轉乘：
                    {otherLines.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => setLine(l)}
                        className="rounded-full px-2 py-0.5 text-xs text-white"
                        style={{ background: l.color }}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-card p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <Clock size={16} className="text-primary" />
                    服務時間
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    {stationDetails?.openingHours ?? "05:50 – 01:00"}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                      <span className="block text-muted-foreground">首班車</span>
                      <b className="mt-0.5 block text-sm">{stationDetails?.firstTrain ?? "—"}</b>
                    </div>
                    <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                      <span className="block text-muted-foreground">尾班車</span>
                      <b className="mt-0.5 block text-sm">{stationDetails?.lastTrain ?? "—"}</b>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    開放時間｜首班車｜尾班車；實際時間或因特別安排調整
                  </p>
                </div>
                <div className="rounded-2xl border bg-card p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <Navigation size={16} className="text-primary" />
                    途經路線
                  </p>
                  <p className="mt-2 font-bold">{boardLine.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    第 {boardLine.stations.indexOf(sta) + 1} 站
                  </p>
                </div>
              </div>

              <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <Navigation size={16} className="text-primary" />
                  站內洗手間位置
                </p>
                <p className="mt-2 text-muted-foreground">
                  {stationDetails?.toiletLocation ?? "無"}
                </p>
              </div>

              <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <DoorOpen size={16} className="text-primary" />
                  出口資訊
                </p>
                <div className="mt-3 space-y-2">
                  {(stationDetails?.exits ?? [{ code: "—", places: "出口資料載入中" }]).map(
                    (exit) => (
                      <div
                        key={exit.code}
                        className="flex gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
                      >
                        <span className="min-w-8 rounded-md bg-card px-1.5 py-0.5 text-center font-bold text-primary shadow-sm">
                          {exit.code}
                        </span>
                        <span className="text-muted-foreground">{exit.places}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {line.firstLast && (
                <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
                  <p className="font-semibold">首末班車（{line.name}，約數）</p>
                  <p className="mt-1">
                    往{STATIONS[line.stations[line.stations.length - 1]!]}：首班{" "}
                    {line.firstLast.up[0]} · 尾班 {line.firstLast.up[1]}
                  </p>
                  <p>
                    往{STATIONS[line.stations[0]!]}：首班 {line.firstLast.down[0]} · 尾班{" "}
                    {line.firstLast.down[1]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    各站實際時間略有不同，以港鐵公布為準
                  </p>
                </div>
              )}

              <div className="mx-5 mt-3 overflow-hidden rounded-2xl border bg-card text-sm">
                <button
                  type="button"
                  onClick={() => setStationListOpen((open) => !open)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold"
                  aria-expanded={stationListOpen}
                >
                  <span className="flex items-center gap-2">
                    <MapPin size={16} style={{ color: line.color }} />
                    {line.name}車站清單
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {stationListOpen ? "收回" : `展開（${line.stations.length}站）`}
                  </span>
                </button>
                {stationListOpen && (
                  <div className="border-t px-4 py-3">
                    <ol className="space-y-1.5">
                      {line.stations.map((code, index) => (
                        <li key={code}>
                          <button
                            type="button"
                            onClick={() => {
                              setSta(code);
                              setLine(line);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted ${code === sta ? "bg-primary/10 font-semibold text-foreground" : "text-muted-foreground"}`}
                            aria-current={code === sta ? "location" : undefined}
                          >
                            <span
                              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ background: line.color }}
                            >
                              {index + 1}
                            </span>
                            <span>{STATIONS[code]}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "trains" && (
            <>
              <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <Clock size={16} className="text-primary" />
                  <span>下班列車</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {STATIONS[sta]}站 · {boardLine.name} · 每 20 秒更新
                </p>
              </div>

              {q.isLoading && <p className="mx-5 mt-6 text-muted-foreground">載入中…</p>}
              {q.data?.delay && (
                <p className="mx-5 mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  列車服務延誤
                </p>
              )}
              {q.data && !groups.length && (
                <p className="mx-5 mt-6 text-muted-foreground">
                  暫無班次資料{q.data.message ? `（${q.data.message}）` : ""}
                </p>
              )}
              <div className="mx-5 mt-4 space-y-4">
                {groups.map((g) => {
                  const destinationGroups =
                    boardLine.code === "EAL"
                      ? Array.from(
                          g.t.reduce((map, train) => {
                            const destination = train.dest === "LOW" || train.dest === "羅湖"
                              ? "羅湖"
                              : train.dest === "LMC" || train.dest === "落馬洲"
                                ? "落馬洲"
                                : STATIONS[train.dest] ?? train.dest;
                            const trains = map.get(destination) ?? [];
                            trains.push(train);
                            map.set(destination, trains);
                            return map;
                          }, new Map<string, typeof g.t>()),
                          ([destination, trains]) => ({ destination, trains }),
                        )
                      : [
                          {
                            destination: STATIONS[g.t[0]!.dest] ?? g.t[0]!.dest,
                            trains: g.t,
                          },
                        ];

                  return destinationGroups.map(({ destination, trains }) => (
                    <div key={`${g.k}-${destination}`} className="overflow-hidden rounded-2xl border bg-card">
                      <div
                        className="px-4 py-2 text-sm font-semibold text-white"
                        style={{ background: boardLine.color }}
                      >
                        往 {destination}
                      </div>
                      {trains.map((t, k) => (
                        <div key={k} className="flex items-center justify-between border-t px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {t.plat} 號月台 · {t.time.slice(11, 16)}
                          </span>
                          <Countdown at={toHkIso(t.time)} now={now} />
                        </div>
                      ))}
                    </div>
                  ));
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
