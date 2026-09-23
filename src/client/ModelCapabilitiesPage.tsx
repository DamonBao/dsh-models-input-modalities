/** Model capability editor on this bundle's Plugins page. */
import { useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProviderDirectoryEntry } from '@deepseek-ai/dsh-client-ui-settings-models/client'
import { ModelCapabilityCard, type ModelCapabilityFace } from './ModelCapabilityCard.tsx'

interface PageFace extends ModelCapabilityFace {
  loadProviders(): Promise<ProviderDirectoryEntry[]>
}
type Props = PropsRuntime<'plugins.bundle.config'> & PropsLocale<'settings.models.modelCapabilities'> & InjectFace<PageFace>

/** Reuse the same revision-fenced editor offered on each Models card. */
export function ModelCapabilitiesPage(props: Props) {
  const [providers, setProviders] = useState<ProviderDirectoryEntry[]>()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setFailed(false)
    void props.loadProviders().then(rows => {
      if (active) setProviders(rows)
    }, () => { if (active) setFailed(true) })
    return () => { active = false }
  }, [props.loadProviders, attempt])
  if (failed) return <div role="alert">{props.t('loadFailed')} <Button onClick={() => setAttempt(value => value + 1)}>{props.t('retry')}</Button></div>
  if (providers === undefined) return <p role="status">{props.t('loading')}</p>
  if (!providers.length) return <p>{props.t('noProviders')}</p>
  return <div>{providers.map(provider => <section key={`${provider.settingsNs}/${provider.provider}`}>
    <h3>{provider.displayName}</h3>
    <ModelCapabilityCard {...props} provider={provider} configured={true} keyConfigured={false} />
  </section>)}</div>
}
