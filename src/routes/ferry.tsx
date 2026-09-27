import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ship, Search, Clock } from "lucide-react";
import { PageHeader, Countdown, useNow } from "@/components/BottomNav";

export const Route = createFileRoute("/ferry")({
  head: () => ({
    meta: [
      { title: "渡輪航線 — 港行" },
      { name: "description", content: "搜尋香港渡輪航線，查看碼頭詳情、下一班開船倒數及航程時間。" },
      { property: "og:title", content: "渡輪航線 — 港行" },
      { property: "og:description", content: "搜尋香港渡輪航線，查看碼頭詳情、下一班開船倒數及航程時間。" },
    ],
  }),
  component: FerryPage,
});

// start/end in minutes after midnight; every = approximate interval (min); dur = crossing time (min)
const ROUTES = [
  { from: "中環七號碼頭", to: "尖沙咀", op: "天星小輪", start: 390, end: 1410, every: 10, dur: 9, fare: [5.0, 6.5] },
  { from: "灣仔", to: "尖沙咀", op: "天星小輪", start: 450, end: 1380, every: 15, dur: 8, fare: [5.0, 6.5] },
  { from: "中環五號碼頭", to: "長洲", op: "新渡輪", start: 330, end: 1410, every: 40, dur: 55, fare: [15.9, 23.4] },
  { from: "中環六號碼頭", to: "梅窩", op: "新渡輪", start: 350, end: 1410, every: 45, dur: 50, fare: [17.1, 25.0] },
  { from: "中環四號碼頭", to: "南丫島榕樹灣", op: "港九小輪", start: 390, end: 1440, every: 40, dur: 30, fare: [20.8, 28.7] },
  { from: "中環三號碼頭", to: "愉景灣", op: "愉景灣航運", start: 360, end: 1440, every: 20, dur: 25, fare: [49.0, 49.0] },
  { from: "中環六號碼頭", to: "坪洲", op: "港九小輪", start: 390, end: 1410, every: 45, dur: 40, fare: [18.3, 26.5] },
  { from: "北角", to: "紅磡", op: "新渡輪", start: 420, end: 1140, every: 20, dur: 10, fare: [6.3, 6.3] },
];

function nextDepartures(r: (typeof ROUTES)[number], now: number, count = 3) {
  const hk = new Date(now + 8 * 3600000); // HK local via UTC fields
  const mins = hk.getUTCHours() * 60 + hk.getUTCMinutes() + hk.getUTCSeconds() / 60;
  const out: number[] = [];
  for (let t = r.start; t <= r.end && out.length < count; t += r.every) if (t > mins) out.push(now + (t - mins) * 60000);
  return out;
}

function FerryPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const now = useNow();
  const list = ROUTES.map((r, i) => ({ ...r, i })).filter((r) => !q || (r.from + r.to + r.op).includes(q));
  const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return (
    <div>
      <PageHeader title="渡輪" sub="班次為按時間表估算，以營運商公佈為準" />
      <div className="mx-5 flex items-center gap-2 rounded-xl border bg-card px-3">
        <Search size={18} className="text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋碼頭或目的地，例如 長洲" className="w-full bg-transparent py-3 outline-none" />
      </div>
      <div className="mx-5 mt-3 space-y-3">
        {list.map((r) => {
          const deps = nextDepartures(r, now);
          return (
            <div key={r.i} className="rounded-2xl border bg-card">
              <button onClick={() => setOpen(open === r.i ? null : r.i)} className="flex w-full items-center gap-4 p-4 text-left">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Ship size={20} /></span>
                <div className="flex-1">
                  <p className="font-semibold">{r.from} → {r.to}</p>
                  <p className="text-xs text-muted-foreground">{r.op} · 航程約 {r.dur} 分鐘</p>
                  <p className="mt-0.5 text-xs"><span className="text-muted-foreground">成人車資 </span><b className="text-primary">平日 ${r.fare[0]!.toFixed(1)}</b>{r.fare[1] !== r.fare[0] && <span className="text-muted-foreground"> · 假日 ${r.fare[1]!.toFixed(1)}</span>}<span className="text-muted-foreground"> · 長者 $2（65 歲以上）· 小童約半價</span></p>
                </div>
                <span className="text-right text-sm">{deps[0] ? <Countdown at={deps[0]} now={now} /> : <span className="text-muted-foreground">今日已停航</span>}</span>
              </button>
              {open === r.i && (
                <div className="border-t px-4 py-3 text-sm">
                  <p>服務時間 {fmt(r.start)}–{fmt(r.end)} · 約每 {r.every} 分鐘一班</p>
                  <p className="mt-2 flex items-center gap-1 font-semibold"><Clock size={14} className="text-primary" />下幾班開船</p>
                  {deps.map((d, k) => (
                    <p key={k} className="flex justify-between text-muted-foreground">
                      <span>{new Date(d).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Hong_Kong" })} 開 → 約 {new Date(d + r.dur * 60000).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Hong_Kong" })} 到</span>
                      <Countdown at={d} now={now} />
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!list.length && <p className="text-sm text-muted-foreground">找不到相關航線</p>}
      </div>
    </div>
  );
}
