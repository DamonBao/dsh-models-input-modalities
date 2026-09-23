/** Settings reads and writes for the model-capability card, over the settings Remote. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ProviderDirectoryEntry } from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { ModelRow } from '../model-row.ts'

/** Default entry id for callers without a provider directory row. */
const NS = 'llm-pi-ai'

/** What one load answers for a provider card. */
export interface ModelCapabilityView {
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
export type ModelCapabilitySaveOutcome =
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
export class ModelCapabilityController {
  /** The cards waiting to hear that this namespace's stored section changed. */
  private readonly listeners = new Map<(revision: number) => void, string>()

  /**
   * @param ctx - the plugin's client context, which declares `remote.settings`
   * in its own `inject`.
   */
  constructor(private readonly ctx: ClientContext) {}

  /**
   * Start forwarding this namespace's pushed document invalidations to the
   * cards. The Host emits one per committed write — including the Models page's
   * own model-list edits — so a card never has to poll or wait for a remount.
   * @returns the disposer that withdraws the Remote subscription.
   */
  watch(): () => void {
    return this.ctx.remote.$on('settings/document-updated', (ns, revision) => {
      for (const [listener, namespace] of [...this.listeners]) {
        if (String(ns) === namespace) listener(revision)
      }
    })
  }

  /**
   * Subscribe one card to namespace invalidations.
   * @param listener - called with the namespace's new revision on each change.
   * @param namespace - actual provider entry id from the directory.
   * @returns the disposer for this one subscription.
   */
  subscribe(listener: (revision: number) => void, namespace = NS): () => void {
    this.listeners.set(listener, namespace)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Read one provider's model rows and the revision fence for writing them.
   * @param entry - the card's directory row (its settings address names the profile).
   * @returns the view, or undefined when the settings face or namespace is unavailable.
   */
  async load(entry: ProviderDirectoryEntry): Promise<ModelCapabilityView | undefined> {
    const response = await this.ctx.remote.settings.describe()
    if (!response.ok) return undefined
    const namespace = response.value.namespaces.find(view => view.ns === entry.settingsNs)
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
  ): Promise<ModelCapabilitySaveOutcome> {
    // The rows came out of a stored JSON document and the edits only ever set
    // string arrays, `false`, and dicts of strings and nulls, so the array is
    // JSON by construction.
    const value = models as unknown as JsonValue
    const ops: SettingsPathOpView[] = [{ op: 'set', path: [...entry.settingsPath, 'models'], value }]
    const response = await this.ctx.remote.settings.mutate(entry.settingsNs, ops, revision)
    if (response.ok) return { kind: 'written', revision: response.value.revision }
    const { code, message } = response.error
    return code === 'settings/conflict' ? { kind: 'conflict', message } : { kind: 'refused', message }
  }
}
