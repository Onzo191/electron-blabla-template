import { Button, Input } from "@chakra-ui/react";
import type { Language } from "@renderer/i18n";
import { SUPPORTED_LANGUAGES } from "@renderer/i18n";
import { ErrorBoundary } from "@renderer/shared/components/ErrorBoundary";
import { toaster } from "@renderer/shared/components/toaster";
import { clearAuthToken, setAuthToken } from "@renderer/shared/lib/auth-token";
import type { Theme } from "@renderer/store/slices/uiSlice";
import { useAppStore } from "@renderer/store/useAppStore";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

const THEME_OPTIONS: Theme[] = ["light", "dark", "system"];
const LANGUAGE_LABELS: Record<Language, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

function SettingsRoute(): React.JSX.Element {
  const theme = useAppStore((state) => state.theme);
  const resolvedTheme = useAppStore((state) => state.resolvedTheme);
  const setTheme = useAppStore((state) => state.setTheme);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  const saveToken = async (): Promise<void> => {
    if (token.trim() === "") return;
    setSaving(true);
    try {
      await setAuthToken(token.trim());
      setToken("");
      toaster.success({ title: "API token saved" });
    } catch {
      toaster.error({ title: "Failed to save token" });
    } finally {
      setSaving(false);
    }
  };

  const clearToken = async (): Promise<void> => {
    setSaving(true);
    try {
      await clearAuthToken();
      toaster.success({ title: "API token cleared" });
    } catch {
      toaster.error({ title: "Failed to clear token" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-xl p-6">
        <Link
          to="/chat"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={14} />
          Back to chat
        </Link>
        <h1 className="mb-6 text-lg font-semibold">Settings</h1>

        <section className="mb-6">
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
        </section>

        <section className="mb-6">
          <p className="mb-2 text-sm text-text-muted">Language</p>
          <div className="flex gap-2">
            {SUPPORTED_LANGUAGES.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={language === option ? "solid" : "outline"}
                onClick={() => setLanguage(option)}
              >
                {LANGUAGE_LABELS[option]}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-1 text-sm text-text-muted">API token (dev)</p>
          <p className="mb-2 text-xs text-text-faint">
            Stored encrypted via the OS keychain (safeStorage); sent as a Bearer
            header to the agent backend. A real login flow replaces this later.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              size="sm"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste access token…"
              aria-label="API token"
            />
            <Button
              size="sm"
              onClick={() => void saveToken()}
              disabled={token.trim() === ""}
              loading={saving}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void clearToken()}
              disabled={saving}
            >
              Clear
            </Button>
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}
