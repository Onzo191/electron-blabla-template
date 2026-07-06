import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const SHOW_BUTTON_THRESHOLD_PX = 120;
const REENGAGE_THRESHOLD_PX = 8;

/**
 * Smart auto-scroll (spec §3C): follow the stream while the user is at the
 * bottom; a scroll-up disengages following so they can read history; the
 * scroll-to-bottom button re-engages it.
 */
export function useAutoScroll(
  containerRef: RefObject<HTMLElement | null>,
  /** Changes whenever content grows (e.g. streamed text length). */
  contentVersion: number,
) {
  const shouldFollow = useRef(true);
  const lastScrollTop = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const onScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop < lastScrollTop.current) {
      shouldFollow.current = false;
    }
    lastScrollTop.current = scrollTop;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom < REENGAGE_THRESHOLD_PX) {
      shouldFollow.current = true;
    }
    setShowScrollButton(distanceFromBottom > SHOW_BUTTON_THRESHOLD_PX);
  }, [containerRef]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      if (!container) return;
      shouldFollow.current = true;
      container.scrollTo({ top: container.scrollHeight, behavior });
    },
    [containerRef],
  );

  // Follow content growth only while engaged.
  // biome-ignore lint/correctness/useExhaustiveDependencies(contentVersion): the version is a pure re-run trigger — the effect reads the DOM, not the value
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldFollow.current) return;
    container.scrollTop = container.scrollHeight;
  }, [containerRef, contentVersion]);

  return { onScroll, scrollToBottom, showScrollButton };
}
