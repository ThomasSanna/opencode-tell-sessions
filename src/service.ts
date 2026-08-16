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

export interface SearchArgs {
  query: string;
  limit?: number;
}

export interface SendArgs {
  target: string;
  message: string;
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
  const hits = searchByTitle(sessions, args.query).map((s) => toHit(s));
  const seen = new Set(hits.map((h) => h.sessionID));
  const batch = recentSessions(sessions, limit, senderID).filter(
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
  const resolved = resolveTarget(sessions, args.target, senderID);
  if (resolved.kind === "self") {
    return "You are already in this session. Pick another target session.";
  }
  if (resolved.kind === "not-found") {
    const hint = listRecentHint(sessions, senderID);
    return (
      `Session "${args.target}" not found. Use session_search to find the right session.\n` +
      `Recent sessions on the server:\n${hint}`
    );
  }
  if (resolved.kind === "ambiguous") {
    return (
      `Multiple sessions match "${args.target}". Specify a more exact id or title:\n` +
      describeCandidates(resolved.candidates)
    );
  }

  const target = resolved.session;
  const sender = sessions.find((s) => s.id === senderID)?.title ?? senderID;

  let prior = 0;
  try {
    const [targetTexts, ownTexts] = await Promise.all([
      runtime.messageTexts(target.id),
      runtime.messageTexts(senderID),
    ]);
    prior =
      countInboundDMs(targetTexts, senderID) +
      countInboundDMs(ownTexts, target.id);
  } catch {
    // Fail-open: if history can't be read, proceed without the loop guard.
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
