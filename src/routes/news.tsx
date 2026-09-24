import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNews } from "@/lib/hk.functions";
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
  const q = useQuery({ queryKey: ["news"], queryFn: useServerFn(getNews), refetchInterval: 60000 });
  return (
    <div>
      <PageHeader title="特別交通消息" sub="運輸署 · 每分鐘自動更新" />
      {q.isLoading && <p className="mx-5 text-muted-foreground">載入中…</p>}
      {q.isError && <p className="mx-5 text-destructive">暫時無法載入消息</p>}
      {q.data?.length === 0 && <p className="mx-5 text-muted-foreground">暫無特別交通消息</p>}
      <div className="mx-5 space-y-3">
        {q.data?.map((i) => (
          <article key={i.id} className="rounded-2xl border-l-4 border-primary bg-card p-4 shadow-sm">
            <p className="whitespace-pre-line text-sm leading-relaxed">{i.text}</p>
            <p className="mt-2 text-xs text-muted-foreground">{i.date}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
