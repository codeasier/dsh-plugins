import type { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'

import { apply, type Config } from './index.js'

/** Mount the plugin against the smallest context it declares. */
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
  if (definition === undefined) throw new Error('hello registered no tool')
  return definition
}

const DEFAULTS: Config = { greeting: 'Hello', maxNameLength: 64 }

describe('apply', () => {
  it('registers exactly one tool named hello', () => {
    const tool = mount(DEFAULTS)
    expect(tool.name).toBe('hello')
    expect(tool.description).toContain('Greet a person by name')
  })

  it('rejects a non-positive name limit at activation', () => {
    expect(() => mount({ ...DEFAULTS, maxNameLength: 0 })).toThrow(/maxNameLength/)
  })
})

describe('hello tool', () => {
  it('greets a trimmed name', async () => {
    const tool = mount(DEFAULTS)
    await expect(tool.execute({ name: '  Ada  ' }, {} as never)).resolves.toEqual({
      text: 'Hello, Ada!',
    })
  })

  it('caps the name and keeps surrogate pairs intact', async () => {
    const tool = mount({ greeting: 'Hi', maxNameLength: 2 })
    await expect(tool.execute({ name: '😀😀😀' }, {} as never)).resolves.toEqual({
      text: 'Hi, 😀😀!',
    })
  })

  it('rejects a blank name', async () => {
    const tool = mount(DEFAULTS)
    await expect(tool.execute({ name: '   ' }, {} as never)).rejects.toThrow(/at least one/)
  })

  it('renders the greeting as one text block', async () => {
    const tool = mount(DEFAULTS)
    const value = await tool.execute({ name: 'Ada' }, {} as never)
    const blocks = tool.output.render({ name: 'Ada' }, value as never)
    expect(blocks).toEqual([{ type: 'text', text: 'Hello, Ada!' }])
  })
})
