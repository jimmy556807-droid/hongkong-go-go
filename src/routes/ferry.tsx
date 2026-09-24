import { createFileRoute } from "@tanstack/react-router";
import { Ship } from "lucide-react";
import { PageHeader } from "@/components/BottomNav";

export const Route = createFileRoute("/ferry")({
  head: () => ({
    meta: [
      { title: "渡輪航線 — 港行" },
      { name: "description", content: "香港主要渡輪航線、營運商及大約班次。" },
      { property: "og:title", content: "渡輪航線 — 港行" },
      { property: "og:description", content: "香港主要渡輪航線、營運商及大約班次。" },
    ],
  }),
  component: FerryPage,
});

const ROUTES = [
  { from: "中環", to: "尖沙咀", op: "天星小輪", freq: "每 6–12 分鐘", time: "06:30–23:30" },
  { from: "灣仔", to: "尖沙咀", op: "天星小輪", freq: "每 8–20 分鐘", time: "07:30–23:00" },
  { from: "中環", to: "長洲", op: "新渡輪", freq: "每 30–60 分鐘", time: "24 小時" },
  { from: "中環", to: "梅窩", op: "新渡輪", freq: "每 30–60 分鐘", time: "05:50–23:30" },
  { from: "中環", to: "南丫島榕樹灣", op: "港九小輪", freq: "每 30–60 分鐘", time: "06:30–00:30" },
  { from: "中環", to: "愉景灣", op: "愉景灣航運", freq: "每 15–30 分鐘", time: "24 小時" },
  { from: "中環", to: "坪洲", op: "港九小輪", freq: "每 30–60 分鐘", time: "24 小時" },
  { from: "北角", to: "紅磡", op: "新渡輪", freq: "每 20 分鐘", time: "07:00–19:00" },
];

function FerryPage() {
  return (
    <div>
      <PageHeader title="渡輪" sub="主要航線及大約班次（以營運商公佈為準）" />
      <div className="mx-5 space-y-3">
        {ROUTES.map((r, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Ship size={20} /></span>
            <div className="flex-1">
              <p className="font-semibold">{r.from} ⇄ {r.to}</p>
              <p className="text-xs text-muted-foreground">{r.op} · {r.time}</p>
            </div>
            <span className="text-right text-sm font-medium text-primary">{r.freq}</span>
          </div>
        ))}
      </div>
      <p className="mx-5 mt-4 text-xs text-muted-foreground">惡劣天氣下渡輪服務可能暫停，請留意天氣頁面的警告信號。</p>
    </div>
  );
}
