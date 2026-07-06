import type { MediaPayload } from "@myvng/shared";
import { Play } from "lucide-react";
import { useChatActions } from "../ChatActionsContext";

const SAFE_URL = /^https?:/i;
const MAX_VISIBLE = 4;

/** Image/video gallery: up to 4 tiles, "+N" overlay, click opens lightbox. */
export function MediaGrid({
  payload,
}: {
  payload: MediaPayload;
}): React.JSX.Element | null {
  const { openLightbox } = useChatActions();
  const items = payload.items.filter((item) => SAFE_URL.test(item.url));
  if (items.length === 0) return null;

  const visible = items.slice(0, MAX_VISIBLE);
  const hiddenCount = items.length - visible.length;

  return (
    <div className="flex flex-col gap-2">
      {payload.intro ? (
        <p className="text-sm text-text-muted">{payload.intro}</p>
      ) : null}
      <div
        className={`grid max-w-md gap-1.5 ${
          visible.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {visible.map((item, index) => {
          const isLastWithMore =
            hiddenCount > 0 && index === visible.length - 1;
          return (
            <button
              key={item.url}
              type="button"
              className="relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-border-subtle"
              aria-label={item.alt ?? item.url}
              onClick={() => openLightbox(items, index)}
            >
              {item.mediaType === "video" ? (
                <>
                  <video
                    src={item.url}
                    muted
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Play size={28} className="text-white drop-shadow" />
                  </span>
                </>
              ) : (
                <img
                  src={item.url}
                  alt={item.alt ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
              {isLastWithMore ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                  +{hiddenCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
