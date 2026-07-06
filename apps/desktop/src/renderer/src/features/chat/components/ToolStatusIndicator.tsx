import { Loader2 } from "lucide-react";

/** "Searching Google…"-style live tool execution status. */
export function ToolStatusIndicator({
  label,
}: {
  label: string;
}): React.JSX.Element {
  return (
    <div className="animate-chat-shimmer flex items-center gap-2 text-sm text-text-muted">
      <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
      <span>{label}</span>
    </div>
  );
}
