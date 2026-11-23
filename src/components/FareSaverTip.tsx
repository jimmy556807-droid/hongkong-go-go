import { useState } from "react";
import { Lightbulb, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MiniMapNavigation } from "@/components/MiniMapNavigation";
import type { FareSaver } from "@/lib/fare-saver";

type Coordinate = { lat: number; lng: number };

export function FareSaverTip({
  stationName,
  savers,
  position,
}: {
  stationName: string;
  savers: FareSaver[];
  position?: Coordinate | null;
}) {
  const [selectedSaver, setSelectedSaver] = useState<FareSaver | null>(null);

  if (savers.length === 0) return null;

  return (
    <>
      <section
        className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30"
        aria-label="港鐵特惠站提示"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
          <Lightbulb size={17} /> 起點站設有港鐵特惠站！
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          適用於{stationName}站。入閘前到以下特惠站拍一拍成人八達通，合資格車程即減 $2.0。
        </p>
        <ul className="mt-2.5 space-y-2">
          {savers.map((saver) => (
            <li
              key={`${saver.name}-${saver.lat}-${saver.lng}`}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5"
            >
              <span className="min-w-0 text-sm font-medium">{saver.name}</span>
              <button
                type="button"
                onClick={() => setSelectedSaver(saver)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200 dark:hover:bg-emerald-900"
              >
                <MapPin size={13} /> 查看位置
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          只適用於成人八達通及合資格港鐵車程；實際優惠以港鐵公布為準。
        </p>
      </section>

      <Dialog
        open={selectedSaver !== null}
        onOpenChange={(open) => !open && setSelectedSaver(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl p-4 sm:p-6">
          {selectedSaver && (
            <>
              <DialogHeader className="pr-8 text-left">
                <DialogTitle>{selectedSaver.name}</DialogTitle>
                <DialogDescription>
                  港鐵特惠站 · 適用車站：{selectedSaver.stations}
                </DialogDescription>
              </DialogHeader>
              <MiniMapNavigation
                name={selectedSaver.name}
                lat={selectedSaver.lat}
                lng={selectedSaver.lng}
                position={position ?? null}
              />
              <p className="text-xs text-muted-foreground">
                地圖及座標為約略位置；請以現場特惠站標示及港鐵條款為準。
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
