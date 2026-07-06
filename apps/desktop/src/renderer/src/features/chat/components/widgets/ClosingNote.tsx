import type { ClosingPayload } from "@myvng/shared";

/** The bot's closing advice/warning in a quiet, separated container. */
export function ClosingNote({
  payload,
}: {
  payload: ClosingPayload;
}): React.JSX.Element | null {
  if (payload.text.trim() === "") return null;
  return (
    <p className="border-t border-border-subtle pt-3 text-sm text-text-muted">
      {payload.text}
    </p>
  );
}
