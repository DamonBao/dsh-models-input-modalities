import { describe, expect, it } from 'vitest'
import { imageInputChoice, parseImageInputChoice, rowId, withImageInput } from '../src/image-input.ts'

describe('imageInputChoice', () => {
  it('reads absent, empty, malformed, text, and image lists', () => {
    expect(imageInputChoice({ id: 'm' })).toBe('inherit')
    expect(imageInputChoice({ id: 'm', input: [] })).toBe('inherit')
    expect(imageInputChoice({ id: 'm', input: 'bogus' })).toBe('inherit')
    expect(imageInputChoice({ id: 'm', input: ['text'] })).toBe('text')
    expect(imageInputChoice({ id: 'm', input: ['text', 'image'] })).toBe('image')
    expect(imageInputChoice({ id: 'm', input: ['image'] })).toBe('image')
  })
})

describe('withImageInput', () => {
  it('sets, replaces, and drops the claim while other fields survive', () => {
    expect(withImageInput({ id: 'm', contextWindow: 8 }, 'image'))
      .toEqual({ id: 'm', contextWindow: 8, input: ['text', 'image'] })
    expect(withImageInput({ id: 'm', input: ['text', 'image'] }, 'text'))
      .toEqual({ id: 'm', input: ['text'] })
    expect(withImageInput({ id: 'm', input: ['text'] }, 'inherit'))
      .toEqual({ id: 'm' })
  })
})

describe('parseImageInputChoice', () => {
  it('accepts the three option values and refuses anything else', () => {
    expect(parseImageInputChoice('inherit')).toBe('inherit')
    expect(parseImageInputChoice('text')).toBe('text')
    expect(parseImageInputChoice('image')).toBe('image')
    expect(parseImageInputChoice('audio')).toBeUndefined()
  })
})

describe('rowId', () => {
  it('names a row by its id or by position', () => {
    expect(rowId({ id: 'acme' }, 0)).toBe('acme')
    expect(rowId({ id: '' }, 2)).toBe('#3')
    expect(rowId({}, 0)).toBe('#1')
  })
})
