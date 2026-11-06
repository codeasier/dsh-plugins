import { describe, expect, it } from 'vitest'

import { clampText, errorMessage, isRecord } from './index.js'

describe('clampText', () => {
  it('trims surrounding whitespace', () => {
    expect(clampText('  hello  ', 20)).toBe('hello')
  })

  it('keeps text that fits exactly', () => {
    expect(clampText('hello', 5)).toBe('hello')
  })

  it('caps by Unicode code point instead of UTF-16 unit', () => {
    expect(clampText('a😀b', 2)).toBe('a😀')
  })

  it('rejects an invalid limit', () => {
    expect(() => clampText('hello', -1)).toThrow(RangeError)
    expect(() => clampText('hello', 1.5)).toThrow(RangeError)
  })
})

describe('errorMessage', () => {
  it('uses the Error message and collapses newlines', () => {
    expect(errorMessage(new Error('first\nsecond'))).toBe('first second')
  })

  it('renders non-Error values', () => {
    expect(errorMessage('denied')).toBe('denied')
    expect(errorMessage({ code: 'EACCES' })).toBe('{"code":"EACCES"}')
    expect(errorMessage(undefined)).toBe('undefined')
  })

  it('survives a circular object', () => {
    const value: Record<string, unknown> = {}
    value.self = value
    expect(errorMessage(value)).toBe('[object Object]')
  })
})

describe('isRecord', () => {
  it('accepts plain and null-prototype objects', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord(Object.create(null))).toBe(true)
  })

  it('rejects arrays, null, and class instances', () => {
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord(new Date())).toBe(false)
  })
})
