/** Settings reads and writes for the image-input card, over the settings Remote. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ProviderDirectoryEntry } from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { ModelRow } from '../image-input.ts'

/** The settings namespace every pi-ai provider card addresses. */
const NS = 'llm-pi-ai'

/** What one load answers for a provider card. */
export interface ImageInputView {
  /** Whether the deployment accepts settings writes at all. */
  writable: boolean
  /** Revision fence the next save must carry. */
  revision: number
  /** The rows to show: the user layer's when it owns the list, else the effective ones. */
  models: readonly ModelRow[]
  /** Whether the shown rows already live in the user layer. */
  fromUser: boolean
}

/** What one save answered. */
export type ImageInputSaveOutcome =
  | { readonly kind: 'written'; readonly revision: number }
  | { readonly kind: 'conflict'; readonly message: string }
  | { readonly kind: 'refused'; readonly message: string }

/** Read one plain-object path; anything off-path answers undefined. */
function at(source: unknown, path: readonly string[]): unknown {
  let current: unknown = source
  for (const key of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/** Coerce a stored models value into open row records. */
function rows(value: unknown): ModelRow[] {
  return Array.isArray(value)
    ? value.map(entry =>
      typeof entry === 'object' && entry !== null && !Array.isArray(entry) ? entry as ModelRow : {})
    : []
}

/** Joins the settings Remote's document view and fenced writes for one card. */
export class ImageInputController {
  /**
   * @param ctx - the plugin's client context, which declares `remote.settings`
   * in its own `inject`.
   */
  constructor(private readonly ctx: ClientContext) {}

  /**
   * Read one provider's model rows and the revision fence for writing them.
   * @param entry - the card's directory row (its settings address names the profile).
   * @returns the view, or undefined when the settings face or namespace is unavailable.
   */
  async load(entry: ProviderDirectoryEntry): Promise<ImageInputView | undefined> {
    const response = await this.ctx.remote.settings.describe()
    if (!response.ok) return undefined
    const namespace = response.value.namespaces.find(view => view.ns === NS)
    if (namespace === undefined) return undefined
    const path = [...entry.settingsPath, 'models']
    const userModel = at(namespace.user, path)
    const fromUser = Array.isArray(userModel)
    return {
      writable: response.value.writable,
      revision: namespace.revision,
      models: rows(fromUser ? userModel : at(namespace.value, path)),
      fromUser,
    }
  }

  /**
   * Write the rows back as the profile's whole `models` array, under the fence
   * the load answered. The array is replaced by value — the adapter's own
   * semantics — so untouched rows ride along exactly as stored.
   * @param entry - the card's directory row.
   * @param models - the edited rows.
   * @param revision - the fence from the load this draft was opened at.
   * @returns the write outcome the card renders from.
   */
  async save(
    entry: ProviderDirectoryEntry,
    models: readonly ModelRow[],
    revision: number,
  ): Promise<ImageInputSaveOutcome> {
    // The rows came out of a stored JSON document and the edit only ever sets
    // string arrays, so the array is JSON by construction.
    const value = models as unknown as JsonValue
    const ops: SettingsPathOpView[] = [{ op: 'set', path: [...entry.settingsPath, 'models'], value }]
    const response = await this.ctx.remote.settings.mutate(NS, ops, revision)
    if (response.ok) return { kind: 'written', revision: response.value.revision }
    const { code, message } = response.error
    return code === 'settings/conflict' ? { kind: 'conflict', message } : { kind: 'refused', message }
  }
}
