type Translate = (key: string) => string;

export type ChatErrorContent = {
  title: string;
  description: string;
};

/**
 * Maps AppError codes (api-client / sse / stream events) to user-facing
 * strings. `t` is bound to the `aiAgents` namespace; cross-namespace keys
 * use the `chatbot:` prefix.
 */
export function chatErrorContent(code: string, t: Translate): ChatErrorContent {
  switch (code) {
    case "UNAUTHORIZED":
      return {
        title: t("message.errorUnauthorized"),
        description: t("message.errorUnauthorizedDesc"),
      };
    case "FORBIDDEN":
      return {
        title: t("message.errorForbidden"),
        description: t("message.errorForbiddenDesc"),
      };
    case "RATE_LIMITED":
      return {
        title: t("message.errorTooManyRequests"),
        description: t("message.errorTooManyRequestsDesc"),
      };
    case "NETWORK":
    case "TIMEOUT":
    case "STREAM_INTERRUPTED":
      return {
        title: t("message.error"),
        description: t("chatbot:networkError.labelError"),
      };
    case "VALIDATION":
    case "REQUEST_FAILED":
    case "NOT_FOUND":
      return {
        title: t("message.errorBadRequest"),
        description: t("message.errorBadRequestDesc"),
      };
    default:
      return {
        title: t("message.errorServerError"),
        description: t("message.errorServerErrorDesc"),
      };
  }
}
