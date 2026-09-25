import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { getMtr } from "@/lib/hk.functions";
import { LINES, STATIONS } from "@/lib/mtr-data";
import { PageHeader, Countdown, useNow } from "@/components/BottomNav";

export const Route = createFileRoute("/mtr")({
  head: () => ({
    meta: [
      { title: "港鐵下一班車 — 港行" },
      { name: "description", content: "港鐵路線搜尋、車站詳情、列車到站倒數及預計行程時間。" },
      { property: "og:title", content: "港鐵下一班車 — 港行" },
      { property: "og:description", content: "港鐵路線搜尋、車站詳情、列車到站倒數及預計行程時間。" },
    ],
  }),
  component: MtrPage,
});

const MIN_PER_STOP = 2.3;
type Line = (typeof LINES)[number];

function toHkIso(t: string) { return t.replace(" ", "T") + "+08:00"; }

function MtrPage() {
  const [line, setLine] = useState<Line>(LINES[0]!);
  const [sta, setSta] = useState(line.stations[4]!);
  const [dest, setDest] = useState(line.stations[line.stations.length - 1]!);
  const now = useNow();
  const fn = useServerFn(getMtr);
  const q = useQuery({ queryKey: ["mtr", line.code, sta], queryFn: () => fn({ data: { line: line.code, sta } }), refetchInterval: 20000 });
  const groups = q.data ? [{ k: "UP", t: q.data.up }, { k: "DOWN", t: q.data.down }].filter((g) => g.t.length) : [];
  const otherLines = LINES.filter((l) => l.code !== line.code && l.stations.includes(sta));

  const i = line.stations.indexOf(sta), j = line.stations.indexOf(dest);
  const n = Math.abs(j - i);
  // UP = towards end of list in MTR data for most lines
  const wantUp = j > i;
  const next = (wantUp ? q.data?.up : q.data?.down)?.[0];
  const waitMin = next ? Math.max(0, (new Date(toHkIso(next.time)).getTime() - now) / 60000) : null;
  const ride = Math.round(n * MIN_PER_STOP);

  const selectLine = (l: Line) => { setLine(l); setSta(l.stations[0]!); setDest(l.stations[l.stations.length - 1]!); };

  return (
    <div>
      <PageHeader title="地鐵" sub="港鐵實時班次" />
      <div className="flex gap-2 overflow-x-auto px-5 pb-2">
        {LINES.map((l) => (
          <button key={l.code} onClick={() => selectLine(l)}
            className="shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium"
            style={line.code === l.code ? { background: l.color, color: "white", borderColor: l.color } : { borderColor: l.color }}>
            {l.name}
          </button>
        ))}
      </div>

      <div className="mx-5 mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">起點
          <select value={sta} onChange={(e) => setSta(e.target.value)} className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground">
            {line.stations.map((s) => <option key={s} value={s}>{STATIONS[s] ?? s}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">終點
          <select value={dest} onChange={(e) => setDest(e.target.value)} className="mt-1 w-full rounded-xl border bg-card px-3 py-3 text-base font-semibold text-foreground">
            {line.stations.map((s) => <option key={s} value={s}>{STATIONS[s] ?? s}</option>)}
          </select>
        </label>
      </div>

      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold"><Clock size={16} className="text-primary" />預計行程時間</p>
        {n === 0 ? <p className="mt-1 text-muted-foreground">請選擇不同的起點和終點</p> : (
          <>
            <p className="mt-1">{STATIONS[sta]} → {STATIONS[dest]}（{n} 個站）乘車約 <b className="text-lg text-primary">{ride}</b> 分鐘</p>
            {waitMin != null && <p className="text-muted-foreground">下班車 {Math.round(waitMin)} 分鐘後，預計 {new Date(now + (waitMin + ride) * 60000).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Hong_Kong" })} 到達</p>}
          </>
        )}
      </div>

      <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold"><MapPin size={16} className="text-primary" />{STATIONS[sta]}站 詳情</p>
        <p className="mt-1 text-muted-foreground">車站代號 {sta} · {line.name}第 {i + 1} 站</p>
        {otherLines.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">轉乘：
            {otherLines.map((l) => (
              <button key={l.code} onClick={() => { setLine(l); setDest(l.stations[l.stations.length - 1]!); }} className="rounded-full px-2 py-0.5 text-xs text-white" style={{ background: l.color }}>{l.name}</button>
            ))}
          </div>
        )}
      </div>

      {line.firstLast && (
        <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
          <p className="font-semibold">首末班車（{line.name}，約數）</p>
          <p className="mt-1">往{STATIONS[line.stations[line.stations.length - 1]!]}：首班 {line.firstLast.up[0]} · 尾班 {line.firstLast.up[1]}</p>
          <p>往{STATIONS[line.stations[0]!]}：首班 {line.firstLast.down[0]} · 尾班 {line.firstLast.down[1]}</p>
          <p className="mt-1 text-xs text-muted-foreground">各站實際時間略有不同，以港鐵公布為準</p>
        </div>
      )}

      {q.isLoading && <p className="mx-5 mt-6 text-muted-foreground">載入中…</p>}
      {q.data?.delay && <p className="mx-5 mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">列車服務延誤</p>}
      {q.data && !groups.length && <p className="mx-5 mt-6 text-muted-foreground">暫無班次資料{q.data.message ? `（${q.data.message}）` : ""}</p>}
      <div className="mx-5 mt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.k} className="overflow-hidden rounded-2xl border bg-card">
            <div className="px-4 py-2 text-sm font-semibold text-white" style={{ background: line.color }}>往 {STATIONS[g.t[0]!.dest] ?? g.t[0]!.dest}</div>
            {g.t.map((t, k) => (
              <div key={k} className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-muted-foreground">{t.plat} 號月台 · {t.time.slice(11, 16)}</span>
                <Countdown at={toHkIso(t.time)} now={now} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
