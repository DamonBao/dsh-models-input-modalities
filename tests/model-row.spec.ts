import { describe, expect, it } from 'vitest'
import { rowId } from '../src/model-row.ts'

describe('rowId', () => {
  it('names a row by its id or by position', () => {
    expect(rowId({ id: 'acme' }, 0)).toBe('acme')
    expect(rowId({ id: '' }, 2)).toBe('#3')
    expect(rowId({}, 0)).toBe('#1')
    expect(rowId({ id: 7 }, 1)).toBe('#2')
  })
})
