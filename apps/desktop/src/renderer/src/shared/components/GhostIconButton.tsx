import { IconButton, type IconButtonProps } from "@chakra-ui/react";

/**
 * Quiet icon action (copy, rating, message toolbars). `aria-label` is
 * required by IconButtonProps — keep it meaningful.
 */
export function GhostIconButton(props: IconButtonProps): React.JSX.Element {
  return (
    <IconButton
      size="xs"
      variant="ghost"
      color="textMuted"
      _hover={{ bg: "surface.100", color: "text" }}
      {...props}
    />
  );
}
