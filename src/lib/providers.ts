/** Client-safe provider metadata (no server imports allowed here). */
export const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o",
    placeholder: "sk-...",
    models: "gpt-4o, gpt-4o-mini, gpt-4.1, o4-mini",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    defaultModel: "claude-sonnet-4-5",
    placeholder: "sk-ant-...",
    models: "claude-sonnet-4-5, claude-haiku-4-5, claude-opus-4-5",
  },
  {
    id: "google",
    name: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    placeholder: "AIza...",
    models: "gemini-2.5-flash, gemini-2.5-pro",
  },
] as const;

export type ProviderId = (typeof PROVIDERS)[number]["id"];

export function isProvider(id: string): id is ProviderId {
  return PROVIDERS.some((p) => p.id === id);
}

export function providerName(id: string) {
  return PROVIDERS.find((p) => p.id === id)?.name ?? id;
}
