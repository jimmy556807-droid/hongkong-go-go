import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bus,
  TrainFront,
  Ship,
  TriangleAlert,
  Thermometer,
  Droplets,
  Sparkles,
  Footprints,
  ArrowRight,
  Clock,
  Wallet,
  Lightbulb,
  Loader2,
  Star,
  Trash2,
  MapPin,
  CloudSun,
} from "lucide-react";
import { getNews, getWeather } from "@/lib/hk.functions";
import { planTrip, type Leg } from "@/lib/trip.functions";
import { PageHeader, LocationButton, useCurrentLocation } from "@/components/BottomNav";
import { FareSaverCard } from "@/components/FareSaverCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "港行" },
      { name: "description", content: "香港巴士、港鐵、渡輪實時資訊，天氣及特別交通消息一站睇。" },
      { property: "og:title", content: "港行 — 實時香港交通" },
      {
        property: "og:description",
        content: "香港巴士、港鐵、渡輪實時資訊，天氣及特別交通消息一站睇。",
      },
    ],
  }),
  component: Index,
});

const SPOTS = ["中環", "尖沙咀", "旺角", "銅鑼灣", "觀塘", "沙田", "屯門", "機場"];
const MODE_ICON = { mtr: TrainFront, bus: Bus, ferry: Ship, walk: Footprints } as const;

type Fav = { id: string; from: string; to: string; prefs: string[] };
const FAV_KEY = "hk-transit-favs";

function formatClock(date: Date) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function LiveClock() {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const updateTime = () => setTime(formatClock(new Date()));
    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      aria-label={`目前時間 ${time}`}
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.08] px-2.5 py-1.5 shadow-sm shadow-primary/5"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span className="h-3.5 w-px bg-primary/20" aria-hidden="true" />
      <span className="font-mono text-xs font-bold tabular-nums tracking-[0.12em] text-foreground">
        {time}
      </span>
    </div>
  );
}

