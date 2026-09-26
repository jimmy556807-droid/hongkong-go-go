import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bus, TrainFront, Ship, TriangleAlert, Thermometer, Droplets,
  Sparkles, Footprints, ArrowRight, Clock, Wallet, Lightbulb, Loader2,
  Star, Trash2, Play,
} from "lucide-react";
import { getNews, getWeather } from "@/lib/hk.functions";
import { planTrip, type Leg } from "@/lib/trip.functions";
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

const SPOTS = ["中環", "尖沙咀", "旺角", "銅鑼灣", "觀塘", "沙田", "屯門", "機場"];
const PREFS = ["最快到達", "最少轉乘", "行少啲路", "港鐵優先", "巴士優先"];
const MODE_ICON = { mtr: TrainFront, bus: Bus, ferry: Ship, walk: Footprints } as const;

type Fav = { id: string; from: string; to: string; prefs: string[] };
const FAV_KEY = "hk-transit-favs";

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
        <p className="text-sm font-semibold">{leg.name} <span className="font-normal text-muted-foreground">· 約 {leg.mins} 分鐘</span></p>
        <p className="truncate text-xs text-muted-foreground">{leg.from} → {leg.to}</p>
        {leg.note && <p className="mt-0.5 text-xs text-muted-foreground">{leg.note}</p>}
        {leg.live && <p className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{leg.live}</p>}
      </div>
    </li>
  );
}

function Planner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [prefs, setPrefs] = useState<string[]>(["最快到達"]);
  const [active, setActive] = useState<"from" | "to">("from");
  const { favs, save, remove } = useFavs();
  const plan = useServerFn(planTrip);
  const m = useMutation({ mutationFn: () => plan({ data: { from, to, prefs } }) });

  const toggle = (p: string) => setPrefs((v) => (v.includes(p) ? v.filter((x) => x !== p) : [...v, p]));
  const canSave = from.trim() && to.trim();
  const applyFav = (f: Fav) => {
    setFrom(f.from);
    setTo(f.to);
    setPrefs(f.prefs);
  };

  return (
    <section className="mx-5 mt-4 rounded-2xl border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-primary" />智能行程規劃</h2>
      <p className="mt-1 text-xs text-muted-foreground">輸入起點同目的地，結合實時交通同天氣為你安排路線。<span className="text-primary">（智能建議暫停中，可先收藏常用行程）</span></p>

      {favs.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Star size={12} className="text-primary" />常用行程</p>
          <div className="space-y-1.5">
            {favs.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
                <button type="button" onClick={() => applyFav(f)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{f.from} → {f.to}</p>
                  {f.prefs.length > 0 && <p className="truncate text-xs text-muted-foreground">{f.prefs.join("、")}</p>}
                </button>
                <button type="button" onClick={() => applyFav(f)} aria-label="載入行程" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Play size={14} /></button>
                <button type="button" onClick={() => remove(f.id)} aria-label="刪除收藏" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 space-y-2">
        <input value={from} onFocus={() => setActive("from")} onChange={(e) => setFrom(e.target.value)} placeholder="出發地，例如：中環" className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <input value={to} onFocus={() => setActive("to")} onChange={(e) => setTo(e.target.value)} placeholder="目的地，例如：沙田" className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SPOTS.map((s) => (
          <button key={s} type="button" onClick={() => (active === "from" ? setFrom(s) : setTo(s))} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{s}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PREFS.map((p) => (
          <button key={p} type="button" onClick={() => toggle(p)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${prefs.includes(p) ? "bg-primary text-primary-foreground" : "border text-muted-foreground"}`}>{p}</button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => save({ id: crypto.randomUUID(), from: from.trim(), to: to.trim(), prefs })}
          className="flex items-center justify-center gap-2 rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-primary disabled:opacity-50"
        >
          <Star size={16} />收藏
        </button>
        <button
          type="button"
          disabled
          title="智能建議暫停中"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground opacity-50"
        >
          {m.isPending ? <><Loader2 size={16} className="animate-spin" />規劃緊路線…</> : <>一鍵出發（暫停中）<ArrowRight size={16} /></>}
        </button>
      </div>

      {m.isError && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">規劃失敗，請稍後再試。</p>}
      {m.data?.error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{m.data.error}</p>}

      {!!m.data?.plans.length && (
        <div className="mt-4 space-y-3">
          {m.data.plans.map((p, i) => (
            <article key={i} className={`rounded-xl border p-3 ${i === 0 ? "border-primary/40 bg-primary/5" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold">{i === 0 ? "推薦・" : ""}{p.title}</h3>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"><Clock size={13} />{p.totalMins} 分鐘</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {p.fare && <span className="flex items-center gap-1"><Wallet size={12} />{p.fare}</span>}
                {p.tags.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5">{t}</span>)}
              </div>
              <ul className="mt-3">{p.legs.map((l, j) => <LegRow key={j} leg={l} />)}</ul>
              {p.tip && <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground"><Lightbulb size={13} className="mt-0.5 shrink-0" />{p.tip}</p>}
            </article>
          ))}
          <p className="text-center text-xs text-muted-foreground">建議由 AI 生成，實際班次以官方公布為準。</p>
        </div>
      )}
    </section>
  );
}

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
      <Planner />
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
