import { Button } from "@chakra-ui/react";
import type { AppError } from "@myvng/shared";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { chatErrorContent } from "../lib/error-messages";

/** Inline failure block inside an assistant bubble, with retry. */
export function MessageError({
  error,
  onRetry,
}: {
  error: AppError;
  onRetry: () => void;
}): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const content = chatErrorContent(error.code, t);

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-danger/40 bg-surface-raised p-3"
    >
      <p className="text-sm font-medium text-danger">{content.title}</p>
      <p className="text-sm text-text-muted">{content.description}</p>
      <div>
        <Button size="xs" variant="outline" onClick={onRetry}>
          <RotateCcw size={12} />
          {t("common.retry")}
        </Button>
      </div>
    </div>
  );
}
