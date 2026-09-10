import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LEVELS,
  THINKING_LEVELS,
  parseReasoningChoice,
  reasoningChoice,
  reasoningFailure,
  reasoningLevels,
  setWire,
  toggleLevel,
  withReasoning,
} from '../src/reasoning-efforts.ts'

describe('reasoningChoice', () => {
  it('reads absent, false, a dict, and values that state no claim', () => {
    expect(reasoningChoice({ id: 'm' })).toBe('inherit')
    expect(reasoningChoice({ id: 'm', reasoningEfforts: false })).toBe('none')
    expect(reasoningChoice({ id: 'm', reasoningEfforts: { high: 'high' } })).toBe('custom')
    expect(reasoningChoice({ id: 'm', reasoningEfforts: {} })).toBe('custom')
    expect(reasoningChoice({ id: 'm', reasoningEfforts: true })).toBe('inherit')
    expect(reasoningChoice({ id: 'm', reasoningEfforts: 'high' })).toBe('inherit')
    expect(reasoningChoice({ id: 'm', reasoningEfforts: ['high'] })).toBe('inherit')
    expect(reasoningChoice({ id: 'm', reasoningEfforts: null })).toBe('inherit')
  })
})

describe('reasoningLevels', () => {
  it('answers the default set for a row declaring nothing', () => {
    expect(reasoningLevels({ id: 'm' })).toEqual(DEFAULT_LEVELS)
    expect(reasoningLevels({ id: 'm', reasoningEfforts: false })).toEqual(DEFAULT_LEVELS)
    expect(DEFAULT_LEVELS['off']).toEqual({ offered: false, wire: '' })
    expect(DEFAULT_LEVELS['low']).toEqual({ offered: true, wire: 'low' })
    expect(DEFAULT_LEVELS['high']).toEqual({ offered: true, wire: 'high' })
    expect(DEFAULT_LEVELS['max']).toEqual({ offered: false, wire: '' })
  })

  it('reads every one of the seven levels, offered or not', () => {
    const levels = reasoningLevels({ id: 'm', reasoningEfforts: { off: null, high: 'high', max: 'ultra' } })
    expect(Object.keys(levels)).toEqual([...THINKING_LEVELS])
    expect(levels['off']).toEqual({ offered: true, wire: '' })
    expect(levels['high']).toEqual({ offered: true, wire: 'high' })
    expect(levels['max']).toEqual({ offered: true, wire: 'ultra' })
    expect(levels['minimal']).toEqual({ offered: false, wire: '' })
  })

  it('reads a value of a refused type as no spelling yet, and ignores keys outside the seven', () => {
    const levels = reasoningLevels({ id: 'm', reasoningEfforts: { high: 3, bogus: 'x' } })
    expect(levels['high']).toEqual({ offered: true, wire: '' })
    expect(Object.keys(levels)).toEqual([...THINKING_LEVELS])
  })
})

