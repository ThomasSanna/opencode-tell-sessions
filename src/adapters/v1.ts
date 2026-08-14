import { tool } from "@opencode-ai/plugin/v1";
import { z } from "zod";
import { createV1Runtime, type V1Client } from "../runtime/v1.js";
import { runSearch, runSend } from "../service.js";

/**
 * OpenCode V1 plugin adapter.
 *
 * V1 loads a module by iterating its exported functions; the `plugin`
 * function is picked up by the V1 loader. Tools are registered with the
 * legacy `tool()` helper (zod args, `{ title, output }` results).
 */
export const plugin = async (input: { client: V1Client }): Promise<{
  tool: ReturnType<typeof tool>[];
}> => {
  const runtime = createV1Runtime(input.client);

  return {
    tool: [
      tool({
        description:
          "Search OpenCode sessions by title, date, or conversation content. " +
          "Use this when the user mentions another session ambiguously " +
          "(e.g. 'the last session that talks about frontend', 'the backend session'). " +
          "Returns candidate sessions sorted by recency with their title, id, last-updated date, and an excerpt.",
        args: {
          query: z
            .string()
            .describe("Text to search: title, content keyword, or description"),
          limit: z
            .number()
            .int()
            .positive()
            .max(20)
            .optional()
            .describe("Maximum number of sessions (default 10)"),
        },
        async execute(args, ctx) {
          try {
            const out = await runSearch(runtime, args, ctx.sessionID);
            return { title: "Sessions found", output: out };
          } catch (err) {
            return {
              title: "session_search error",
              output: `Failed to list sessions: ${String(err)}`,
            };
          }
        },
      }),
      tool({
        description:
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
          "Do not automatically reply to a received DM, unless the message contains a question or a request for you.",
        args: {
          target: z.string().describe("Title of the target session (or its id)"),
          message: z.string().describe("Content of the message to send"),
        },
        async execute(args, ctx) {
          try {
            const out = await runSend(runtime, args, ctx.sessionID);
            return { title: "DM sent", output: out };
          } catch (err) {
            return {
              title: "session_send error",
              output: `Failed to send DM: ${String(err)}`,
            };
          }
        },
      }),
    ],
  };
};
