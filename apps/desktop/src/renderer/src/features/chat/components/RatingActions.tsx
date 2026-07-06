import { Button, Dialog, Portal, Textarea } from "@chakra-ui/react";
import type { ChatMessage } from "@myvng/shared";
import { GhostIconButton } from "@renderer/shared/components/GhostIconButton";
import { Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMessageFeedback } from "../hooks/useMessageFeedback";
import { useChatActions } from "./ChatActionsContext";

/** Copy + like/dislike toolbar under a completed assistant message. */
export function RatingActions({
  message,
  conversationId,
}: {
  message: ChatMessage;
  conversationId: string;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const { copyToClipboard } = useChatActions();
  const feedbackMutation = useMessageFeedback(conversationId);
  const [dislikeOpen, setDislikeOpen] = useState(false);
  const [comment, setComment] = useState("");

  const submitDislike = (): void => {
    feedbackMutation.mutate({
      messageId: message.id,
      rating: "DISLIKE",
      feedback: comment.trim() === "" ? undefined : comment.trim(),
    });
    setDislikeOpen(false);
    setComment("");
  };

  return (
    <div className="flex items-center gap-1">
      <GhostIconButton
        aria-label={t("message.copy")}
        onClick={() => copyToClipboard(message.content)}
      >
        <Copy size={14} />
      </GhostIconButton>
      <GhostIconButton
        aria-label={t("message.like")}
        aria-pressed={message.feedback === "LIKE"}
        color={message.feedback === "LIKE" ? "accent" : undefined}
        onClick={() =>
          feedbackMutation.mutate({ messageId: message.id, rating: "LIKE" })
        }
      >
        <ThumbsUp size={14} />
      </GhostIconButton>
      <GhostIconButton
        aria-label={t("message.dislike")}
        aria-pressed={message.feedback === "DISLIKE"}
        color={message.feedback === "DISLIKE" ? "danger" : undefined}
        onClick={() => setDislikeOpen(true)}
      >
        <ThumbsDown size={14} />
      </GhostIconButton>

      <Dialog.Root
        open={dislikeOpen}
        onOpenChange={({ open }) => setDislikeOpen(open)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{t("feedback.title")}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t("feedback.label")}
                  aria-label={t("feedback.label")}
                  rows={4}
                />
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">{t("common.cancel")}</Button>
                </Dialog.ActionTrigger>
                <Button
                  onClick={submitDislike}
                  loading={feedbackMutation.isPending}
                >
                  {t("chatbot:chat.submitRequest")}
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
}
