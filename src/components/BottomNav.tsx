import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Home, Bus, TrainFront, Ship, CloudSun, TriangleAlert } from "lucide-react";

const items = [
  { to: "/", icon: Home, label: "首頁" },
  { to: "/bus", icon: Bus, label: "巴士" },
  { to: "/mtr", icon: TrainFront, label: "地鐵" },
  { to: "/ferry", icon: Ship, label: "渡輪" },
  { to: "/weather", icon: CloudSun, label: "天氣" },
  { to: "/news", icon: TriangleAlert, label: "交通消息" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {items.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <Link
              to={to}
              aria-label={label}
              activeOptions={{ exact: to === "/" }}
              className="flex h-16 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
              activeProps={{ className: "!text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${isActive ? "bg-primary/10" : ""}`}
                  >
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                  </span>
                  <span className="sr-only">{label}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="px-5 pb-4 pt-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </header>
  );
}

export function minsUntil(iso: string) {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return m <= 0 ? "即將到達" : `${m} 分鐘`;
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function Countdown({ at, now }: { at: string | number; now: number }) {
  const s = Math.floor((new Date(at).getTime() - now) / 1000);
  if (s <= 30) return <span className="font-bold text-primary">即將到達</span>;
  const m = Math.floor(s / 60),
    r = s % 60;
  return (
    <span className="font-bold tabular-nums">
      {m}:{String(r).padStart(2, "0")}
    </span>
  );
}
