import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Ship, Search, Clock, MapPin, Wallet } from "lucide-react";
import { PageHeader } from "@/components/BottomNav";
import { FerryTimetableDialog } from "@/components/FerryTimetableDialog";
import { getFerryRoutes } from "@/lib/ferry.functions";

const ferryQuery = queryOptions({ queryKey: ["ferry-routes"], queryFn: () => getFerryRoutes(), staleTime: 3600_000 });

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
  loader: ({ context }) => context.queryClient.ensureQueryData(ferryQuery),
  component: FerryPage,
});

const TABS = [
  { k: "ALL", l: "全部" },
  { k: "INNER", l: "港內線" },
  { k: "OUTLYING", l: "港外線" },
  { k: "KAITO", l: "街渡" },
];

function FerryPage() {
  const { data } = useSuspenseQuery(ferryQuery);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const list = data.filter(
    (r) => (tab === "ALL" || r.district === tab) && (!q || (r.name + r.stops.map((s) => s.name).join("")).includes(q)),
  );
  return (
    <div>
      <PageHeader title="渡輪" sub={`共 ${data.length} 條航線`} />
      <div className="mx-5 flex items-center gap-2 rounded-xl border bg-card px-3">
        <Search size={18} className="text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋碼頭或目的地，例如 長洲" className="w-full bg-transparent py-3 outline-none" />
      </div>
      <div className="mx-5 mt-3 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`shrink-0 rounded-full border px-3 py-1 text-sm ${tab === t.k ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
            {t.l}
          </button>
        ))}
      </div>
      <div className="mx-5 mt-3 flex flex-col gap-5 pb-4">
        {TABS.slice(1).map((group) => {
          const items = list.filter((r) => r.district === group.k);
          if (!items.length) return null;
          return (
            <section key={group.k} className="flex flex-col gap-3" aria-labelledby={`ferry-${group.k}`}>
              <h2 id={`ferry-${group.k}`} className="flex items-baseline justify-between text-sm font-semibold">
                <span>{group.l}</span>
                <span className="text-xs font-normal text-muted-foreground">{items.length} 條航線</span>
              </h2>
              {items.map((r) => (
          <div key={r.key} className="rounded-2xl border bg-card">
            <button onClick={() => setOpen(open === r.key ? null : r.key)} className="flex w-full items-center gap-4 p-4 text-left">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Ship size={20} /></span>
              <div className="flex-1">
                <p className="font-semibold">{r.from} {r.bidirectional ? "⇄" : "→"} {r.to}</p>
                <p className="text-xs text-muted-foreground">
                  {r.stops.length} 個碼頭{r.journeyTime ? ` · 航程約 ${r.journeyTime} 分鐘` : ""}{r.bidirectional ? " · 雙向" : ""}
                </p>
              </div>
              <span className="text-right text-sm font-semibold text-primary">{r.fare ? `$${r.fare.toFixed(1)}` : "—"}</span>
            </button>
            {open === r.key && (
              <div className="space-y-2 border-t px-4 py-3 text-sm">
                <p className="flex items-center gap-1"><Wallet size={14} className="text-primary" />成人全程車資 {r.fare ? `$${r.fare.toFixed(1)}` : "未提供"}</p>
                {r.journeyTime > 0 && <p className="flex items-center gap-1"><Clock size={14} className="text-primary" />航程約 {r.journeyTime} 分鐘</p>}
                {r.note && <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{r.note}</p>}
                {r.district === "KAITO" && (r.operator || r.schedule || r.fareDetail) && (
                  <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-3 text-xs">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">街渡服務詳情 {r.serviceCode ? `· ${r.serviceCode}` : ""}</p>
                    </div>
                    <div className="grid gap-1 text-muted-foreground">
                      {r.operator && <p>營辦商：{r.operator}</p>}
                      {r.phone && <p>查詢電話：{r.phone}</p>}
                      {r.schedule && <p>服務時間：{r.schedule}</p>}
                      {r.fareDetail && <p>收費及備註：{r.fareDetail}</p>}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-1 font-semibold">停靠碼頭</p>
                  <ol className="space-y-1">
                    {r.stops.map((s) => (
                      <li key={s.seq}>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                          <MapPin size={14} className="text-primary" />{s.seq}. {s.name}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
                {r.link && <FerryTimetableDialog link={r.link} title={`${r.from} ${r.bidirectional ? "⇄" : "→"} ${r.to}`} />}
              </div>
            )}
          </div>
              ))}
            </section>
          );
        })}
        {!list.length && <p className="text-sm text-muted-foreground">找不到相關航線</p>}
      </div>
    </div>
  );
}
