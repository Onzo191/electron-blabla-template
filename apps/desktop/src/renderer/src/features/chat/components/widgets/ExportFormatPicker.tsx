import type { ExportFormatPickerPayload } from "@myvng/shared";
import { ChipButton } from "@renderer/shared/components/ChipButton";
import { useTranslation } from "react-i18next";
import { useChatActions } from "../ChatActionsContext";

/** Format chips; picking one posts an export command back to the agent. */
export function ExportFormatPicker({
  payload,
  isLastMessage,
}: {
  payload: ExportFormatPickerPayload;
  isLastMessage: boolean;
}): React.JSX.Element | null {
  const { t } = useTranslation("aiAgents");
  const { submitMessage } = useChatActions();

  if (!isLastMessage || payload.availableFormats.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-muted">{t("message.downloadAs")}</p>
      <div className="flex flex-wrap gap-2">
        {payload.availableFormats.map((format) => (
          <ChipButton
            key={format}
            onClick={() => submitMessage(`Export as ${format.toUpperCase()}`)}
          >
            {format.toUpperCase()}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}
