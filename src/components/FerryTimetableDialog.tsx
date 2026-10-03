import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getFerryTimetable, type FerryTimetableTable } from "@/lib/ferry.functions";

export function FerryTimetableDialog({ link, title }: { link: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <CalendarClock size={14} />運輸署班次及詳情
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>班次時間表 · 資料來源：運輸署</DialogDescription>
        </DialogHeader>
        {open && <TimetableBody link={link} />}
      </DialogContent>
    </Dialog>
  );
}

function TimetableBody({ link }: { link: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["ferry-timetable", link],
    queryFn: () => getFerryTimetable({ data: { link } }),
    staleTime: 3600_000,
  });
  const [active, setActive] = useState(0);

  if (isPending)
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}
      </div>
    );
  if (isError) return <p className="text-sm text-muted-foreground">暫時未能載入班次，請稍後再試。</p>;
  if (!data.tables.length && !data.notes.length)
    return <p className="text-sm text-muted-foreground">運輸署暫未提供此航線的班次時間表。</p>;

  const table = data.tables[Math.min(active, data.tables.length - 1)];
  return (
    <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
      {data.tables.length > 1 && (
        <div role="tablist" aria-label="服務日子" className="flex shrink-0 gap-2 overflow-x-auto py-0.5">
          {data.tables.map((t, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs",
                i === active ? "border-primary bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {t.title || `時間表 ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      {table && <TimetableTable table={table} />}
      {data.notes.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {data.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

function TimetableTable({ table }: { table: FerryTimetableTable }) {
  const cols = Math.max(table.headers.length, ...table.rows.map((r) => r.length));
  return (
    <div className="overflow-x-auto rounded-xl border">
      {table.title && <p className="border-b bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">{table.title}</p>}
      <table className="w-full text-sm">
        {table.headers.length > 0 && (
          <thead className="bg-muted/60">
            <tr>
              {table.headers.map((h, i) => (
                <th key={i} scope="col" className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-t first:border-t-0 even:bg-muted/30">
              {row.length === 1 && cols > 1 ? (
                <td colSpan={cols} className="px-3 py-1.5 text-xs text-muted-foreground">{row[0]}</td>
              ) : (
                row.map((c, j) => <td key={j} className="px-3 py-1.5 tabular-nums">{c}</td>)
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
