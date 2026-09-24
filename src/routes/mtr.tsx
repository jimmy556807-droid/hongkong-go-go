import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMtr } from "@/lib/hk.functions";
import { LINES, STATIONS } from "@/lib/mtr-data";
import { PageHeader } from "@/components/BottomNav";

export const Route = createFileRoute("/mtr")({
  head: () => ({
    meta: [
      { title: "港鐵下一班車 — 港行" },
      { name: "description", content: "選擇港鐵綫及車站，查看實時下一班列車時間。" },
      { property: "og:title", content: "港鐵下一班車 — 港行" },
      { property: "og:description", content: "選擇港鐵綫及車站，查看實時下一班列車時間。" },
    ],
  }),
  component: MtrPage,
});

function MtrPage() {
  const [line, setLine] = useState(LINES[0]);
  const [sta, setSta] = useState(LINES[0].stations[4]);
  const fn = useServerFn(getMtr);
  const q = useQuery({ queryKey: ["mtr", line.code, sta], queryFn: () => fn({ data: { line: line.code, sta } }), refetchInterval: 20000 });
  const groups = q.data ? [q.data.up, q.data.down].filter((g) => g.length) : [];
  return (
    <div>
      <PageHeader title="地鐵" sub="港鐵實時班次" />
      <div className="flex gap-2 overflow-x-auto px-5 pb-2">
        {LINES.map((l) => (
          <button key={l.code} onClick={() => { setLine(l); setSta(l.stations[0]); }}
            className="shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium"
            style={line.code === l.code ? { background: l.color, color: "white", borderColor: l.color } : { borderColor: l.color }}>
            {l.name}
          </button>
        ))}
      </div>
      <div className="mx-5 mt-2">
        <select value={sta} onChange={(e) => setSta(e.target.value)} className="w-full rounded-xl border bg-card px-4 py-3 text-lg font-semibold">
          {line.stations.map((s) => <option key={s} value={s}>{STATIONS[s] ?? s}</option>)}
        </select>
      </div>
      {q.isLoading && <p className="mx-5 mt-6 text-muted-foreground">載入中…</p>}
      {q.data?.delay && <p className="mx-5 mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">列車服務延誤</p>}
      {q.data && !groups.length && <p className="mx-5 mt-6 text-muted-foreground">暫無班次資料{q.data.message ? `（${q.data.message}）` : ""}</p>}
      <div className="mx-5 mt-4 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi} className="overflow-hidden rounded-2xl border bg-card">
            <div className="px-4 py-2 text-sm font-semibold text-white" style={{ background: line.color }}>往 {STATIONS[g[0].dest] ?? g[0].dest}</div>
            {g.map((t, i) => (
              <div key={i} className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-muted-foreground">{t.plat} 號月台 · {t.time.slice(11, 16)}</span>
                <span className="font-bold">{t.ttnt === "0" ? "即將到達" : `${t.ttnt} 分鐘`}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
