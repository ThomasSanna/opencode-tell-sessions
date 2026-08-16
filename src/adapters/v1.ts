import { tool } from "@opencode-ai/plugin/v1";
import { z } from "zod";
import { createV1Runtime, type V1Client } from "../runtime/v1.js";
import { runSearch, runSend } from "../service.js";
import {
  errMsg,
  SEND_TOOL_DESCRIPTION,
  SEARCH_TOOL_DESCRIPTION,
} from "../text.js";

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
        description: SEARCH_TOOL_DESCRIPTION,
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
              output: `Failed to list sessions: ${errMsg(err)}`,
            };
          }
        },
      }),
      tool({
        description: SEND_TOOL_DESCRIPTION,
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
              output: `Failed to send DM: ${errMsg(err)}`,
            };
          }
        },
      }),
    ],
  };
};
