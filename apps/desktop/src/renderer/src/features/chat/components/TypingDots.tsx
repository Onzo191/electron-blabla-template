/** Three bouncing dots (pure CSS keyframes; reduced-motion safe). */
export function TypingDots({ label }: { label?: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="animate-chat-bounce inline-block h-1.5 w-1.5 rounded-full bg-text-faint"
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </span>
      {label ? <span className="text-sm text-text-muted">{label}</span> : null}
    </span>
  );
}
