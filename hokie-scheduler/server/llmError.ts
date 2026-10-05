const messages = {
  unavailable:
    "Gemini is temporarily unavailable after a retry. Please try again shortly.",
  quota:
    "Gemini's rate limit or account quota was reached. Try later or check the Google AI Studio quota.",
  auth: "Google rejected the Gemini credentials or permissions. Check the backend configuration.",
  model: "The configured Gemini model is unavailable to this account.",
  timeout: "Gemini took too long to respond. Please try again.",
  connection: "The backend could not connect to Gemini. Please try again.",
} as const;
export class LlmServiceError extends Error {
  constructor(public readonly code: keyof typeof messages) {
    super(messages[code]);
    this.name = "LlmServiceError";
  }
}
