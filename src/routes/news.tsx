import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getJourneyTimes, getNews } from "@/lib/hk.functions";
import { PageHeader } from "@/components/BottomNav";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "特別交通消息 — 港行" },
      { name: "description", content: "運輸署實時特別交通消息，包括封路、事故及改道安排。" },
      { property: "og:title", content: "特別交通消息 — 港行" },
      { property: "og:description", content: "運輸署實時特別交通消息，包括封路、事故及改道安排。" },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const [tab, setTab] = useState<"news" | "journey">("news");
  const news = useQuery({ queryKey: ["news"], queryFn: useServerFn(getNews), refetchInterval: 60000, enabled: tab === "news" });
  const journey = useQuery({ queryKey: ["journey-times"], queryFn: useServerFn(getJourneyTimes), refetchInterval: 120000, enabled: tab === "journey" });
  const [region, setRegion] = useState<"全部" | "港島" | "九龍" | "新界">("全部");
  const grouped = useMemo(() => {
    const rows = (journey.data ?? []).filter((item) => region === "全部" || item.region === region);
    return rows.reduce<Record<string, typeof rows>>((groups, item) => {
      (groups[item.locationId] ??= []).push(item);
      return groups;
    }, {});
  }, [journey.data, region]);

  return (
    <div>
      <PageHeader title="交通資訊" sub=""/>
      <div className="mx-5 mb-5 flex rounded-xl bg-muted p-1" role="tablist" aria-label="交通資訊類別">
        <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${tab === "news" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`} onClick={() => setTab("news")} role="tab" aria-selected={tab === "news"}>特別交通消息</button>
        <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${tab === "journey" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`} onClick={() => setTab("journey")} role="tab" aria-selected={tab === "journey"}>行車時間顯示器</button>
      </div>
      {tab === "news" ? (
        <section aria-label="特別交通消息">
          {news.isLoading && <p className="mx-5 text-muted-foreground">載入中…</p>}
          {news.isError && <p className="mx-5 text-destructive">暫時無法載入消息</p>}
          {news.data?.length === 0 && <p className="mx-5 text-muted-foreground">暫無特別交通消息</p>}
          <div className="mx-5 flex flex-col gap-3">{news.data?.map((item) => <article key={item.id} className="rounded-2xl border-l-4 border-primary bg-card p-4 shadow-sm"><p className="whitespace-pre-line text-sm leading-relaxed">{item.text}</p><p className="mt-2 text-xs text-muted-foreground">{item.date}</p></article>)}</div>
        </section>
      ) : (
        <section aria-label="行車時間顯示器" className="mx-5">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="地區分類">{(["全部", "港島", "九龍", "新界"] as const).map((item) => <button key={item} onClick={() => setRegion(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm ${region === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} aria-selected={region === item}>{item}</button>)}</div>
          {journey.isLoading && <p className="text-muted-foreground">載入行車時間資料中…</p>}
          {journey.isError && <p className="text-destructive">暫時無法載入行車時間資料，請稍後再試。</p>}
          {!journey.isLoading && !journey.isError && !Object.keys(grouped).length && <p className="text-muted-foreground">目前沒有可用資料。</p>}
          <div className="flex flex-col gap-3">{Object.entries(grouped).map(([locationId, items]) => <article key={locationId} className="rounded-2xl border bg-card p-4 shadow-sm"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-semibold">{locationId}</p><p className="text-sm text-muted-foreground">{items[0]?.locationName}</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{items[0]?.region}</span></div><div className="flex flex-col gap-2">{items.map((item) => <div key={`${item.locationId}-${item.destinationId}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2"><span className="text-sm">{item.destinationName}</span><span className={`font-semibold ${item.colourId === "1" ? "text-destructive" : item.colourId === "2" ? "text-amber-600" : "text-emerald-600"}`}>{item.journeyType === "1" ? `${item.journeyData} 分鐘` : item.journeyDesc || "狀況提示"}</span></div>)}</div></article>)}</div>
        </section>
      )}
    </div>
  );
}
