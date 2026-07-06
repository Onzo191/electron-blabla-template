import type { MessageFeedback } from "@myvng/shared";
import { toaster } from "@renderer/shared/components/toaster";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { patchMessageFeedback } from "../api/cache";
import { submitMessageFeedback } from "../api/messages";

export function useMessageFeedback(conversationId: string) {
  const { t } = useTranslation("aiAgents");

  return useMutation({
    mutationFn: (input: {
      messageId: string;
      rating: MessageFeedback;
      feedback?: string;
    }) => submitMessageFeedback(input),
    onSuccess: (_data, { messageId, rating }) => {
      patchMessageFeedback(conversationId, messageId, rating);
      toaster.success({ title: t("chatbot:feedback.success") });
    },
    onError: () => {
      toaster.error({ title: t("feedback.failedToSubmit") });
    },
  });
}
