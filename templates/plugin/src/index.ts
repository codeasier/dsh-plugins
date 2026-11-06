/**
 * __TITLE__ — replace this comment with why the plugin exists and what a user
 * gains from it.
 *
 * Conventions:
 * - `name` is the Loader identity and the patch row id.
 * - `inject` lists every service the plugin needs; it stays inactive otherwise.
 * - `Config` is the supported place for tunables.
 * @module __PACKAGE_NAME__
 */

import { clampText } from '@codeasier/dsh-plugin-kit'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'

/** Stable Loader identity; keep it equal to the patch row id. */
export const name = '__ROW_ID__'

/** The tool registry must exist before this plugin can contribute a tool. */
export const inject = ['tools']

/** User-tunable settings, validated at activation. */
export interface Config {
  /** Text placed before the echoed input. */
  prefix: string
  /** Maximum accepted input length, in Unicode code points. */
  maxTextLength: number
}

/** Schema for {@link Config}. */
export const Config: z<Config> = z.object({
  prefix: z.string().default('__TITLE__').description('Text placed before the echoed input.'),
  maxTextLength: z
    .natural()
    .default(200)
    .description('Maximum accepted input length, in Unicode code points.'),
})

/**
 * Register the plugin's contributions.
 * @param ctx - the plugin context.
 * @param config - validated settings from the patch row.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.tools.register(
    defineTool({
      name: '__TOOL_NAME__',
      description:
        '__DESCRIPTION__ Replace this description with the exact situation in which the model should call the tool.',
      parameters: {
        text: {
          type: 'string',
          required: true,
          description: 'Text to echo back.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            text: {
              type: 'string',
              required: true,
              description: 'The text that was produced.',
            },
          },
        },
        render: (_args, value) => [{ type: 'text', text: value.text }],
      },
      async execute(args) {
        if (!Number.isSafeInteger(config.maxTextLength) || config.maxTextLength < 1) {
          throw new Error('__ROW_ID__: maxTextLength must be a positive integer')
        }
        return { text: `${config.prefix}: ${clampText(args.text, config.maxTextLength)}` }
      },
    }),
  )
}
