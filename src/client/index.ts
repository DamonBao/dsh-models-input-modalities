/**
 * Browser half: the per-model capability fold inside every llm-pi-ai provider
 * card of the Models settings page — the input modalities and the reasoning
 * levels a model offers, the two per-model claims the page's own forms
 * deliberately leave to `settings.yaml`. The Host half is empty; provider
 * routes are created and edited through the page's own forms.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.slots service merge (SlotRegistry).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the ctx.locale merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.remote merge (the settings describe/mutate face).
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the 'settings.models.provider-card' SlotMap entry and the
// ProviderDirectoryEntry owner data.
import type {} from '@deepseek-ai/dsh-client-ui-settings-models/client'
import { ModelCapabilityController } from './controller.ts'
import { ModelCapabilityCard } from './ModelCapabilityCard.tsx'
import type { ModelCapabilityFace } from './ModelCapabilityCard.tsx'
import { en, zh } from './locales.ts'
import type { ModelCapabilityKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Per-model capability copy on the Models page. */
    'settings.models.modelCapabilities': ModelCapabilityKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.models.modelCapabilities'

/** The effect label prefix. */
const PKG = '@jcy2387/dsh-models-input-modalities'

/** Required browser services. */
export const inject = ['slots', 'locale', 'remote', 'remote.settings']

/**
 * Register the model-capability fold on every llm-pi-ai provider card once the
 * Models section has declared the seat.
 * @param ctx - the plugin's client context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), `${PKG}: dictionaries`)
  const controller = new ModelCapabilityController(ctx)
  ctx.effect(() => controller.watch(), `${PKG}: settings invalidations`)
  const face: ModelCapabilityFace = {
    loadModels: entry => controller.load(entry),
    saveModels: (entry, models, revision) => controller.save(entry, models, revision),
    subscribeChanges: listener => controller.subscribe(listener),
  }
  ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register({
    name: 'settings.models.provider-card',
    key: 'llm-pi-ai',
    locale: NS,
    inject: () => face,
  }, ModelCapabilityCard))
}
