export const settingsKeys = {
  all: ["settings"] as const,
  appVersion: () => [...settingsKeys.all, "appVersion"] as const,
};
