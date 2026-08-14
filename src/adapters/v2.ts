import { Plugin } from "@opencode-ai/plugin";
import { Schema } from "effect";
import { createV2Runtime } from "../runtime/v2.js";
import { runSearch, runSend } from "../service.js";

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
        description:
          "Search OpenCode sessions by title, date, or conversation content. " +
          "Use this when the user mentions another session ambiguously " +
          "(e.g. 'the last session that talks about frontend', 'the backend session'). " +
          "Returns candidate sessions sorted by recency with their title, id, last-updated date, and an excerpt.",
        input: Schema.Struct({
          query: Schema.String,
          limit: Schema.optional(Schema.Number),
        }),
        async execute(input, context) {
          try {
            const content = await runSearch(runtime, input, context.sessionID);
            return { content };
          } catch (err) {
            return { content: `Failed to list sessions: ${String(err)}` };
          }
        },
      });

      tools.add({
        name: "session_send",
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
        input: Schema.Struct({
          target: Schema.String,
          message: Schema.String,
        }),
        async execute(input, context) {
          try {
            const content = await runSend(runtime, input, context.sessionID);
            return { content };
          } catch (err) {
            return { content: `Failed to send DM: ${String(err)}` };
          }
        },
      });
    });
  },
});
