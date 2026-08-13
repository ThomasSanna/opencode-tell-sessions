import { type Plugin } from "@opencode-ai/plugin";
import type { Session } from "@opencode-ai/sdk";

// Ré-exporté pour que les tests puissent typer leurs fixtures :
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
  const self = (s: Session): ResolveResult =>
    senderID && s.id === senderID ? { kind: "self" } : { kind: "ok", session: s };
  const exact = sessions.find((s) => s.title === t);
  if (exact) return self(exact);
  const direct = sessions.find((s) => s.id === t);
  if (direct) return self(direct);
  const lower = t.toLowerCase();
  const matches = sessions.filter((s) => s.title.toLowerCase().includes(lower));
  if (matches.length === 1) return self(matches[0]);
  if (matches.length > 1) return { kind: "ambiguous", candidates: matches };
  return { kind: "not-found" };
}

export function formatDM(senderTitle: string, message: string): string {
  const source = senderTitle.length > 60 ? `${senderTitle.slice(0, 60)}…` : senderTitle;
  return `@${source} | ${message}`;
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
  const start = Math.max(0, idx - half);
  const end = Math.min(text.length, idx + query.length + half);
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

export const plugin: Plugin = async () => {
  return {
    tool: {},
  };
};

export default plugin;
