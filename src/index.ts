import { v2plugin } from "./adapters/v2.js";
import { plugin } from "./adapters/v1.js";

/**
 * Dual-compatibility entry point.
 *
 * - V1 loader iterates the module's exported functions, so it picks up the
 *   `plugin` function (registered via the legacy `@opencode-ai/plugin/v1`
 *   `tool()` helper).
 * - V2 loader reads the default export built with `Plugin.define`.
 *
 * The module therefore works under both OpenCode V1 and V2 without changes.
 */
export { plugin };
export default v2plugin;
