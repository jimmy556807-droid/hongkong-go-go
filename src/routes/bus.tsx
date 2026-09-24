import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { getBus } from "@/lib/hk.functions";
import { PageHeader, minsUntil } from "@/components/BottomNav";

export const Route = createFileRoute("/bus")({
  head: () => ({
    meta: [
      { title: "巴士到站時間 — 港行" },
      { name: "description", content: "輸入九巴路線，查看每個車站的實時到站時間。" },
      { property: "og:title", content: "巴士到站時間 — 港行" },
      { property: "og:description", content: "輸入九巴路線，查看每個車站的實時到站時間。" },
    ],
  }),
  component: BusPage,
});

function BusPage() {
  const [input, setInput] = useState("1A");
  const [route, setRoute] = useState("1A");
  const [dir, setDir] = useState<"outbound" | "inbound">("outbound");
  const fn = useServerFn(getBus);
  const q = useQuery({ queryKey: ["bus", route, dir], queryFn: () => fn({ data: { route, dir } }), refetchInterval: 30000 });
  return (
    <div>
      <PageHeader title="巴士" sub="九巴 / 龍運實時到站" />
      <form className="mx-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); setRoute(input.trim().toUpperCase()); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="路線，例如 1A" className="flex-1 rounded-xl border bg-card px-4 py-3 text-lg font-semibold uppercase outline-none focus:ring-2 focus:ring-ring" />
        <button aria-label="搜尋" className="rounded-xl bg-primary px-4 text-primary-foreground"><Search /></button>
        <button type="button" aria-label="轉方向" onClick={() => setDir(dir === "outbound" ? "inbound" : "outbound")} className="rounded-xl border bg-card px-4"><ArrowLeftRight /></button>
      </form>
      {q.data?.dest && <p className="mx-5 mt-4 text-sm text-muted-foreground"><b className="text-foreground text-lg mr-2">{q.data.route}</b>往 {q.data.dest}</p>}
      {q.isLoading && <p className="mx-5 mt-6 text-muted-foreground">載入中…</p>}
      {q.isError && <p className="mx-5 mt-6 text-destructive">無法載入，請檢查路線</p>}
      {q.data && q.data.stops.length === 0 && <p className="mx-5 mt-6 text-muted-foreground">找不到此路線</p>}
      <ol className="mx-5 mt-4 border-l-2 border-primary/30">
        {q.data?.stops.map((s) => (
          <li key={s.seq} className="relative pb-4 pl-5">
            <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
            <p className="font-medium">{s.name}</p>
            <p className="text-sm text-primary">{s.etas.length ? s.etas.map(minsUntil).join(" · ") : <span className="text-muted-foreground">暫無班次</span>}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
