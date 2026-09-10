/** Pure row helpers for the per-model image-input claim. */

import type { ModelRow } from './model-row.ts'

/** The three image-input states a row's select offers. */
export type ImageInputChoice = 'inherit' | 'text' | 'image'

/**
 * The choice a row's stored `input` displays. Absent and empty mean the same
 * inheritance — the installed catalog's modalities, then the route's
 * `defaultInput` — and any list naming `image` is the image-capable claim
 * however else it is spelled.
 * @param row - one stored model row.
 * @returns the choice the row's select shows.
 */
export function imageInputChoice(row: ModelRow): ImageInputChoice {
  const value = row['input']
  if (!Array.isArray(value) || value.length === 0) return 'inherit'
  return value.includes('image') ? 'image' : 'text'
}

/**
 * The row with one choice applied: `inherit` removes the field, the others
 * store exactly the modality list the adapter reads. Every other field,
 * including ones this card never shows, survives.
 * @param row - the row to patch.
 * @param choice - the selected state.
 * @returns a new row carrying the choice.
 */
export function withImageInput(row: ModelRow, choice: ImageInputChoice): ModelRow {
  const next = { ...row }
  delete next['input']
  if (choice === 'text') next['input'] = ['text']
  else if (choice === 'image') next['input'] = ['text', 'image']
  return next
}

/**
 * Read a select's submitted value. The DOM hands over a bare string, so an
 * unrecognized one is refused rather than cast into the union.
 * @param value - the submitted option value.
 * @returns the choice, or undefined for anything else.
 */
export function parseImageInputChoice(value: string): ImageInputChoice | undefined {
  return value === 'inherit' || value === 'text' || value === 'image' ? value : undefined
}
