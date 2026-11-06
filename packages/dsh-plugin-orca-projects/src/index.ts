/**
 * Orca Projects — a Web/Desktop client-only plugin that replaces the shipped
 * workspace browser with an Orca-like project sidebar.
 *
 * The host half is an inert bundle row: all behavior ships in `client.js`. The
 * row exists so the plugin can be installed, enabled, versioned, and removed
 * like every other Harness plugin.
 *
 * @module @codeasier/dsh-plugin-orca-projects
 */

import type { Context } from '@deepseek-ai/cordis'

/** Stable Loader identity; keep it equal to the patch row id. */
export const name = 'orca-projects'

/**
 * Activate the package. The client half owns every contribution, so the host
 * context is intentionally unused.
 * @param _ctx - the plugin context.
 */
export function apply(_ctx: Context): void {
  // The client manifest loads `client.js`; no host services are registered.
}
