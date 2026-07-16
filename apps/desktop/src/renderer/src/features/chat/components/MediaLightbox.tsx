import { Dialog, Portal } from "@chakra-ui/react";
import type { MediaItem } from "@myvng/shared";
import { GhostIconButton } from "@renderer/shared/components/GhostIconButton";
import { DURATION } from "@renderer/shared/lib/motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";

export type LightboxState = {
  items: MediaItem[];
  index: number;
};

/**
 * Fullscreen media viewer. Chakra Dialog owns focus trap/restore and Escape;
 * motion owns the crossfade between carousel slides.
 */
export function MediaLightbox({
  state,
  onClose,
  onNavigate,
}: {
  state: LightboxState | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const item = state?.items[state.index];
  const count = state?.items.length ?? 0;

  return (
    <Dialog.Root
      open={state !== null}
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
      size="cover"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg="transparent"
            boxShadow="none"
            onKeyDown={(event) => {
              if (state === null) return;
              if (event.key === "ArrowLeft" && state.index > 0) {
                onNavigate(state.index - 1);
              }
              if (event.key === "ArrowRight" && state.index < count - 1) {
                onNavigate(state.index + 1);
              }
            }}
          >
            <div className="relative flex h-full w-full items-center justify-center">
              <Dialog.CloseTrigger asChild>
                <GhostIconButton
                  aria-label={t("common.close")}
                  position="absolute"
                  top="4"
                  right="4"
                  zIndex="1"
                  color="white"
                >
                  <X size={20} />
                </GhostIconButton>
              </Dialog.CloseTrigger>

              {state !== null && state.index > 0 ? (
                <GhostIconButton
                  aria-label="Previous"
                  position="absolute"
                  left="4"
                  zIndex="1"
                  color="white"
                  onClick={() => onNavigate(state.index - 1)}
                >
                  <ChevronLeft size={24} />
                </GhostIconButton>
              ) : null}

              <AnimatePresence mode="wait" initial={false}>
                {item ? (
                  <m.div
                    key={item.url}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DURATION.normal }}
                    className="flex max-h-[85vh] max-w-[90vw] items-center justify-center"
                  >
                    {item.mediaType === "video" ? (
                      // biome-ignore lint/a11y/useMediaCaption: agent-provided media has no caption tracks
                      <video
                        src={item.url}
                        controls
                        autoPlay
                        className="max-h-[85vh] max-w-[90vw] rounded-lg"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.alt ?? ""}
                        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                      />
                    )}
                  </m.div>
                ) : null}
              </AnimatePresence>

              {state !== null && state.index < count - 1 ? (
                <GhostIconButton
                  aria-label="Next"
                  position="absolute"
                  right="4"
                  zIndex="1"
                  color="white"
                  onClick={() => onNavigate(state.index + 1)}
                >
                  <ChevronRight size={24} />
                </GhostIconButton>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
