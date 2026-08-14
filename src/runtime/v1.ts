import type { createOpencodeClient } from "@opencode-ai/sdk";
import { collectText } from "../helpers.js";
import type { SessionView } from "../model.js";
import type { SessionRuntime } from "../runtime.js";

/** The V1 (legacy) OpenCode client type. */
export type V1Client = ReturnType<typeof createOpencodeClient>;

/** Minimal shape of a V1 SDK session, to avoid coupling to its exact import. */
interface V1Session {
  id: string;
  title?: string;
  directory?: string;
  time?: { created?: number; updated?: number };
}

/** Minimal shape of a V1 SDK message carrying parts. */
interface V1Message {
  parts?: readonly { type?: string; text?: string; synthetic?: boolean }[];
}

function toView(s: V1Session): SessionView {
  return {
    id: s.id,
    title: s.title,
    directory: s.directory,
    created: s.time?.created,
    updated: s.time?.updated ?? 0,
  };
}

/**
 * Runtime adapter for OpenCode V1. Uses the legacy SDK client directly
 * (`session.list`, `session.messages`, `session.promptAsync`).
 */
export function createV1Runtime(client: V1Client): SessionRuntime {
  return {
    async listSessions() {
      const { data } = await client.session.list({ throwOnError: true });
      return (data ?? []).map(toView);
    },

    async messageTexts(sessionID) {
      const { data } = await client.session.messages({
        path: { id: sessionID },
        query: { limit: 100 },
        throwOnError: true,
      });
      return ((data ?? []) as V1Message[]).map((m) => collectText(m.parts ?? []));
    },

    async send(sessionID, text) {
      await client.session.promptAsync({
        path: { id: sessionID },
        body: { parts: [{ type: "text", text }] },
        throwOnError: true,
      });
    },
  };
}
