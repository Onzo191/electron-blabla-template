import type { SupportContactPayload } from "@myvng/shared";
import { GhostIconButton } from "@renderer/shared/components/GhostIconButton";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useChatActions } from "../ChatActionsContext";

export function SupportContactCards({
  payload,
}: {
  payload: SupportContactPayload;
}): React.JSX.Element | null {
  const { t } = useTranslation("aiAgents");
  const { copyToClipboard } = useChatActions();
  const items = payload.items.filter((item) => item.name != null);
  if (items.length === 0) return null;

  return (
    <section
      aria-label={t("block.supportContact")}
      className="flex flex-col gap-2"
    >
      {payload.intro ? (
        <p className="text-sm text-text-muted">{payload.intro}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {items.map((contact) => (
          <div
            key={`${contact.name}-${contact.email ?? contact.phone ?? ""}`}
            className="flex min-w-56 items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised p-3"
          >
            {contact.avatar ? (
              <img
                src={contact.avatar}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{contact.name}</p>
              {contact.domain ? (
                <p className="truncate text-xs text-text-faint">
                  {contact.domain}
                </p>
              ) : null}
              {contact.phone ? (
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <span className="truncate">{contact.phone}</span>
                  <GhostIconButton
                    aria-label={`${t("message.copy")} ${t("colleagueCard.phone")}`}
                    onClick={() => copyToClipboard(contact.phone ?? "")}
                  >
                    <Copy size={12} />
                  </GhostIconButton>
                </div>
              ) : null}
              {contact.email ? (
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <span className="truncate">{contact.email}</span>
                  <GhostIconButton
                    aria-label={`${t("message.copy")} ${t("colleagueCard.email")}`}
                    onClick={() => copyToClipboard(contact.email ?? "")}
                  >
                    <Copy size={12} />
                  </GhostIconButton>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
