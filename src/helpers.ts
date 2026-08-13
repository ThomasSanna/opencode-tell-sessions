import type { Session } from "@opencode-ai/sdk";

// Re-exported so tests can type their fixtures:
export type { Session };

export type ResolveResult =
  | { kind: "ok"; session: Session }
  | { kind: "ambiguous"; candidates: Session[] }
  | { kind: "self" }
  | { kind: "not-found" };

export function resolveTarget(
  sessions: Session[],
  target: string,
  senderID?: string,
): ResolveResult {
  const t = target.trim();
  if (t === "") return { kind: "not-found" };
  const self = (s: Session): ResolveResult =>
    senderID && s.id === senderID ? { kind: "self" } : { kind: "ok", session: s };
  const exact = sessions.find((s) => s.title === t);
  if (exact) return self(exact);
  const direct = sessions.find((s) => s.id === t);
  if (direct) return self(direct);
  const lower = t.toLowerCase();
  const matches = sessions.filter((s) => s.title.toLowerCase().includes(lower));
  if (matches.length === 1) return self(matches[0]);
  if (matches.length > 1) {
    const candidates = senderID
      ? matches.filter((s) => s.id !== senderID)
      : matches;
    if (candidates.length === 1) return self(candidates[0]);
    if (candidates.length === 0) return { kind: "not-found" };
    return { kind: "ambiguous", candidates };
  }
  return { kind: "not-found" };
}

export const DM_EXCHANGE_LIMIT = 10;

export type MessageLike = {
  parts?: readonly { type?: string; text?: string; synthetic?: boolean }[];
};

/**
 * Counts direct messages sent by `senderID` that are present in a session's
 * message history. Each injected DM carries the marker `(id: <senderID>)` in
 * its instruction block, which makes the count unambiguous across sessions.
 */
export function countInboundDMs(
  messages: readonly MessageLike[],
  senderID: string,
): number {
  const marker = `(id: ${senderID})`;
  return messages.filter((m) =>
    (m.parts ?? []).some(
      (p) =>
        p.type === "text" &&
        !p.synthetic &&
        typeof p.text === "string" &&
        p.text.includes(marker),
    ),
  ).length;
}

export function formatDM(
  senderTitle: string,
  message: string,
  senderID: string,
): string {
  const trimmed = senderTitle.trim();
  const source =
    trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  const prefix = source === "" ? message : `@${source} | ${message}`;
  const id = senderID.trim();
  if (id === "") return prefix;
  const title = trimmed === "" ? id : trimmed;
  const block =
    `Direct message from session "${title}" (id: ${id}). ` +
    `Reply to the sender using the session_send tool with target "${id}" ` +
    `(or title "${title}") and your answer as the message. ` +
    `Reply only when needed — if either side has already gotten what it wanted ` +
    `from the exchange, let the conversation end there. ` +
    `If you are replying, do not answer this message normally in this session.`;
  return `${prefix}\n\n---\n\n${block}`;
}

export function cropExcerpt(
  text: string,
  query: string,
  maxChars = 300,
): string | undefined {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return undefined;
  if (text.length <= maxChars) return text;
  const half = Math.max(
    0,
    Math.floor((maxChars - query.length - 2) / 2),
  );
  let start = Math.max(0, idx - half);
  let end = Math.min(text.length, idx + query.length + half);
  const room = Math.max(0, maxChars - 2);
  if (end - start > room) {
    const over = end - start - room;
    start = Math.min(idx, start + Math.ceil(over / 2));
    end = end - Math.floor(over / 2);
    if (end - start > room) end = start + room;
  }
  return `…${text.slice(start, end)}…`;
}

export function collectText(
  parts: readonly { type?: string; text?: string; synthetic?: boolean }[],
): string {
  return parts
    .filter((p) => p.type === "text" && !p.synthetic && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n");
}

export function recentSessions(
  sessions: Session[],
  limit: number,
  excludeID?: string,
): Session[] {
  return [...sessions]
    .filter((s) => s.id !== excludeID)
    .sort((a, b) => b.time.updated - a.time.updated)
    .slice(0, limit);
}

export function searchByTitle(sessions: Session[], query: string): Session[] {
  const q = query.toLowerCase();
  return sessions.filter((s) => s.title.toLowerCase().includes(q));
}

export function fmtTime(ts: number): string {
  return new Date(ts).toISOString();
}

export type SearchHit = {
  sessionID: string;
  title: string;
  created: number;
  updated: number;
  directory?: string;
  excerpt?: string;
};

export function toHit(s: Session, excerpt?: string): SearchHit {
  return {
    sessionID: s.id,
    title: s.title,
    created: s.time.created,
    updated: s.time.updated,
    directory: s.directory,
    excerpt,
  };
}

export function buildSearchResult(hits: SearchHit[]): string {
  if (hits.length === 0) return "No session matches.";
  const out = hits
    .map((h) => {
      const dir = h.directory ? ` (${h.directory})` : "";
      const ex = h.excerpt ? `\n    excerpt: ${h.excerpt}` : "";
      return `- [${h.sessionID}] ${h.title} — updated ${fmtTime(h.updated)}${dir}${ex}`;
    })
    .join("\n");
  const cap = 6000;
  const suffix = "\n… (truncated)";
  return out.length <= cap ? out : `${out.slice(0, cap - suffix.length)}${suffix}`;
}

function formatSessionLine(s: Session): string {
  return `- [${s.id}] ${s.title} — updated ${fmtTime(s.time.updated)}`;
}

export function describeCandidates(candidates: Session[]): string {
  if (candidates.length === 0) return "No session matches.";
  return candidates.map(formatSessionLine).join("\n");
}

export function listRecentHint(sessions: Session[], excludeID?: string): string {
  return recentSessions(sessions, 5, excludeID)
    .map(formatSessionLine)
    .join("\n");
}
