import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { distKm } from "@/lib/fare-saver";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Coordinate = { lat: number; lng: number };

export function MiniMapNavigation({
  name,
  lat,
  lng,
  position,
  className,
}: {
  name: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
  position?: Coordinate | null;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  if (!hasCoordinates) {
    return (
      <div
        className={cn("rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground", className)}
      >
        <p className="flex items-center gap-2">
          <MapPin size={16} className="shrink-0 text-primary" />
          {name}暫未提供位置座標
        </p>
      </div>
    );
  }

  const latitude = lat as number;
  const longitude = lng as number;
  const bbox = [longitude - 0.002, latitude - 0.0012, longitude + 0.002, latitude + 0.0012].join(
    ",",
  );
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
  const appleMapsUrl = `maps://?daddr=${latitude},${longitude}&dirflg=w`;
  const distance =
    position && Number.isFinite(position.lat) && Number.isFinite(position.lng)
      ? distKm(position, { lat: latitude, lng: longitude })
      : null;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="relative h-36 overflow-hidden rounded-xl border bg-muted">
        <iframe
          title={`${name}附近地圖`}
          src={mapUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 size-full border-0"
        />
        {!loaded && (
          <Skeleton
            aria-hidden="true"
            className="absolute inset-0 z-10 h-full w-full rounded-none"
          />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-background bg-primary shadow-md"
        />
        <span className="sr-only">紅色圓形標記顯示{name}座標位置</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          座標 {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </span>
        {distance != null && (
          <span className="font-medium text-foreground">
            距離目前位置{" "}
            {distance < 1 ? `${Math.round(distance * 1000)} 米` : `${distance.toFixed(1)} 公里`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Navigation size={15} /> Google 步行導航
        </a>
        <a
          href={appleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-sm font-semibold transition hover:bg-muted"
        >
          <MapPin size={15} /> Apple 地圖
        </a>
      </div>
    </div>
  );
}
