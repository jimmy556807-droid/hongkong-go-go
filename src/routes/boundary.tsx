import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, LogIn, LogOut } from "lucide-react";
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

const borderStatusLinks = [
  {
    label: "出境實時資訊",
    description: "查看各口岸前往內地的出境繁忙情況。",
    href: "https://www.sb.gov.hk/chi/bwt/status.html?type=outbound",
    icon: LogOut,
  },
  {
    label: "入境實時資訊",
    description: "查看各口岸進入香港的入境繁忙情況。",
    href: "https://www.sb.gov.hk/chi/bwt/status.html?type=inbound",
    icon: LogIn,
  },
] as const;

function BoundaryPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-24">
      <PageHeader title="口岸資訊" sub="出入境實時資訊" />
      <main className="mx-5 flex flex-col gap-4">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm leading-6 text-muted-foreground">
            實時資訊由香港特別行政區保安局提供，點擊下方連結查看各口岸最新狀況。
          </p>
        </section>
        <section aria-label="口岸出入境實時資訊" className="flex flex-col gap-3">
          {borderStatusLinks.map(({ label, description, href, icon: Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon aria-hidden="true" size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
              </span>
              <ArrowUpRight aria-hidden="true" size={18} className="shrink-0 text-muted-foreground" />
            </a>
          ))}
        </section>
      </main>
    </div>
  );
}
