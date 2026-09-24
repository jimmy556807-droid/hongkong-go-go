import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWeather } from "@/lib/hk.functions";
import { PageHeader } from "@/components/BottomNav";

export const Route = createFileRoute("/weather")({
  head: () => ({
    meta: [
      { title: "香港天氣 — 港行" },
      { name: "description", content: "香港天文台實時氣溫、濕度、天氣警告及七天預報。" },
      { property: "og:title", content: "香港天氣 — 港行" },
      { property: "og:description", content: "香港天文台實時氣溫、濕度、天氣警告及七天預報。" },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  const q = useQuery({ queryKey: ["weather"], queryFn: useServerFn(getWeather), refetchInterval: 300000 });
  const d = q.data;
  return (
    <div>
      <PageHeader title="天氣" sub={d?.updateTime ? `更新於 ${new Date(d.updateTime).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" })}` : "香港天文台"} />
      {q.isLoading && <p className="mx-5 text-muted-foreground">載入中…</p>}
      {d && (
        <>
          <div className="mx-5 flex items-center justify-between rounded-2xl bg-primary p-5 text-primary-foreground">
            <div><p className="text-6xl font-bold">{d.temp}°</p><p className="text-sm opacity-80">相對濕度 {d.humidity}%</p></div>
            {d.icon && <img src={`https://www.hko.gov.hk/images/HKOWxIconOutline/pic${d.icon}.png`} alt="" className="h-20 w-20" />}
          </div>
          {d.warnings.length > 0 && (
            <div className="mx-5 mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">生效警告：{d.warnings.join("、")}</div>
          )}
          <p className="mx-5 mt-4 text-sm text-muted-foreground">{d.general}</p>
          <div className="mx-5 mt-4 divide-y rounded-2xl border bg-card">
            {d.forecast.map((f: { date: string; week: string; desc: string; min: number; max: number }) => (
              <div key={f.date} className="flex items-center gap-3 px-4 py-3">
                <div className="w-14 text-sm"><p className="font-semibold">{f.week}</p><p className="text-xs text-muted-foreground">{f.date.slice(4, 6)}/{f.date.slice(6)}</p></div>
                <p className="flex-1 text-xs text-muted-foreground line-clamp-2">{f.desc}</p>
                <p className="text-sm font-semibold">{f.min}°–{f.max}°</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