describe('withReasoning', () => {
  it('removes, refuses, and declares the claim while other fields survive', () => {
    expect(withReasoning({ id: 'm', input: ['text'] }, 'inherit', DEFAULT_LEVELS))
      .toEqual({ id: 'm', input: ['text'] })
    expect(withReasoning({ id: 'm', reasoningEfforts: { high: 'high' } }, 'none', DEFAULT_LEVELS))
      .toEqual({ id: 'm', reasoningEfforts: false })
    expect(withReasoning({ id: 'm', reasoningEfforts: false }, 'inherit', DEFAULT_LEVELS))
      .toEqual({ id: 'm' })
    expect(withReasoning({ id: 'm', contextWindow: 8 }, 'custom', DEFAULT_LEVELS))
      .toEqual({ id: 'm', contextWindow: 8, reasoningEfforts: { low: 'low', medium: 'medium', high: 'high' } })
  })

  it('writes only offered levels, in escalation order', () => {
    const levels = toggleLevel(toggleLevel(DEFAULT_LEVELS, 'max', true), 'low', false)
    const row = withReasoning({ id: 'm' }, 'custom', setWire(levels, 'max', 'ultra'))
    expect(row).toEqual({ id: 'm', reasoningEfforts: { medium: 'medium', high: 'high', max: 'ultra' } })
    expect(Object.keys(row['reasoningEfforts'] as Record<string, unknown>))
      .toEqual(['medium', 'high', 'max'])
  })

  it('stores a valueless off as null', () => {
    expect(withReasoning({ id: 'm' }, 'custom', toggleLevel(DEFAULT_LEVELS, 'off', true)))
      .toEqual({ id: 'm', reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high' } })
  })

  it('trims a spelling so a stray space cannot reach the wire', () => {
    const levels = setWire(DEFAULT_LEVELS, 'high', '  high  ')
    expect(withReasoning({ id: 'm' }, 'custom', levels)['reasoningEfforts'])
      .toEqual({ low: 'low', medium: 'medium', high: 'high' })
  })
})

describe('toggleLevel', () => {
  it('starts an offered level from its default spelling and clears a withdrawn one', () => {
    expect(toggleLevel(DEFAULT_LEVELS, 'max', true)['max']).toEqual({ offered: true, wire: 'max' })
    expect(toggleLevel(DEFAULT_LEVELS, 'off', true)['off']).toEqual({ offered: true, wire: '' })
    expect(toggleLevel(DEFAULT_LEVELS, 'low', false)['low']).toEqual({ offered: false, wire: '' })
    expect(toggleLevel(setWire(DEFAULT_LEVELS, 'high', 'ultra'), 'high', false)['high'])
      .toEqual({ offered: false, wire: '' })
  })

  it('leaves the other levels and an unchanged toggle alone', () => {
    expect(toggleLevel(DEFAULT_LEVELS, 'high', true)).toBe(DEFAULT_LEVELS)
    expect(toggleLevel(DEFAULT_LEVELS, 'max', true)['high']).toEqual(DEFAULT_LEVELS['high'])
  })
})

describe('setWire', () => {
  it('retypes one spelling and keeps the rest', () => {
    const levels = setWire(DEFAULT_LEVELS, 'high', 'ultra')
    expect(levels['high']).toEqual({ offered: true, wire: 'ultra' })
    expect(levels['low']).toEqual(DEFAULT_LEVELS['low'])
  })
})

describe('reasoningFailure', () => {
  it('accepts a row that declares nothing and a set that offers a level', () => {
    expect(reasoningFailure({ id: 'm' })).toBeUndefined()
    expect(reasoningFailure({ id: 'm', reasoningEfforts: false })).toBeUndefined()
    expect(reasoningFailure({ id: 'm', reasoningEfforts: 'high' })).toBeUndefined()
    expect(reasoningFailure(withReasoning({ id: 'm' }, 'custom', DEFAULT_LEVELS))).toBeUndefined()
    expect(reasoningFailure({ id: 'm', reasoningEfforts: { off: null, high: 'high' } })).toBeUndefined()
  })

  it('names a set offering no level beyond off', () => {
    expect(reasoningFailure({ id: 'm', reasoningEfforts: {} })).toBe('needsLevel')
    expect(reasoningFailure({ id: 'm', reasoningEfforts: { off: null } })).toBe('needsLevel')
    expect(reasoningFailure({ id: 'm', reasoningEfforts: { off: 'nothing' } })).toBe('needsLevel')
  })

  it('names a declared level with no wire value', () => {
    expect(reasoningFailure({ id: 'm', reasoningEfforts: { high: null } })).toBe('needsWire')
    expect(reasoningFailure({ id: 'm', reasoningEfforts: { off: null, high: '' } })).toBe('needsWire')
    expect(reasoningFailure({ id: 'm', reasoningEfforts: { off: null, high: '   ' } })).toBe('needsWire')
  })
})

describe('parseReasoningChoice', () => {
  it('accepts the three option values and refuses anything else', () => {
    expect(parseReasoningChoice('inherit')).toBe('inherit')
    expect(parseReasoningChoice('none')).toBe('none')
    expect(parseReasoningChoice('custom')).toBe('custom')
    expect(parseReasoningChoice('high')).toBeUndefined()
  })
})
