import { Button, Input } from "@chakra-ui/react";
import { toaster } from "@renderer/shared/components/toaster";
import { clearAuthToken, setAuthToken } from "@renderer/shared/lib/auth-token";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AccountSection(): React.JSX.Element {
  const { t } = useTranslation("aiAgents");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Every backend query needs the fresh token — invalidate everything so
  // the app retries immediately instead of requiring a manual reload.
  const invalidateAll = (): void => {
    void queryClient.invalidateQueries();
  };

  const saveToken = async (): Promise<void> => {
    if (token.trim() === "") return;
    setSaving(true);
    try {
      await setAuthToken(token.trim());
      setToken("");
      invalidateAll();
      toaster.success({ title: t("settings.account.savedTitle") });
    } catch {
      toaster.error({ title: t("settings.account.saveFailedTitle") });
    } finally {
      setSaving(false);
    }
  };

  const clearToken = async (): Promise<void> => {
    setSaving(true);
    try {
      await clearAuthToken();
      invalidateAll();
      toaster.success({ title: t("settings.account.clearedTitle") });
    } catch {
      toaster.error({ title: t("settings.account.clearFailedTitle") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      <p className="text-sm font-medium text-text">
        {t("settings.account.apiToken")}
      </p>
      <p className="text-xs text-text-faint">
        {t("settings.account.apiTokenDescription")}
      </p>
      <div className="mt-1 flex gap-2">
        <Input
          type="password"
          size="sm"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={t("settings.account.apiTokenPlaceholder")}
          aria-label={t("settings.account.apiToken")}
        />
        <Button
          size="sm"
          onClick={() => void saveToken()}
          disabled={token.trim() === ""}
          loading={saving}
        >
          {t("settings.account.save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void clearToken()}
          disabled={saving}
        >
          {t("settings.account.clear")}
        </Button>
      </div>
    </div>
  );
}
