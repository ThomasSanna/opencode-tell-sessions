import { type Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import type { Session } from "@opencode-ai/sdk";
import { z } from "zod";

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

export type SearchHit = {
  sessionID: string;
  title: string;
  created: number;
  updated: number;
  directory?: string;
  excerpt?: string;
};

export function buildSearchResult(hits: SearchHit[]): string {
  if (hits.length === 0) return "Aucune session ne correspond.";
  const lines: string[] = [];
  for (const h of hits) {
    const dir = h.directory ? ` (${h.directory})` : "";
    const ex = h.excerpt ? `\n    extrait : ${h.excerpt}` : "";
    lines.push(
      `- [${h.sessionID}] ${h.title} — maj ${fmtTime(h.updated)}${dir}${ex}`,
    );
  }
  const out = lines.join("\n");
  const cap = 6000;
  const suffix = "\n… (tronqué)";
  return out.length <= cap ? out : `${out.slice(0, cap - suffix.length)}${suffix}`;
}

export const plugin: Plugin = async (input) => {
  const client = input.client;

  return {
    tool: {
      session_search: tool({
        description:
          "Recherche une session OpenCode par titre, date ou contenu de conversation. " +
          "Utilise-le quand l'utilisateur mentionne une autre session de façon ambiguë " +
          "(ex. 'la dernière session qui parle de frontend', 'la session backend'). " +
          "Retourne les sessions candidates triées par récence avec leur titre, id, date de mise à jour et un extrait.",
        args: {
          query: z.string().describe("Texte à chercher : titre, mot-clé de contenu, ou description"),
          limit: z.number().int().positive().max(20).optional().describe("Nombre max de sessions (défaut 10)"),
        },
        async execute(args, ctx) {
          const limit = args.limit ?? 10;
          try {
            const { data: sessions } = await client.session.list({ throwOnError: true });
            const all = sessions ?? [];
            const titleHits = searchByTitle(all, args.query);
            const hits: SearchHit[] = titleHits.map((s) => ({
              sessionID: s.id,
              title: s.title,
              created: s.time.created,
              updated: s.time.updated,
              directory: s.directory,
            }));
            const seen = new Set(hits.map((h) => h.sessionID));
            for (const s of recentSessions(all, limit, ctx.sessionID)) {
              if (seen.has(s.id)) continue;
              let excerpt: string | undefined;
              try {
                const { data: msgs } = await client.session.messages({
                  path: { id: s.id },
                  query: { limit: 10 },
                  throwOnError: true,
                });
                const text = (msgs ?? [])
                  .map((m) => collectText(m.parts))
                  .join("\n");
                excerpt = cropExcerpt(text, args.query, 300);
              } catch {
                excerpt = undefined;
              }
              hits.push({
                sessionID: s.id,
                title: s.title,
                created: s.time.created,
                updated: s.time.updated,
                directory: s.directory,
                excerpt,
              });
              seen.add(s.id);
            }
            hits.sort((a, b) => b.updated - a.updated);
            return { title: "Sessions trouvées", output: buildSearchResult(hits) };
          } catch (err) {
            return {
              title: "Erreur session_search",
              output: `Impossible de lister les sessions : ${String(err)}`,
            };
          }
        },
      }),
    },
  };
};

export default plugin;
