import { SegmentGroup } from "@chakra-ui/react";

/**
 * Thin wrapper over Chakra's SegmentGroup so call sites pass a plain
 * `value`/`onChange` pair instead of Ark UI's `{ value }` change-details
 * shape. Kept as a wrapper (not a recipe variant) per the no-typegen rule.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  items,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: React.ReactNode }>;
  "aria-label"?: string;
}): React.JSX.Element {
  return (
    <SegmentGroup.Root
      value={value}
      onValueChange={(details) => {
        if (details.value !== null) onChange(details.value as T);
      }}
      aria-label={ariaLabel}
    >
      <SegmentGroup.Indicator />
      <SegmentGroup.Items items={items} />
    </SegmentGroup.Root>
  );
}
