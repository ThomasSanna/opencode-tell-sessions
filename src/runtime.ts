import type { SessionView } from "./model.js";

/**
 * Minimal session access contract implemented by each OpenCode runtime.
 *
 * The two supported runtimes — V1 (legacy `@opencode-ai/sdk` client) and V2
 * (`@opencode-ai/client` / plugin context) — expose the same three operations
 * but with different SDKs and data shapes. The adapters hide those differences
 * behind this interface so the tool logic in `service.ts` stays version-agnostic.
 */
export interface SessionRuntime {
  /** All sessions the server knows about, as normalized views. */
  listSessions(): Promise<SessionView[]>;

  /** Plain-text content of each message in a session, newest last. */
  messageTexts(sessionID: string): Promise<string[]>;

  /** Inject a fire-and-forget user message (the DM) into a session. */
  send(sessionID: string, text: string): Promise<void>;
}
