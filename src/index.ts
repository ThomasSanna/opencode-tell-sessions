import { type Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import { z } from "zod";
import {
  buildSearchResult,
  collectText,
  countInboundDMs,
  cropExcerpt,
  describeCandidates,
  DM_EXCHANGE_LIMIT,
  formatDM,
  listRecentHint,
  recentSessions,
  resolveTarget,
  searchByTitle,
  toHit,
  fmtTime,
  type SearchHit,
} from "./helpers.js";

export const plugin: Plugin = async (input) => {
  const client = input.client;

  return {
    tool: {
      session_search: tool({
        description:
          "Search OpenCode sessions by title, date, or conversation content. " +
          "Use this when the user mentions another session ambiguously " +
          "(e.g. 'the last session that talks about frontend', 'the backend session'). " +
          "Returns candidate sessions sorted by recency with their title, id, last-updated date, and an excerpt.",
        args: {
          query: z.string().describe("Text to search: title, content keyword, or description"),
          limit: z.number().int().positive().max(20).optional().describe("Maximum number of sessions (default 10)"),
        },
        async execute(args, ctx) {
          const limit = args.limit ?? 10;
          try {
            const { data: sessions } = await client.session.list({ throwOnError: true });
            const all = sessions ?? [];
            const titleHits = searchByTitle(all, args.query);
            const hits: SearchHit[] = titleHits.map((s) => toHit(s));
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
                return toHit(s, excerpt);
              }),
            );
            hits.push(...scanned);
            hits.sort((a, b) => b.updated - a.updated);
            return { title: "Sessions found", output: buildSearchResult(hits) };
          } catch (err) {
            return {
              title: "session_search error",
              output: `Failed to list sessions: ${String(err)}`,
            };
          }
        },
      }),
      session_send: tool({
        description:
          "Send a direct message (DM) to another OpenCode session on the same server. " +
          "Use this when the user asks to talk to another session " +
          "(e.g. 'ask the frontend session to update the endpoint', 'tell weekly-digest ...'). " +
          "The message is injected into the target session with the @source-title prefix plus " +
          "instructions telling it to answer via session_send when needed and to stop " +
          "once the exchange has served its purpose, " +
          "so the conversation can flow both ways without looping. " +
          "A loop guard refuses to send once two sessions have exchanged " +
          `${DM_EXCHANGE_LIMIT} DMs. ` +
          "Only send a DM if the user asks for it or if another agent explicitly asked you to reply. " +
          "Do not automatically reply to a received DM, unless the message contains a question or a request for you.",
        args: {
          target: z.string().describe("Title of the target session (or its id)"),
          message: z.string().describe("Content of the message to send"),
        },
        async execute(args, ctx) {
          try {
            const { data: sessions } = await client.session.list({ throwOnError: true });
            const all = sessions ?? [];
            const resolved = resolveTarget(all, args.target, ctx.sessionID);
            if (resolved.kind === "self") {
              return {
                title: "session_send refused",
                output: "You are already in this session. Pick another target session.",
              };
            }
            if (resolved.kind === "not-found") {
              const hint = listRecentHint(all, ctx.sessionID);
              return {
                title: "Session not found",
                output:
                  `Session "${args.target}" not found. Use session_search to find the right session.\n` +
                  `Recent sessions on the server:\n${hint}`,
              };
            }
            if (resolved.kind === "ambiguous") {
              return {
                title: "Ambiguous session",
                output:
                  `Multiple sessions match "${args.target}". Specify a more exact id or title:\n` +
                  describeCandidates(resolved.candidates),
              };
            }
            const targetSession = resolved.session;
            const sender =
              all.find((s) => s.id === ctx.sessionID)?.title ?? ctx.sessionID;

            try {
              const [targetMsgs, ownMsgs] = await Promise.all([
                client.session.messages({
                  path: { id: targetSession.id },
                  query: { limit: 100 },
                  throwOnError: true,
                }),
                client.session.messages({
                  path: { id: ctx.sessionID },
                  query: { limit: 100 },
                  throwOnError: true,
                }),
              ]);
              const prior =
                countInboundDMs(targetMsgs.data ?? [], ctx.sessionID) +
                countInboundDMs(ownMsgs.data ?? [], targetSession.id);
              if (prior >= DM_EXCHANGE_LIMIT) {
                return {
                  title: "session_send refused",
                  output:
                    `Loop protection: you and "${targetSession.title}" have already exchanged ` +
                    `${prior} DMs (limit ${DM_EXCHANGE_LIMIT}). The conversation should end here — ` +
                    `do not send further DMs to this session unless the user explicitly asks you to continue.`,
                };
              }
            } catch {
              // Fail-open: if history can't be read, proceed without the loop guard.
            }

            const text = formatDM(sender, args.message, ctx.sessionID);
            await client.session.promptAsync({
              path: { id: targetSession.id },
              body: { parts: [{ type: "text", text }] },
              throwOnError: true,
            });
            return {
              title: "DM sent",
              output:
                `DM sent to "${targetSession.title}" (${targetSession.id}) at ${fmtTime(Date.now())}.`,
            };
          } catch (err) {
            return {
              title: "session_send error",
              output: `Failed to send DM: ${String(err)}`,
            };
          }
        },
      }),
    },
  };
};

export default plugin;
