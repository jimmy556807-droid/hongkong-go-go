import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { getBorder } from "@/lib/border.functions";

export const Route = createFileRoute("/border")({
  head: () => ({
    meta: [
      { title: "口岸實時人流 — 港行" },
      { name: "description", content: "各陸路口岸出境及入境實時輪候情況，同埋最新出入境人次。" },
      { property: "og:title", content: "口岸實時人流 — 港行" },
      { property: "og:description", content: "各陸路口岸出境及入境實時輪候情況，同埋最新出入境人次。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BorderPage,
});

type Cp = { code?: string; name: string; stat: string; hours: string; suspended?: boolean };
const GROUPS: Array<{ title: string; items: Cp[] }> = [
  {
    title: "鐵路口岸",
    items: [
      { code: "LWS", name: "羅湖", stat: "羅湖", hours: "06:30–00:00" },
      { code: "LSC", name: "落馬洲支線（福田）", stat: "落馬洲支線", hours: "06:30–22:30" },
      { name: "高鐵西九龍", stat: "高鐵西九龍", hours: "06:30–23:30" },
    ],
  },
  {
    title: "陸路公路口岸",
    items: [
      { code: "SBC", name: "深圳灣", stat: "深圳灣", hours: "06:30–00:00" },
      { code: "HZM", name: "港珠澳大橋", stat: "港珠澳大橋", hours: "24 小時" },
      { code: "HYW", name: "香園圍（蓮塘）", stat: "香園圍", hours: "07:00–22:00" },
      { code: "LMC", name: "落馬洲（皇崗）", stat: "落馬洲", hours: "24 小時" },
      { code: "MKT", name: "文錦渡", stat: "文錦渡", hours: "07:00–22:00" },
      { code: "STK", name: "沙頭角", stat: "沙頭角", hours: "旅客通關暫停", suspended: true },
    ],
  }
];

const STATUS: Record<number, { t: string; c: string }> = {
  0: { t: "正常", c: "bg-emerald-100 text-emerald-800" },
  1: { t: "繁忙", c: "bg-amber-100 text-amber-800" },
  2: { t: "非常繁忙", c: "bg-destructive/15 text-destructive" },
  4: { t: "系統維護", c: "bg-muted text-muted-foreground" },
  99: { t: "非服務時間", c: "bg-muted text-muted-foreground" },
};

function Pill({ v }: { v: number | undefined }) {
  const s = v == null ? { t: "—", c: "bg-muted text-muted-foreground" } : (STATUS[v] ?? { t: "—", c: "bg-muted text-muted-foreground" });
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.c}`}>{s.t}</span>;
}

const fmt = (n?: number) => (n == null ? "—" : n.toLocaleString("zh-HK"));

function BorderPage() {
  const fn = useServerFn(getBorder);
  const q = useQuery({ queryKey: ["border"], queryFn: () => fn(), refetchInterval: 5 * 60e3 });
  const [who, setWho] = useState<"resident" | "visitor">("resident");
  const [open, setOpen] = useState<string | null>(null);
  const d = q.data;
  const queue = d?.[who] ?? {};

  return (
    <div className="pb-24">
      <PageHeader title="口岸實時人流" sub="入境處官方資料・輪候每 15 分鐘更新" />
      <div className="mx-5 grid grid-cols-2 rounded-xl bg-muted p-1" role="tablist">
        {(["resident", "visitor"] as const).map((k) => (
          <Button
            key={k}
            role="tab"
            aria-selected={who === k}
            onClick={() => setWho(k)}
            variant="ghost"
            className={`h-9 rounded-lg text-sm font-semibold hover:bg-card ${who === k ? "bg-card shadow-sm hover:bg-card" : "text-muted-foreground"}`}
          >
            {k === "resident" ? "香港居民" : "訪港旅客"}
          </Button>
        ))}
      </div>
      {q.isLoading && <p className="mx-5 mt-4 text-sm text-muted-foreground">載入中…</p>}
      {q.isError && <p className="mx-5 mt-4 text-sm text-destructive">暫時攞唔到口岸資料</p>}

      {GROUPS.map((g) => (
        <section key={g.title} className="mx-5 mt-5">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{g.title}</h2>
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {g.items.map((cp) => {
              const f = d?.stats[cp.stat];
              const isOpen = open === cp.name;
              return (
                <div key={cp.name}>
                  <Button
                    variant="ghost"
                    onClick={() => setOpen(isOpen ? null : cp.name)}
                    aria-expanded={isOpen}
                    className="h-auto w-full flex-col items-stretch rounded-none px-4 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="min-w-0">
                        <b className="block truncate">{cp.name}</b>
                        <span className={`mt-1 flex items-center gap-1 text-xs font-normal ${cp.suspended ? "text-destructive" : "text-muted-foreground"}`}>
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          旅客通關：{cp.hours}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{isOpen ? "收起" : "人次"}</span>
                    </div>
                    <div className="mt-2 grid w-full grid-cols-2 gap-2 text-sm font-normal">
                      <div className="flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
                        <span className="text-muted-foreground">出境</span>
                        {cp.code ? <Pill v={queue[cp.code]?.depQueue} /> : <b>{fmt(f?.dep[3])}</b>}
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/60 px-2.5 py-1.5">
                        <span className="text-muted-foreground">入境</span>
                        {cp.code ? <Pill v={queue[cp.code]?.arrQueue} /> : <b>{fmt(f?.arr[3])}</b>}
                      </div>
                    </div>
                  </Button>
                  {isOpen && (
                    <div className="px-4 pb-3 text-xs">
                      <table className="w-full">
                        <thead className="text-muted-foreground">
                          <tr><th className="text-left font-normal">{d?.statDate} 人次</th><th className="font-normal">居民</th><th className="font-normal">內地</th><th className="font-normal">其他</th><th className="font-normal">總計</th></tr>
                        </thead>
                        <tbody className="text-center tabular-nums">
                          {(["dep", "arr"] as const).map((k) => (
                            <tr key={k}>
                              <td className="text-left">{k === "dep" ? "出境" : "入境"}</td>
                              {[0, 1, 2, 3].map((i) => <td key={i} className={i === 3 ? "font-bold" : ""}>{fmt(f?.[k][i])}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <p className="mx-5 mt-4 text-[11px] text-muted-foreground">
        輪候狀態只限陸路口岸（居民：正常 &lt;15 分鐘、繁忙 &lt;30 分鐘；旅客：正常 &lt;30、繁忙 &lt;45）。高鐵冇實時輪候，顯示最近一日出入境人次。運作時間以入境處最新安排為準。
      </p>
    </div>
  );
}
