import { type Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import { z } from "zod";
import {
  buildSearchResult,
  collectText,
  cropExcerpt,
  describeCandidates,
  formatDM,
  listRecentHint,
  recentSessions,
  resolveTarget,
  searchByTitle,
  fmtTime,
  type SearchHit,
} from "./helpers.js";

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
            const batch = recentSessions(all, limit, ctx.sessionID).filter(
              (s) => !seen.has(s.id),
            );
            const scanned = await Promise.all(
              batch.map(async (s) => {
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
                } satisfies SearchHit;
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
