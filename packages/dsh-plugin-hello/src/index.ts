/**
 * hello — the repository's reference plugin.
 *
 * It is deliberately small, but every part is production-shaped:
 * - a validated `Config` so users can tune it from `cordis.patch.yml`;
 * - one tool registered on the plugin context, so unload removes it;
 * - display metadata usable by Plugin Manager and Settings without activation;
 * - unit tests for the behavior a user can observe.
 *
 * Copy it, or run `pnpm new <name>`, when adding a plugin.
 * @module @codeasier/dsh-plugin-hello
 */

import { clampText } from '@codeasier/dsh-plugin-kit'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'

/** Stable Loader identity; also the id of the patch row this bundle inserts. */
export const name = 'hello'

/** The tool registry must exist before this plugin can contribute a tool. */
export const inject = ['tools']

/** User-tunable settings, validated at activation. */
export interface Config {
  /**
   * Text placed before the name. Change it in the profile patch when a
   * deployment wants a different greeting.
   */
  greeting: string
  /** Upper bound on the accepted name, in Unicode code points. */
  maxNameLength: number
}

/** Schema for {@link Config}; DSH validates the row's `config` with it. */
export const Config: z<Config> = z.object({
  greeting: z.string().default('Hello').description('Text placed before the name.'),
  maxNameLength: z
    .natural()
    .default(64)
    .description('Maximum accepted name length, in Unicode code points.'),
})

/**
 * Register the plugin's tool. The registration belongs to the plugin context,
 * so unloading the plugin removes it.
 * @param ctx - the plugin context; `tools` is available through `inject`.
 * @param config - validated settings from the patch row.
 */
export function apply(ctx: Context, config: Config): void {
  if (!Number.isSafeInteger(config.maxNameLength) || config.maxNameLength < 1) {
    throw new Error('hello: maxNameLength must be a positive integer')
  }

  ctx.tools.register(
    defineTool({
      name: 'hello',
      description:
        'Greet a person by name. Use it when the user asks for a greeting, or as a smoke test that a DSH plugin is installed and its tool is available.',
      parameters: {
        name: {
          type: 'string',
          required: true,
          description: 'Name of the person to greet. Surrounding whitespace is ignored.',
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
              description: 'The greeting that was produced.',
            },
          },
        },
        render: (_args, value) => [{ type: 'text', text: value.text }],
      },
      async execute(args) {
        const person = clampText(args.name, config.maxNameLength)
        if (person === '') throw new Error('hello: name must contain at least one character')
        return { text: `${config.greeting}, ${person}!` }
      },
    }),
  )
}
