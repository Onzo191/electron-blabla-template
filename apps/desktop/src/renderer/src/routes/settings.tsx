import { Button } from "@chakra-ui/react";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import type { Theme } from "@renderer/store/slices/uiSlice";
import { useAppStore } from "@renderer/store/useAppStore";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

const THEME_OPTIONS: Theme[] = ["light", "dark", "system"];

function SettingsRoute(): React.JSX.Element {
  const theme = useAppStore((state) => state.theme);
  const resolvedTheme = useAppStore((state) => state.resolvedTheme);
  const setTheme = useAppStore((state) => state.setTheme);

  return (
    <ErrorBoundary>
      <div>
        <h1 className="mb-4 text-lg font-semibold">Settings</h1>
        <p className="mb-2 text-sm text-text-muted">
          Theme (resolved: {resolvedTheme})
        </p>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={theme === option ? "solid" : "outline"}
              onClick={() => setTheme(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
