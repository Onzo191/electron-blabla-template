import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

export const SUPPORTED_LANGUAGES = ["vi", "en"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "vi";

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Strings originate from docs/ai-agents-spec/locales-strings.json
 * (namespaces `aiAgents` + `chatbot`). Adding a language = dropping another
 * generated JSON file here and listing it in `resources`.
 */
void i18next.use(initReactI18next).init({
  resources: { en, vi },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: "en",
  ns: ["aiAgents", "chatbot"],
  defaultNS: "aiAgents",
  interpolation: {
    // React already escapes rendered strings.
    escapeValue: false,
  },
  returnEmptyString: false,
});

export { i18next };
