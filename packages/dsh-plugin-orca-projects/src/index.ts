/**
 * Orca Projects — a Web/Desktop client plugin that replaces the shipped
 * workspace browser with an Orca-like project sidebar.
 *
 * The browser half owns every visual contribution. This Host half contributes
 * one authenticated fetch route used to consolidate Git worktrees under one
 * project: the browser cannot read `.git` itself, so the Host resolves each
 * registered workspace with {@link resolveRepositoryResults} and returns the
 * repository identity, including checkouts recorded under `.git/worktrees` that
 * DSH has not registered. The route is optional: without it the browser keeps
 * the path-based fallback.
 *
 * @module @codeasier/dsh-plugin-orca-projects
 */

import type { Context } from '@deepseek-ai/cordis'

import { resolveRepositoryResults } from './repo.js'

/** Stable Loader identity; keep it equal to the patch row id. */
export const name = 'orca-projects'

/** Exact authenticated route the browser half calls. */
export const REPOSITORY_ROUTE = '/api/orca-projects/resolve'

/** The subset of the Host Connection service this plugin needs. */
interface ConnectionService {
  readonly fetch?: {
    register(route: {
      readonly path: string
      readonly methods: readonly ('GET' | 'HEAD' | 'POST')[]
      readonly requestBody: 'buffered' | 'streaming'
      readonly fetch: (request: Request) => Promise<Response>
    }): () => Promise<void>
  }
}

/**
 * Register the repository-resolution route.
 *
 * `ctx.inject` waits for the Connection service instead of requiring it at
 * Loader activation, so a Host profile without the Web transport simply keeps
 * the browser-side fallback.
 *
 * @param ctx - the plugin context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['connection'], (scope) => {
    const connection = scope.get('connection') as ConnectionService | undefined
    if (!connection?.fetch) return
    connection.fetch.register({
      path: REPOSITORY_ROUTE,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          return Response.json({ error: 'body is not JSON' }, { status: 400 })
        }
        const paths = readPaths(payload)
        if (paths === undefined) {
          return Response.json(
            { error: 'paths must be an array of directory strings' },
            { status: 400 },
          )
        }
        const repositories = await resolveRepositoryResults(paths)
        return Response.json({ repositories })
      },
    })
  })
}

/** Read a bounded `{ paths: string[] }` payload, or undefined when malformed. */
function readPaths(payload: unknown): string[] | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const value = (payload as { paths?: unknown }).paths
  if (!Array.isArray(value)) return undefined
  if (value.length > 500) return undefined
  const paths: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') return undefined
    if (entry.length > 4096) return undefined
    paths.push(entry)
  }
  return paths
}
