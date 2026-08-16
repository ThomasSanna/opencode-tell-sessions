import { Plugin } from "@opencode-ai/plugin";
import { Schema } from "effect";
import { createV2Runtime } from "../runtime/v2.js";
import { runSearch, runSend } from "../service.js";
import {
  errMsg,
  SEND_TOOL_DESCRIPTION,
  SEARCH_TOOL_DESCRIPTION,
} from "../text.js";

/**
 * OpenCode V2 plugin adapter.
 *
 * V2 loads a module's default export built with `Plugin.define`. Tools are
 * registered through `ctx.tool.transform(tools.add(...))` with standard
 * schemas; the executor returns model-visible `content`.
 */
export const v2plugin = Plugin.define({
  id: "opencode-tell-sessions",
  setup: async (ctx) => {
    const runtime = createV2Runtime(ctx.session);

    await ctx.tool.transform((tools) => {
      tools.add({
        name: "session_search",
        description: SEARCH_TOOL_DESCRIPTION,
        input: Schema.Struct({
          query: Schema.String,
          limit: Schema.optional(Schema.Number),
        }),
        async execute(input, context) {
          try {
            const content = await runSearch(runtime, input, context.sessionID);
            return { content };
          } catch (err) {
            return { content: `Failed to list sessions: ${errMsg(err)}` };
          }
        },
      });

      tools.add({
        name: "session_send",
        description: SEND_TOOL_DESCRIPTION,
        input: Schema.Struct({
          target: Schema.String,
          message: Schema.String,
        }),
        async execute(input, context) {
          try {
            const content = await runSend(runtime, input, context.sessionID);
            return { content };
          } catch (err) {
            return { content: `Failed to send DM: ${errMsg(err)}` };
          }
        },
      });
    });
  },
});
