import { plugin } from "./adapters/v1.js";

/**
 * OpenCode V1 plugin entry point.
 *
 * The V1 loader iterates the module's exported functions and picks up the
 * `plugin` function (tools registered via the legacy `tool()` helper).
 */
export { plugin };
export default plugin;