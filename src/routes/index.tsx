import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bus, TrainFront, Ship, TriangleAlert, Thermometer, Droplets } from "lucide-react";
import { getNews, getWeather } from "@/lib/hk.functions";
import { PageHeader } from "@/components/BottomNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "港行 — 實時香港交通" },
      { name: "description", content: "香港巴士、港鐵、渡輪實時資訊，天氣及特別交通消息一站睇。" },
      { property: "og:title", content: "港行 — 實時香港交通" },
      { property: "og:description", content: "香港巴士、港鐵、渡輪實時資訊，天氣及特別交通消息一站睇。" },
    ],
  }),
  component: Index,
});

function Index() {
  const w = useQuery({ queryKey: ["weather"], queryFn: useServerFn(getWeather), refetchInterval: 300000 });
  const n = useQuery({ queryKey: ["news"], queryFn: useServerFn(getNews), refetchInterval: 60000 });
  const tiles = [
    { to: "/bus", icon: Bus, label: "九巴到站" },
    { to: "/mtr", icon: TrainFront, label: "港鐵班次" },
    { to: "/ferry", icon: Ship, label: "渡輪航線" },
  ] as const;
  return (
    <div>
      <PageHeader title="港行" sub="實時香港交通資訊" />
      <div className="mx-5 rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-sm opacity-80">香港天文台</p>
        <div className="mt-1 flex items-end gap-4">
          <span className="text-5xl font-bold">{w.data?.temp ?? "--"}°</span>
          <span className="flex items-center gap-1 pb-2 text-sm"><Droplets size={14} />{w.data?.humidity ?? "--"}%</span>
        </div>
        {!!w.data?.warnings.length && <p className="mt-2 text-sm font-medium">⚠ {w.data.warnings.join("、")}</p>}
      </div>
      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        {tiles.map(({ to, icon: I, label }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-sm font-medium">
            <I className="text-primary" /> {label}
          </Link>
        ))}
      </div>
      <section className="mx-5 mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><TriangleAlert size={18} className="text-primary" />最新交通消息</h2>
          <Link to="/news" className="text-sm text-primary">全部</Link>
        </div>
        {n.isLoading && <p className="text-sm text-muted-foreground">載入中…</p>}
        {n.data?.length === 0 && <p className="text-sm text-muted-foreground">暫無特別交通消息</p>}
        <div className="space-y-2">
          {n.data?.slice(0, 3).map((i) => (
            <div key={i.id} className="rounded-xl border bg-card p-3 text-sm">
              <p className="line-clamp-3">{i.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">{i.date}</p>
            </div>
          ))}
        </div>
      </section>
      <p className="mx-5 mt-6 flex items-center gap-1 text-xs text-muted-foreground"><Thermometer size={12} />資料來源：運輸署、九巴、港鐵、香港天文台</p>
    </div>
  );
}
