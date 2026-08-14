/**
 * Runtime-agnostic session model.
 *
 * Both the V1 (`@opencode-ai/sdk`) and V2 (`SessionInfo`) session objects
 * differ in shape. Every runtime adapter maps its own session type into this
 * normalized view so the pure logic in `helpers.ts` never depends on a
 * specific OpenCode version.
 */
export interface SessionView {
  id: string;
  title?: string;
  directory?: string;
  created?: number;
  updated: number;
}

/** A searchable, renderable representation of a session. */
export interface SearchHit {
  sessionID: string;
  title?: string;
  created?: number;
  updated: number;
  directory?: string;
  excerpt?: string;
}
