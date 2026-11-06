import type { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'

import { apply, type Config } from './index.js'

function mount(config: Config): ToolDefinition {
  const registered: ToolDefinition[] = []
  const ctx = {
    tools: {
      register(definition: ToolDefinition): () => void {
        registered.push(definition)
        return () => {}
      },
    },
  } as unknown as Context

  apply(ctx, config)

  const definition = registered[0]
  if (definition === undefined) throw new Error('plugin registered no tool')
  return definition
}

const DEFAULTS: Config = { prefix: 'demo', maxTextLength: 200 }

describe('apply', () => {
  it('registers exactly one tool', () => {
    expect(mount(DEFAULTS).name).toBe('__TOOL_NAME__')
  })
})

describe('__TOOL_NAME__ tool', () => {
  it('echoes the input behind the configured prefix', async () => {
    const tool = mount(DEFAULTS)
    await expect(tool.execute({ text: 'hello' }, {} as never)).resolves.toEqual({
      text: 'demo: hello',
    })
  })
})
