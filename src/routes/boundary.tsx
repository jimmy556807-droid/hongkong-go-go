import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleAlert, CircleCheck, Clock3, LogIn, LogOut, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/BottomNav";

export const Route = createFileRoute("/boundary")({
  head: () => ({
    meta: [
      { title: "口岸出入境資訊｜香港 Go Go" },
      { name: "description", content: "查看香港各口岸出入境實時資訊。" },
    ],
  }),
  component: BoundaryPage,
});

type CheckpointStatus = { status: number; name: string };
type Checkpoint = {
  code: string;
  cpName: string;
  openTimeLabel: string;
  arrival: Record<string, CheckpointStatus>;
  departure: Record<string, CheckpointStatus>;
};
type CheckpointResponse = { updateDate: string; cpInfoList: Checkpoint[] };

const statusLabels: Record<number, string> = {
  0: "不適用",
  1: "正常",
  2: "繁忙",
  3: "非常繁忙",
  9: "已關閉",
};
const statusStyles: Record<number, string> = {
  1: "text-emerald-600",
  2: "text-amber-600",
  3: "text-red-600",
  9: "text-muted-foreground",
  0: "text-muted-foreground",
};

async function fetchCheckpointStatus() {
  const response = await fetch(`https://www.sb.gov.hk/bwt/json/overview_tc.json?ts=${Date.now()}`);
  if (!response.ok) throw new Error("無法取得口岸資訊");
  return response.json() as Promise<CheckpointResponse>;
}

function StatusItem({ label, value }: { label: string; value?: CheckpointStatus }) {
  const status = value?.status ?? 0;
  const Icon = status === 1 ? CircleCheck : status === 3 ? CircleAlert : Clock3;
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-medium ${statusStyles[status]}`}>
        <Icon aria-hidden="true" size={15} />
        {statusLabels[status] ?? "未有資料"}
      </span>
    </div>
  );
}

function BoundaryPage() {
  const statusQuery = useQuery({
    queryKey: ["boundary-status"],
    queryFn: fetchCheckpointStatus,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <PageHeader title="口岸資訊" sub="按口岸查看出入境實時狀況" />
      <main className="mx-5 flex flex-col gap-4">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              資料由香港特別行政區保安局口岸通提供，每分鐘自動更新。
            </p>
            <button
              type="button"
              onClick={() => statusQuery.refetch()}
              disabled={statusQuery.isFetching}
              aria-label="更新口岸資訊"
              className="shrink-0 rounded-lg p-2 text-primary hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" size={18} className={statusQuery.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
          {statusQuery.data && (
            <p className="mt-2 text-xs text-muted-foreground">更新時間：{statusQuery.data.updateDate}</p>
          )}
        </section>
        {statusQuery.isError && (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            暫時未能取得實時資料，請稍後再試，或開啟官方口岸通查看。
          </section>
        )}
        <section aria-label="各口岸出入境實時資訊" className="flex flex-col gap-3">
          {statusQuery.data?.cpInfoList.map((checkpoint) => (
            <article key={checkpoint.code} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold">{checkpoint.cpName}</h2>
                <span className="text-xs text-muted-foreground">{checkpoint.openTimeLabel.replace("運作時間：", "")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold"><LogOut aria-hidden="true" size={15} />出境</div>
                  <StatusItem label="香港居民" value={checkpoint.departure.resident} />
                  <StatusItem label="訪港旅客" value={checkpoint.departure.visitor} />
                </div>
                <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold"><LogIn aria-hidden="true" size={15} />入境</div>
                  <StatusItem label="香港居民" value={checkpoint.arrival.resident} />
                  <StatusItem label="訪港旅客" value={checkpoint.arrival.visitor} />
                </div>
              </div>
            </article>
          ))}
        </section>
        <a href="https://www.sb.gov.hk/chi/bwt/status.html?type=outbound" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2 text-sm text-primary">
          開啟官方口岸通 <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </main>
    </div>
  );
}
