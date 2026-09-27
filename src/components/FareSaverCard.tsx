import { useState } from "react";
import { BadgePercent, Navigation, Loader2 } from "lucide-react";
import { nearestFareSaver } from "@/lib/fare-saver";

type Near = ReturnType<typeof nearestFareSaver>;

export function FareSaverCard() {
  const [near, setNear] = useState<Near | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const locate = () => {
    if (!navigator.geolocation) return setState("error");
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => { setNear(nearestFareSaver({ lat: p.coords.latitude, lng: p.coords.longitude })); setState("idle"); },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const dist = near ? (near.km < 1 ? `${Math.round(near.km * 1000)} 米` : `${near.km.toFixed(1)} 公里`) : "";

  return (
    <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold"><BadgePercent size={16} className="text-primary" />最近嘅港鐵特惠站</p>
      <p className="mt-0.5 text-xs text-muted-foreground">用成人八達通拍一拍，再喺指定車站入閘即慳 $2</p>
      {near ? (
        <div className="mt-2 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{near.name}</p>
            <p className="text-xs text-muted-foreground">距離約 {dist} · 適用：{near.stations}站</p>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${near.lat},${near.lng}&travelmode=walking`}
            target="_blank" rel="noreferrer"
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Navigation size={12} />導航
          </a>
        </div>
      ) : (
        <button type="button" onClick={locate} disabled={state === "loading"} className="mt-2 flex items-center gap-2 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary">
          {state === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
          {state === "loading" ? "定位中…" : "搵最近嘅特惠站"}
        </button>
      )}
      {state === "error" && <p className="mt-1.5 text-xs text-destructive">未能取得你嘅位置，請允許定位權限後再試。</p>}
    </div>
  );
}
