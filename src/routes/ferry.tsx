import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/BottomNav";

export const Route = createFileRoute("/ferry")({
  head: () => ({
    meta: [
      { title: "渡輪航線 — 港行" },
      { name: "description", content: "運輸署官方渡輪及街渡航線資料：碼頭、航程時間同成人車資。" },
      { property: "og:title", content: "渡輪航線 — 港行" },
      { property: "og:description", content: "運輸署官方渡輪及街渡航線資料：碼頭、航程時間同成人車資。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FerryPage,
});

function FerryPage() {
  return (
    <div>
      <PageHeader title="渡輪" sub="渡輪資訊已清除" />
      <section className="mx-5 mt-6 rounded-2xl border bg-card p-6 text-center">
        <p className="font-semibold">暫無渡輪資訊</p>
        <p className="mt-2 text-sm text-muted-foreground">目前沒有可顯示的渡輪航線資料。</p>
      </section>
    </div>
  );
}