function loadFavs(): Fav[] {
  try {
    const v = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function useFavs() {
  const [favs, setFavs] = useState<Fav[]>([]);
  useEffect(() => setFavs(loadFavs()), []);
  const save = (f: Fav) => {
    setFavs((v) => {
      const next = [f, ...v.filter((x) => !(x.from === f.from && x.to === f.to))].slice(0, 8);
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };
  const remove = (id: string) => {
    setFavs((v) => {
      const next = v.filter((x) => x.id !== id);
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };
  return { favs, save, remove };
}

function LegRow({ leg }: { leg: Leg }) {
  const I = MODE_ICON[leg.mode];
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <I size={16} />
      </span>
      <div className="min-w-0 flex-1 pb-3">
        <p className="text-sm font-semibold">
          {leg.name} <span className="font-normal text-muted-foreground">· 約 {leg.mins} 分鐘</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {leg.from} → {leg.to}
        </p>
        {leg.note && <p className="mt-0.5 text-xs text-muted-foreground">{leg.note}</p>}
        {leg.live && (
          <p className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {leg.live}
          </p>
        )}
      </div>
    </li>
  );
}

function Planner() {
  const { position, status, placeName } = useCurrentLocation();
  const [to, setTo] = useState("");
  const from = placeName ?? (position ? `目前位置（${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}）` : "");
  const { favs, save, remove } = useFavs();
  const plan = useServerFn(planTrip);
  const m = useMutation({ mutationFn: () => plan({ data: { from: from.trim(), to: to.trim() } }) });
  const running = m.isPending && m.submittedAt > 0;
  const ready = !!(from.trim() && to.trim());
  const [idx, setIdx] = useState(0);
  const plans = m.data?.plans ?? [];
  const p = plans[Math.min(idx, Math.max(plans.length - 1, 0))];
  return (
    <section className="mx-5 mt-4 rounded-2xl border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkles size={18} className="text-primary" />
        網上 AI 路線搜尋
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        AI 會搜尋網上交通資料，再綜合天氣、交通消息、行車時間、港鐵、巴士及渡輪規劃路線。
      </p>

      <div className="relative mt-3 rounded-xl border bg-background">
        <div className="flex items-center gap-2 px-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
          <input
            value={from}
            readOnly
            aria-label="目前定位出發地"
            placeholder={status === "loading" ? "正在取得目前位置…" : "請允許定位以設定出發地"}
            className="w-full bg-transparent py-3 pr-10 text-sm outline-none"
          />
        </div>
        <div className="mx-3 border-t" />
        <div className="flex items-center gap-2 px-3">
          <MapPin size={12} className="shrink-0 text-destructive" />
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="目的地，例如：沙田"
            className="w-full bg-transparent py-3 pr-10 text-sm outline-none"
          />
        </div>

      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {SPOTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTo(s)}
            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => save({ id: crypto.randomUUID(), from: from.trim(), to: to.trim(), prefs: [] })}
          aria-label="收藏行程"
          className="grid w-12 place-items-center rounded-xl border border-primary text-primary disabled:opacity-50"
        >
          <Star size={16} />
        </button>
        <button
          type="button"
          disabled={!ready || running}
          onClick={() => { setIdx(0); m.mutate(); }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-md shadow-primary/20 disabled:opacity-50"
        >
          {running ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              睇緊天氣同路況…
            </>
          ) : (
            <>
              一鍵出發
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {favs.length > 0 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {favs.map((f) => (
            <span
              key={f.id}
              className="flex shrink-0 items-center gap-1 rounded-full border bg-background py-1 pl-3 pr-1 text-xs"
            >
              <button type="button" onClick={() => setTo(f.to)}>
                目前位置 → {f.to}
              </button>
              <button
                type="button"
                onClick={() => remove(f.id)}
                aria-label="刪除收藏"
                className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground"
              >
                <Trash2 size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {(m.isError || m.data?.error) && (
        <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {m.data?.error ?? "規劃失敗，請稍後再試。"}
        </p>
      )}

      {plans.length > 1 && (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {plans.map((x, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold ${p === x ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
            >
              {i === 0 ? <Sparkles size={13} /> : <Bus size={13} />}
              {i === 0 ? "最平最快" : "巴士路線"}
              <span className="font-normal">· {x.totalMins} 分</span>
            </button>
          ))}
        </div>
      )}

      {p && (
        <article className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <h3 className="text-sm font-bold">{p === plans[0] ? "最平最快・" : "巴士路線・"}{p.title}</h3>
          {m.data?.locations && (
            <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
              {m.data.locations.from && <p>出發地：{m.data.locations.from.displayName}</p>}
              {m.data.locations.to && <p>目的地：{m.data.locations.to.displayName}</p>}
              <p>
                {m.data.locations.from ? `${m.data.locations.from.lat.toFixed(5)}, ${m.data.locations.from.lng.toFixed(5)}` : "出發地未能定位"}
                {" → "}
                {m.data.locations.to ? `${m.data.locations.to.lat.toFixed(5)}, ${m.data.locations.to.lng.toFixed(5)}` : "目的地未能定位"}
              </p>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-card p-2.5">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} /> 預計時間
              </p>
              <p className="mt-0.5 text-xl font-bold text-primary">
                {p.totalMins}
                <span className="ml-0.5 text-xs font-medium">分鐘</span>
              </p>
            </div>
            <div className="rounded-lg bg-card p-2.5">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet size={12} /> 預計車資
              </p>
              <p className="mt-0.5 text-xl font-bold text-primary">{p.fare || "—"}</p>
            </div>
          </div>
          {(p.weatherNote || m.data?.weather) && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-card p-2 text-xs">
              <CloudSun size={14} className="mt-0.5 shrink-0 text-primary" />
              <span>
                {p.weatherNote}
                {m.data?.weather && (
                  <span className="block text-muted-foreground">{m.data.weather}</span>
                )}
              </span>
            </p>
          )}
          {p.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              {p.tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
          <ul className="mt-3">
            {p.legs.map((l, j) => (
              <LegRow key={j} leg={l} />
            ))}
          </ul>
          {p.tip && (
            <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
              <Lightbulb size={13} className="mt-0.5 shrink-0" />
              {p.tip}
            </p>
          )}
          {!!p.sources?.length && (
            <div className="mt-3 rounded-lg border bg-card p-2.5">
              <p className="text-xs font-semibold text-muted-foreground">網上參考來源</p>
              <ul className="mt-1.5 space-y-1">
                {p.sources.map((source) => (
                  <li key={source.url} className="text-xs">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {source.title}
                    </a>
                    {source.snippet && <span className="ml-1 text-muted-foreground">— {source.snippet}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            建議由 AI 生成，實際班次及車資以官方公布為準。
          </p>
        </article>
      )}
    </section>
  );
}

function Index() {
  const w = useQuery({
    queryKey: ["weather"],
    queryFn: useServerFn(getWeather),
    refetchInterval: 300000,
  });
  const n = useQuery({ queryKey: ["news"], queryFn: useServerFn(getNews), refetchInterval: 60000 });
  const tiles = [
    { to: "/bus", icon: Bus, label: "九巴到站" },
    { to: "/mtr", icon: TrainFront, label: "港鐵班次" },
    { to: "/ferry", icon: Ship, label: "渡輪航線" },
  ] as const;
  return (
    <div>
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">港行</h1>
            <LiveClock />
          </div>
        </div>
        <LocationButton />
      </div>
      <div className="mx-5 rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-sm opacity-80">香港天文台</p>
        <div className="mt-1 flex items-end gap-4">
          <span className="text-5xl font-bold">{w.data?.temp ?? "--"}°</span>
          <span className="flex items-center gap-1 pb-2 text-sm">
            <Droplets size={14} />
            {w.data?.humidity ?? "--"}%
          </span>
        </div>
        {!!w.data?.warnings.length && (
          <p className="mt-2 text-sm font-medium">⚠ {w.data.warnings.join("、")}</p>
        )}
      </div>
      <Planner />
      <FareSaverCard />
      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        {tiles.map(({ to, icon: I, label }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-sm font-medium"
          >
            <I className="text-primary" /> {label}
          </Link>
        ))}
      </div>
      <section className="mx-5 mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <TriangleAlert size={18} className="text-primary" />
            最新交通消息
          </h2>
          <Link to="/news" className="text-sm text-primary">
            ���部
          </Link>
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
    </div>
  );
}
