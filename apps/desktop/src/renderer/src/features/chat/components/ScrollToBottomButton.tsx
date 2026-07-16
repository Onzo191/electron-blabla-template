import { IconButton } from "@chakra-ui/react";
import { DURATION } from "@renderer/shared/lib/motion";
import { ArrowDown } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";

export function ScrollToBottomButton({
  visible,
  isStreaming,
  onClick,
}: {
  visible: boolean;
  isStreaming: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");

  return (
    <AnimatePresence>
      {visible ? (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: DURATION.fast }}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
        >
          <IconButton
            aria-label={t("chat.scrollToBottom")}
            size="sm"
            borderRadius="full"
            variant="outline"
            bg="surfaceRaised"
            borderColor="borderSubtle"
            boxShadow="sm"
            onClick={onClick}
            className={isStreaming ? "animate-chat-bounce" : undefined}
          >
            <ArrowDown size={16} />
          </IconButton>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
