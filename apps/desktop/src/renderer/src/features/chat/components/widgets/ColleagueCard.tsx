import type { AskColleaguesPayload } from "@myvng/shared";
import { GhostIconButton } from "@renderer/shared/components/GhostIconButton";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChatActions } from "../ChatActionsContext";

function Row({
  label,
  value,
  onCopy,
  action,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 shrink-0 text-xs text-text-faint">{label}</span>
      <span className="min-w-0 flex-1 truncate">{value}</span>
      {onCopy ? (
        <GhostIconButton aria-label={`Copy ${label}`} onClick={onCopy}>
          <Copy size={12} />
        </GhostIconButton>
      ) : null}
      {action}
    </div>
  );
}

/** Employee directory profile card. */
export function ColleagueCard({
  payload,
}: {
  payload: AskColleaguesPayload;
}): React.JSX.Element | null {
  const { t } = useTranslation("aiAgents");
  const { copyToClipboard, submitMessage } = useChatActions();
  const colleague = payload.data;
  if (colleague == null || colleague.name == null) return null;

  return (
    <div className="flex flex-col gap-3">
      {payload.intro ? (
        <p className="text-sm text-text-muted">{payload.intro}</p>
      ) : null}
      <section
        aria-label={t("block.colleague")}
        className="max-w-md rounded-lg border border-border-subtle bg-surface-raised p-4"
      >
        <div className="mb-3 flex items-center gap-3">
          {colleague.avatar ? (
            <img
              src={colleague.avatar}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{colleague.name}</p>
            {colleague.title ? (
              <p className="truncate text-xs text-text-muted">
                {colleague.title}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {colleague.department ? (
            <Row
              label={t("colleagueCard.department")}
              value={colleague.department}
            />
          ) : null}
          {colleague.phone ? (
            <Row
              label={t("colleagueCard.phone")}
              value={colleague.phone}
              onCopy={() => copyToClipboard(colleague.phone ?? "")}
            />
          ) : null}
          {colleague.email ? (
            <Row
              label={t("colleagueCard.email")}
              value={colleague.email}
              onCopy={() => copyToClipboard(colleague.email ?? "")}
            />
          ) : null}
          {colleague.lineManager ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 text-xs text-text-faint">
                {t("colleagueCard.lineManager")}
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer truncate text-left text-accent hover:underline"
                onClick={() =>
                  submitMessage(
                    t("colleagueCard.viewProfile", {
                      value1: colleague.lineManager,
                    }),
                  )
                }
              >
                {colleague.lineManager}
                {colleague.lineManagerTitle
                  ? ` — ${colleague.lineManagerTitle}`
                  : ""}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
