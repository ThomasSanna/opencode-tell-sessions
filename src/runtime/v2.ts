import type { SessionInfo, SessionMessageInfo } from "@opencode-ai/client";
import { OpenCode } from "@opencode-ai/client";
import { Service } from "@opencode-ai/client/service";
import { collectText } from "../helpers.js";
import type { SessionView } from "../model.js";
import type { SessionRuntime } from "../runtime.js";

/** The V2 plugin context exposes only a subset of the session API. */
interface V2PromptCapable {
  prompt(input: { sessionID: string; text: string }): Promise<unknown>;
}

function toView(s: SessionInfo): SessionView {
  return {
    id: s.id,
    title: s.title,
    directory: s.location?.directory,
    created: s.time.created,
    updated: s.time.updated,
  };
}

function messageText(msg: SessionMessageInfo): string {
  if ("text" in msg && typeof msg.text === "string") return msg.text;
  if ("parts" in msg && Array.isArray(msg.parts)) return collectText(msg.parts);
  return "";
}

/**
 * Runtime adapter for OpenCode V2.
 *
 * The plugin context only exposes `ctx.session.prompt` (used for sending).
 * Listing sessions and reading messages require the full client, which we
 * build lazily against the local service via `@opencode-ai/client/service`.
 * The client is cached and created on first use so the plugin still works
 * for sending even if the service cannot be reached.
 */
export function createV2Runtime(ctx: V2PromptCapable): SessionRuntime {
  let clientPromise: Promise<ReturnType<typeof OpenCode.make>> | undefined;

  const getClient = (): Promise<ReturnType<typeof OpenCode.make>> => {
    clientPromise ??= (async () => {
      const endpoint = await Service.ensure();
      return OpenCode.make({
        baseUrl: endpoint.url,
        headers: Service.headers(endpoint),
      });
    })();
    return clientPromise;
  };

  return {
    async listSessions() {
      const client = await getClient();
      const { data } = await client.session.list();
      return data.map(toView);
    },

    async messageTexts(sessionID) {
      const client = await getClient();
      const { data } = await client.message.list({ sessionID, limit: 100 });
      return data.map(messageText);
    },

    async send(sessionID, text) {
      await ctx.prompt({ sessionID, text });
    },
  };
}
