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

export function describeCandidates(candidates: Session[]): string {
  if (candidates.length === 0) return "Aucune session ne correspond.";
  return candidates
    .map(
      (s) =>
        `- [${s.id}] ${s.title} — maj ${fmtTime(s.time.updated)}`,
    )
    .join("\n");
}

export function listRecentHint(sessions: Session[], excludeID?: string): string {
  return recentSessions(sessions, 5, excludeID)
    .map((s) => `- [${s.id}] ${s.title} — maj ${fmtTime(s.time.updated)}`)
    .join("\n");
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
            const recent = recentSessions(all, limit, ctx.sessionID).filter(
              (s) => !seen.has(s.id),
            );
            const scanned = await Promise.all(
              recent.map(async (s): Promise<SearchHit> => {
                let excerpt: string | undefined;
                try {
                  const { data: msgs } = await client.session.messages({
                    path: { id: s.id },
                    query: { limit: 100 },
                    throwOnError: true,
                  });
                  const text = (msgs ?? [])
                    .map((m) => collectText(m.parts))
                    .join("\n");
                  excerpt = cropExcerpt(text, args.query, 300);
                } catch {
                  excerpt = undefined;
                }
                return {
                  sessionID: s.id,
                  title: s.title,
                  created: s.time.created,
                  updated: s.time.updated,
                  directory: s.directory,
                  excerpt,
                };
              }),
            );
            hits.push(...scanned);
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
      session_send: tool({
        description:
          "Envoie un message direct (DM) à une autre session OpenCode du même serveur. " +
          "Utilise-le quand l'utilisateur demande de parler à une autre session " +
          "(ex. 'demande à la session frontend de...', 'tell weekly-digest ...'). " +
          "Le message est injecté dans la session cible avec le préfixe @titre-source. " +
          "N'envoie un DM que si l'utilisateur le demande ou si un autre agent t'a explicitement demandé de répondre. " +
          "Ne réponds pas automatiquement à un DM reçu, sauf si le message contient une question ou une requête pour toi.",
        args: {
          target: z.string().describe("Titre de la session cible (ou son id)"),
          message: z.string().describe("Contenu du message à envoyer"),
        },
        async execute(args, ctx) {
          try {
            const { data: sessions } = await client.session.list({ throwOnError: true });
            const all = sessions ?? [];
            const resolved = resolveTarget(all, args.target, ctx.sessionID);
            if (resolved.kind === "self") {
              return {
                title: "session_send refusé",
                output: "Tu es déjà dans cette session. Choisis une autre session cible.",
              };
            }
            if (resolved.kind === "not-found") {
              const hint = listRecentHint(all, ctx.sessionID);
              return {
                title: "Session introuvable",
                output:
                  `Session "${args.target}" introuvable. Utilise session_search pour trouver la bonne session.\n` +
                  `Sessions récentes du serveur :\n${hint}`,
              };
            }
            if (resolved.kind === "ambiguous") {
              return {
                title: "Session ambiguë",
                output:
                  `Plusieurs sessions correspondent à "${args.target}". Précise avec un id ou un titre plus exact :\n` +
                  describeCandidates(resolved.candidates),
              };
            }
            const targetSession = resolved.session;
            const sender =
              all.find((s) => s.id === ctx.sessionID)?.title ?? ctx.sessionID;
            const text = formatDM(sender, args.message);
            await client.session.promptAsync({
              path: { id: targetSession.id },
              body: { parts: [{ type: "text", text }] },
              throwOnError: true,
            });
            return {
              title: "DM envoyé",
              output:
                `DM envoyé à "${targetSession.title}" (${targetSession.id}) à ${fmtTime(Date.now())}.`,
            };
          } catch (err) {
            return {
              title: "Erreur session_send",
              output: `Impossible d'envoyer le DM : ${String(err)}`,
            };
          }
        },
      }),
    },
  };
};

export default plugin;
