import { Collapsible } from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Collapsible "thoughts" block streamed via `reasoning` events. */
export function ReasoningAccordion({
  text,
  defaultOpen = false,
}: {
  text: string;
  defaultOpen?: boolean;
}): React.JSX.Element | null {
  const { t } = useTranslation("aiAgents");
  if (text.trim() === "") return null;

  return (
    <Collapsible.Root defaultOpen={defaultOpen}>
      <Collapsible.Trigger className="group flex cursor-pointer items-center gap-1 text-xs text-text-faint hover:text-text-muted">
        <ChevronRight
          size={12}
          className="transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none"
        />
        {t("message.reasoning")}
      </Collapsible.Trigger>
      <Collapsible.Content>
        <p className="mt-1 whitespace-pre-wrap border-l-2 border-border-subtle pl-3 text-xs leading-relaxed text-text-faint">
          {text}
        </p>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
