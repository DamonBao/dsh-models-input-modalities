/** Import legacy model configuration into this profile; editing stays in the browser. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-config-editor'
import { importLegacySettings } from './legacy-settings.ts'

/**
 * Restore the pi-ai provider section, including model capabilities and key references.
 * An ambiguous renamed deployment keeps its source file for manual assignment.
 * @param ctx - Host context with the profile configuration services.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings', 'profileContext', 'configEditor'], child => {
    let disposed = false
    child.effect(() => () => { disposed = true })
    void child.root.loader.await().then(() => {
      if (disposed) return
      const entries = child.configEditor.entries().filter(entry => entry.options.name === '@deepseek-ai/dsh-llm-pi-ai')
      const owner = entries.find(entry => entry.options.id === 'llm-pi-ai') ?? (entries.length === 1 ? entries[0] : undefined)
      if (owner !== undefined) importLegacySettings(child, 'llm-pi-ai', owner.options.id)
      else if (entries.length > 1) child.logger.warn('Legacy model settings were not imported: select the intended pi-ai entry in the profile patch')
    }).catch(() => { child.logger.warn('Legacy model settings import could not start; it will retry on restart') })
  })
}
