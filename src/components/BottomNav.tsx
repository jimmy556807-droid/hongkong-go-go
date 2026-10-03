import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Home,
  Bus,
  TrainFront,
  Ship,
  CloudSun,
  TriangleAlert,
  LocateFixed,
  Loader2,
} from "lucide-react";

type Position = { lat: number; lng: number };
type LocationState = "idle" | "loading" | "ready" | "denied";
const LocationContext = createContext<{
  position: Position | null;
  status: LocationState;
  placeName: string | null;
  locate: () => void;
}>({ position: null, status: "idle", placeName: null, locate: () => undefined });

async function reverseGeocode(position: Position) {
  const params = new URLSearchParams({
    lat: String(position.lat),
    lon: String(position.lng),
    format: "jsonv2",
    "accept-language": "zh-HK",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
  if (!response.ok) throw new Error("reverse geocoding failed");
  const data = (await response.json()) as { display_name?: string; address?: Record<string, string> };
  const address = data.address ?? {};
  return address["suburb"] ?? address["neighbourhood"] ?? address["quarter"] ?? address["city_district"] ?? data.display_name?.split(",")[0] ?? null;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState<LocationState>("idle");
  const placeQuery = useQuery({
    queryKey: ["location-place", position?.lat, position?.lng],
    queryFn: () => reverseGeocode(position!),
    enabled: Boolean(position),
    staleTime: 300000,
    retry: 1,
  });
  const locate = useCallback(() => {
    if (!navigator.geolocation) return setStatus("denied");
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setStatus("ready");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 8000 },
    );
  }, []);
  useEffect(() => {
    locate();
  }, [locate]);
  return (
    <LocationContext.Provider
      value={{ position, status, placeName: placeQuery.data ?? null, locate }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useCurrentLocation() {
  return useContext(LocationContext);
}

export function LocationButton() {
  const { status, placeName, locate } = useCurrentLocation();
  const label = status === "loading" ? "定位中…" : placeName ?? (status === "denied" ? "無法定位" : "目前位置");
  return (
    <div className="flex max-w-[190px] items-center gap-2">
      <span className="truncate text-xs text-muted-foreground" title={placeName ?? undefined}>
        {label}
      </span>
      <button
        type="button"
        onClick={locate}
        disabled={status === "loading"}
        aria-label="重新定位目前位置"
        className="grid size-10 shrink-0 place-items-center rounded-full border bg-card text-primary shadow-sm disabled:cursor-wait disabled:opacity-60"
      >
        {status === "loading" ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
      </button>
    </div>
  );
}

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
