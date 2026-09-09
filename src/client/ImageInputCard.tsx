/**
 * One pi-ai provider card's image-input fold: the per-model modality claim the
 * Models page's own form does not carry. The fold loads the provider's stored
 * rows when first opened, edits them locally, and writes the whole `models`
 * array back under the revision fence the load answered — the same array
 * semantics the page's own cards use.
 */

import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ProviderDirectoryEntry } from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type { ImageInputSaveOutcome, ImageInputView } from './controller.ts'
import { imageInputChoice, parseImageInputChoice, rowId, withImageInput } from '../image-input.ts'
import type { ImageInputChoice, ModelRow } from '../image-input.ts'
import css from './styles.module.css'

/** The registration-side face this card receives. */
export interface ImageInputFace {
  /** Read the provider's rows and revision fence; undefined when the settings face is unavailable. */
  loadModels(entry: ProviderDirectoryEntry): Promise<ImageInputView | undefined>
  /** Write the rows back under the fence the load answered. */
  saveModels(
    entry: ProviderDirectoryEntry,
    models: readonly ModelRow[],
    revision: number,
  ): Promise<ImageInputSaveOutcome>
}

/** Props the provider-card slot binds. */
export type ImageInputCardProps =
  PropsRuntime<'settings.models.provider-card'>
  & PropsLocale<'settings.models.imageInput'>
  & InjectFace<ImageInputFace>

/** Lifecycle of one fold: closed, loading, editable, or writing. */
type Status = 'idle' | 'loading' | 'ready' | 'saving'

/**
 * Render the image-input fold of one provider card.
 * @param props - the card's directory row plus the bound face and copy.
 * @returns the fold, or nothing while the provider is still a dormant row.
 */
export function ImageInputCard(props: ImageInputCardProps): ReactNode {
  const { provider, configured, t, loadModels, saveModels } = props
  const [status, setStatus] = useState<Status>('idle')
  const [view, setView] = useState<ImageInputView | undefined>(undefined)
  const [rows, setRows] = useState<readonly ModelRow[]>([])
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [saved, setSaved] = useState(false)

  const reload = useCallback(async (): Promise<void> => {
    setStatus('loading')
    setFailure(undefined)
    setSaved(false)
    const loaded = await loadModels(provider)
    if (loaded === undefined) {
      setView(undefined)
      setFailure(t('loadFailed'))
      setStatus('ready')
      return
    }
    setView(loaded)
    setRows(loaded.models.map(row => ({ ...row })))
    setStatus('ready')
  }, [loadModels, provider, t])

  // A dormant directory row has no profile to read models from; the create
  // card dispatches this seat only after the provider is saved anyway.
  if (configured !== true) return null

  const dirty = view !== undefined && JSON.stringify(rows) !== JSON.stringify(view.models)

  const choose = (index: number, choice: ImageInputChoice): void => {
    setRows(current => current.map((row, at) => at === index ? withImageInput(row, choice) : row))
  }

  const submit = async (): Promise<void> => {
    if (view === undefined) return
    setStatus('saving')
    const outcome = await saveModels(provider, rows, view.revision)
    if (outcome.kind === 'written') {
      setView({ ...view, revision: outcome.revision, models: rows.map(row => ({ ...row })), fromUser: true })
      setSaved(true)
      setStatus('ready')
      return
    }
    setFailure(outcome.kind === 'conflict' ? t('conflict') : outcome.message)
    if (outcome.kind === 'conflict') await reload()
    else setStatus('ready')
  }

  return (
    <details
      className={css['fold']}
      onToggle={(event) => {
        // Load on first open only: a reopened fold keeps the loaded (possibly
        // just-saved) view, and every write is revision-fenced regardless.
        if (event.currentTarget.open && status === 'idle') void reload()
      }}
    >
      <summary className={css['summary']}>{t('title')}</summary>
      <div className={css['body']}>
        {status === 'loading' ? <p className={css['status']}>{t('loading')}</p> : null}
        {status !== 'loading' && view === undefined
          ? (
            <>
              <p className={css['error']}>{failure ?? t('loadFailed')}</p>
              <div className={css['footer']}>
                <Button variant="ghost" size="sm" onClick={() => { void reload() }}>{t('retry')}</Button>
              </div>
            </>
          )
          : null}
        {status !== 'loading' && view !== undefined
          ? (view.models.length === 0
            ? <p className={css['hint']}>{t('empty')}</p>
            : (
              <>
                {view.fromUser ? null : <p className={css['hint']}>{t('inheritsHint')}</p>}
                {rows.map((row, index) => (
                  <label key={index} className={css['row']}>
                    <span className={css['rowId']}>{rowId(row, index)}</span>
                    <select
                      className={css['select']}
                      value={imageInputChoice(row)}
                      aria-label={`${t('title')} ${rowId(row, index)}`}
                      disabled={!view.writable || status === 'saving'}
                      onChange={(event) => {
                        const next = parseImageInputChoice(event.target.value)
                        if (next !== undefined) choose(index, next)
                      }}
                    >
                      <option value="inherit">{t('choiceDefault')}</option>
                      <option value="text">{t('choiceText')}</option>
                      <option value="image">{t('choiceImage')}</option>
                    </select>
                  </label>
                ))}
                {failure !== undefined ? <p className={css['error']}>{failure}</p> : null}
                <div className={css['footer']}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!view.writable || status === 'saving' || !dirty}
                    onClick={() => { void submit() }}
                  >
                    {status === 'saving' ? t('saving') : t('save')}
                  </Button>
                  {failure !== undefined
                    ? (
                      <Button variant="ghost" size="sm" disabled={status === 'saving'} onClick={() => { void reload() }}>
                        {t('retry')}
                      </Button>
                    )
                    : null}
                  {saved ? <p className={css['status']}>{t('saved')}</p> : null}
                  {view.writable ? null : <p className={css['hint']}>{t('readOnly')}</p>}
                </div>
              </>
            ))
          : null}
      </div>
    </details>
  )
}
