import { useState } from "react";
import { BadgePercent, Navigation, Loader2, Map, X, LocateFixed } from "lucide-react";
import { FARE_SAVERS, nearestFareSaver, distKm, type FareSaver } from "@/lib/fare-saver";

type Near = FareSaver & { km: number };
type Pos = { lat: number; lng: number } | null;

export function FareSaverCard() {
  const [near, setNear] = useState<Near | null>(null);
  const [pos, setPos] = useState<Pos>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<FareSaver | null>(null);

  const locate = () => {
    if (!navigator.geolocation) return setState("error");
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const me = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(me);
        setNear(nearestFareSaver(me));
        setState("idle");
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const dist = near
    ? near.km < 1
      ? `${Math.round(near.km * 1000)} 米`
      : `${near.km.toFixed(1)} 公里`
    : "";
  const sorted = pos
    ? FARE_SAVERS.map((f) => ({ ...f, km: distKm(pos, f) })).sort((a, b) => a.km - b.km)
    : FARE_SAVERS.map((f) => ({ ...f, km: null as number | null }));

  const mapUrl = mapTarget
    ? `https://maps.google.com/maps?${pos ? `saddr=${pos.lat},${pos.lng}&` : ""}daddr=${mapTarget.lat},${mapTarget.lng}&dirflg=w&output=embed&hl=zh-HK`
    : "";

  return (
    <div className="mx-5 mt-3 rounded-2xl border bg-card p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold">
          <BadgePercent size={16} className="text-primary" />
          最近嘅港鐵特惠站
        </p>
        <button
          type="button"
          onClick={() => {
            setMapTarget(null);
            setOpen(true);
          }}
          className="flex items-center gap-1 rounded-full border border-primary px-2.5 py-1 text-xs font-semibold text-primary"
        >
          <Map size={12} />
          全部
        </button>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        用成人八達通拍一拍，再喺指定車站入閘即慳 $2
      </p>
      {near ? (
        <div className="mt-2 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{near.name}</p>
            <p className="text-xs text-muted-foreground">
              距離約 {dist} · 適用：{near.stations}站
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMapTarget(near);
              setOpen(true);
            }}
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Navigation size={12} />
            導航
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={locate}
          disabled={state === "loading"}
          className="mt-2 flex items-center gap-2 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
        >
          {state === "loading" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Navigation size={12} />
          )}
          {state === "loading" ? "定位中…" : "搵最近嘅特惠站"}
        </button>
      )}
      {state === "error" && (
        <p className="mt-1.5 text-xs text-destructive">未能取得你嘅位置，請允許定位權限後再試。</p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-card p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <BadgePercent size={16} className="text-primary" />
                {mapTarget ? `前往 ${mapTarget.name}` : "全部港鐵特惠站"}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="關閉"
              >
                <X size={18} />
              </button>
            </div>

            {mapTarget ? (
              <>
                <iframe
                  title="步行路線"
                  src={mapUrl}
                  className="mt-3 h-72 w-full rounded-xl border"
                  loading="lazy"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  適用：{mapTarget.stations}站 ·{" "}
                  {pos ? "由你嘅位置出發（步行）" : "允許定位後會顯示由你位置出發嘅路線"}
                </p>
                <button
                  type="button"
                  onClick={() => setMapTarget(null)}
                  className="mt-3 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  返回列表
                </button>
              </>
            ) : (
              <>
                {!pos && (
                  <button
                    type="button"
                    onClick={locate}
                    className="mt-2 flex items-center gap-1.5 self-start rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    <LocateFixed size={12} />
                    按距離排序
                  </button>
                )}
                <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
                  {sorted.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setMapTarget(f)}
                      className="flex w-full items-center gap-3 border-b px-1 py-2.5 text-left last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">適用：{f.stations}站</p>
                      </div>
                      {f.km != null && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {f.km < 1 ? `${Math.round(f.km * 1000)}米` : `${f.km.toFixed(1)}公里`}
                        </span>
                      )}
                      <Navigation size={14} className="shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  位置為約略座標，實際位置以港鐵公布為準。
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
