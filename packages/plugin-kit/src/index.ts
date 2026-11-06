/**
 * Runtime helpers shared by the plugins in this repository.
 *
 * Keep this package free of DSH services and peer dependencies: it may be used
 * by a host half, a client half, unit tests, and build tooling alike. Anything
 * that touches a Cordis context belongs in the plugin, not here.
 * @module @codeasier/dsh-plugin-kit
 */

/**
 * Trim surrounding whitespace and cap the result at `maxLength` Unicode code
 * points. Code-point slicing keeps an emoji or a surrogate pair intact.
 * @param value - text supplied by a caller, possibly untrusted.
 * @param maxLength - maximum number of code points to keep; must be a
 * non-negative safe integer.
 * @returns the trimmed, capped text.
 * @throws RangeError when `maxLength` is not a non-negative safe integer.
 */
export function clampText(value: string, maxLength: number): string {
  if (!Number.isSafeInteger(maxLength) || maxLength < 0) {
    throw new RangeError(`maxLength must be a non-negative safe integer, received ${maxLength}`)
  }
  const trimmed = value.trim()
  const codePoints = Array.from(trimmed)
  return codePoints.length <= maxLength ? trimmed : codePoints.slice(0, maxLength).join('')
}

/**
 * Turn an unknown thrown value into one diagnostic line.
 *
 * `Error` messages win; other values are rendered structurally so a rejected
 * string or a plain object still names itself in a log or tool error.
 * @param error - any value caught from a `try` block or a rejected promise.
 * @returns a message that contains no newline characters.
 */
export function errorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message || error.name
      : typeof error === 'string'
        ? error
        : safeStringify(error)
  return raw.replace(/\s*\n\s*/g, ' ').trim() || 'Unknown error'
}

/**
 * Test whether a value is a plain, non-array object.
 * @param value - any parsed JSON or hand-built value.
 * @returns true when `value` is an object with a prototype of `Object.prototype`
 * or `null`.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Stringify without throwing on cycles or bigint. */
function safeStringify(value: unknown): string {
  if (value === undefined) return 'undefined'
  try {
    return (
      JSON.stringify(value, (_key, inner: unknown) =>
        typeof inner === 'bigint' ? inner.toString() : inner,
      ) ?? String(value)
    )
  } catch {
    return Object.prototype.toString.call(value)
  }
}
