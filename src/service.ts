import {
  buildSearchResult,
  countInboundDMs,
  cropExcerpt,
  DM_EXCHANGE_LIMIT,
  describeCandidates,
  fmtTime,
  formatDM,
  listRecentHint,
  recentSessions,
  resolveTarget,
  searchByTitle,
  toHit,
  type ResolveResult,
} from "./helpers.js";
import type { SessionView } from "./model.js";
import type { SessionRuntime } from "./runtime.js";

/** Default and cap for `session_search` results; the cap mirrors the V1 schema's `.max(20)`. */
const SEARCH_LIMIT_DEFAULT = 10;
const SEARCH_LIMIT_MAX = 20;

/** Normalize the user-supplied limit so V1 and V2 adapters behave identically. */
function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || Number.isNaN(limit)) return SEARCH_LIMIT_DEFAULT;
  return Math.min(Math.max(Math.floor(limit), 1), SEARCH_LIMIT_MAX);
}

/** Visibility scope for session lookup. Defaults to `"project"` (same directory as the sender); pass `"server"` to opt into cross-project access. */
export type Scope = "project" | "server";

/**
 * Restrict a session list to the sender's project directory unless the caller
 * explicitly opts into server-wide visibility. Falls back to the full list
 * when the sender is unknown or has no directory so older runtimes keep working.
 */
function scopeSessions(
  sessions: SessionView[],
  senderID: string,
  scope: Scope | undefined,
): SessionView[] {
  if (scope === "server") return sessions;
  const sender = sessions.find((s) => s.id === senderID);
  if (!sender?.directory) return sessions;
  return sessions.filter((s) => s.directory === sender.directory);
}

export interface SearchArgs {
  query: string;
  limit?: number;
  scope?: Scope;
}

export interface SendArgs {
  target: string;
  message: string;
  scope?: Scope;
}

/**
 * Shared implementation of `session_search`, version-agnostic.
 * Returns the rendered result string (the adapter wraps it into its own
 * tool-result envelope).
 */
export async function runSearch(
  runtime: SessionRuntime,
  args: SearchArgs,
  senderID: string,
): Promise<string> {
  const limit = normalizeLimit(args.limit);
  const sessions = await runtime.listSessions();
  const visible = scopeSessions(sessions, senderID, args.scope);
  const hits = searchByTitle(visible, args.query).map((s) => toHit(s));
  const seen = new Set(hits.map((h) => h.sessionID));
  const batch = recentSessions(visible, limit, senderID).filter(
    (s) => !seen.has(s.id),
  );

  const scanned = await Promise.all(
    batch.map(async (s) => {
      let excerpt: string | undefined;
      try {
        const texts = await runtime.messageTexts(s.id);
        excerpt = cropExcerpt(texts.join("\n"), args.query, 300);
      } catch {
        excerpt = undefined;
      }
      return toHit(s, excerpt);
    }),
  );

  hits.push(...scanned);
  hits.sort((a, b) => b.updated - a.updated);
  return buildSearchResult(hits);
}

/**
 * Shared implementation of `session_send`, version-agnostic.
 * Returns either the rendered refusal message or the "DM sent" confirmation.
 */
export async function runSend(
  runtime: SessionRuntime,
  args: SendArgs,
  senderID: string,
): Promise<string> {
  const sessions = await runtime.listSessions();
  const visible = scopeSessions(sessions, senderID, args.scope);
  const resolved = resolveTarget(visible, args.target, senderID);
  if (resolved.kind === "self") {
    return "You are already in this session. Pick another target session.";
  }
  if (resolved.kind === "not-found") {
    const hint = listRecentHint(visible, senderID);
    return (
      `Session "${args.target}" not found. Use session_search to find the right session.\n` +
      `Recent sessions:\n${hint}`
    );
  }
  if (resolved.kind === "ambiguous") {
    return (
      `Multiple sessions match "${args.target}". Specify a more exact id or title:\n` +
      describeCandidates(resolved.candidates)
    );
  }

  const target = resolved.session;
  const sender = visible.find((s) => s.id === senderID)?.title ?? senderID;

  let prior: number;
  try {
    const [targetTexts, ownTexts] = await Promise.all([
      runtime.messageTexts(target.id),
      runtime.messageTexts(senderID),
    ]);
    prior =
      countInboundDMs(targetTexts, senderID) +
      countInboundDMs(ownTexts, target.id);
  } catch {
    // Fail-closed: without history the loop guard cannot run, so refuse rather than risk a loop.
    return (
      `Could not verify DM history with "${target.title ?? target.id}" — ` +
      `DM not sent to avoid loops. Retry later or ask the user to confirm.`
    );
  }

  if (prior >= DM_EXCHANGE_LIMIT) {
    return (
      `Loop protection: you and "${target.title ?? target.id}" have already exchanged ` +
      `${prior} DMs (limit ${DM_EXCHANGE_LIMIT}). The conversation should end here — ` +
      `do not send further DMs to this session unless the user explicitly asks you to continue.`
    );
  }

  await runtime.send(target.id, formatDM(sender, args.message, senderID));
  return `DM sent to "${target.title ?? target.id}" (${target.id}) at ${fmtTime(Date.now())}.`;
}

/** Re-exported for the adapters to switch on resolve results if needed. */
export type { ResolveResult, SessionView };
