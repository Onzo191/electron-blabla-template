import { Button, type ButtonProps } from "@chakra-ui/react";

/**
 * Pill-shaped chip button used by suggestion prompts, prompt topics, and
 * export-format pickers. Centralizes the chip look (the repo does not run
 * Chakra typegen, so this wrapper stands in for a recipe variant).
 */
export function ChipButton(props: ButtonProps): React.JSX.Element {
  return (
    <Button
      size="sm"
      borderRadius="full"
      borderWidth="1px"
      borderColor="borderSubtle"
      bg="surfaceRaised"
      color="text"
      fontWeight="normal"
      height="auto"
      paddingBlock="1.5"
      paddingInline="3"
      textAlign="start"
      whiteSpace="normal"
      _hover={{ borderColor: "accent", color: "accent" }}
      {...props}
    />
  );
}
