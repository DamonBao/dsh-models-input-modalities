/** Browser editors for model capabilities on Models cards and the plugin page. */

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
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { ModelCapabilitiesPage } from './ModelCapabilitiesPage.tsx'
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
export const inject = ['slots', 'locale', 'remote', 'remote.settings', 'remote.llm']

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
    subscribeChanges: (listener, namespace) => controller.subscribe(listener, namespace),
  }
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config', key: PKG, locale: NS,
    inject: () => ({
      ...face,
      loadProviders: async () => {
        const [result, registered, settings] = await Promise.all([
          ctx.remote.llm.listConfigurableProviders(), ctx.remote.llm.listProviders(), ctx.remote.settings.describe(),
        ])
        if (!result.ok) throw new Error(result.error.message)
        if (!registered.ok) throw new Error(registered.error.message)
        if (!settings.ok) throw new Error(settings.error.message)
        const active = new Set(registered.value.map(row => row.id))
        const configured = new Map(settings.value.namespaces.map(namespace => {
          const value = namespace.value
          const providers = value !== null && typeof value === 'object' && !Array.isArray(value) ? value.providers : undefined
          const keys = providers !== null && typeof providers === 'object' && !Array.isArray(providers) ? Object.keys(providers) : []
          return [namespace.ns, new Set(keys)]
        }))
        return result.value.filter(row => active.has(row.provider) && row.settingsPath[0] === 'providers'
          && configured.get(row.settingsNs)?.has(row.provider)).map(row => ({ ...row, active: true }))
      },
    }),
  }, ModelCapabilitiesPage))
  ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register({
    name: 'settings.models.provider-card',
    key: 'llm-pi-ai',
    locale: NS,
    inject: () => face,
  }, ModelCapabilityCard))
}
