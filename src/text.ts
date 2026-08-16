/**
 * Shared, user-facing tool text used by both the V1 and V2 adapters so the
 * tool descriptions and error rendering cannot drift between runtimes.
 */

export const SEARCH_TOOL_DESCRIPTION =
  "Search OpenCode sessions by title, date, or conversation content. " +
  "Use this when the user mentions another session ambiguously " +
  "(e.g. 'the last session that talks about frontend', 'the backend session'). " +
  "Returns candidate sessions sorted by recency with their title, id, last-updated date, and an excerpt.";

export const SEND_TOOL_DESCRIPTION =
  "Send a direct message (DM) to another OpenCode session on the same server. " +
  "Use this when the user asks to talk to another session " +
  "(e.g. 'ask the frontend session to update the endpoint', 'tell weekly-digest ...'). " +
  "The message is injected into the target session with the @source-title prefix plus " +
  "instructions telling it to answer via session_send when needed and to stop " +
  "once the exchange has served its purpose, " +
  "so the conversation can flow both ways without looping. " +
  "A loop guard refuses to send once two sessions have exchanged " +
  "10 DMs. " +
  "Only send a DM if the user asks for it or if another agent explicitly asked you to reply. " +
  "Do not automatically reply to a received DM, unless the message contains a question or a request for you.";

/** Human-readable form of an unknown error, avoiding bare "[object Object]". */
export function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}