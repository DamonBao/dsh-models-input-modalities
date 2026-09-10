/** Row vocabulary every per-model claim shares. */

/** One configured model row, structurally open so hidden fields survive an edit. */
export type ModelRow = Record<string, unknown>

/**
 * The row's model id for labels.
 * @param row - one stored model row.
 * @param index - the row's zero-based position.
 * @returns the id, or a positional name for an id-less row.
 */
export function rowId(row: ModelRow, index: number): string {
  const id = row['id']
  return typeof id === 'string' && id.length > 0 ? id : `#${String(index + 1)}`
}
