/**
 * One pi-ai provider card's image-input fold: the per-model modality claim the
 * Models page's own form does not carry. The fold loads the provider's stored
 * rows when first opened, edits them locally, and writes the whole `models`
 * array back under the revision fence the load answered — the same array
 * semantics the page's own cards use. A stored change elsewhere on the page (a
 * model added or removed in the catalog above) reaches the fold through the
 * pushed settings invalidation, so the list it shows never waits for the
 * section to remount.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
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
  /** Listen for stored changes in the provider namespace; receives its new revision. */
  subscribeChanges(listener: (revision: number) => void): () => void
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
  const { provider, configured, t, loadModels, saveModels, subscribeChanges } = props
  const [status, setStatus] = useState<Status>('idle')
  const [view, setView] = useState<ImageInputView | undefined>(undefined)
  const [rows, setRows] = useState<readonly ModelRow[]>([])
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)
  // Whether the stored section moved past what this fold shows. A change that
  // cannot be adopted yet — the fold is closed, it holds an unsaved draft, or
  // a newer commit outran the read in flight — parks here until a safe moment
  // takes it.
  const [stale, setStale] = useState(false)

  /** Latest read wins: an older response never overwrites a newer one. */
  const generation = useRef(0)
  /**
   * The newest revision this fold holds adopted data for. An announcement at
   * or below it is old news — the card's own committed write's echo included.
   */
  const seen = useRef(0)
  /**
   * The newest revision the namespace has announced. A completed read or
   * write compares against it to tell whether a commit outran it mid-flight.
   */
  const noticed = useRef(0)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)

  const dirty = view !== undefined && JSON.stringify(rows) !== JSON.stringify(view.models)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  useEffect(() => {
    savingRef.current = status === 'saving'
  }, [status])

  /**
   * Re-read the provider's rows.
   * @param silent - keep the rendered list and copy in place while reading, for
   * a background refresh the user never asked for.
   */
  const reload = useCallback(async (silent: boolean): Promise<void> => {
    const ticket = ++generation.current
    if (!silent) {
      setStatus('loading')
      setFailure(undefined)
      setSaved(false)
    }
    const loaded = await loadModels(provider)
    if (ticket !== generation.current) return
    if (silent && (dirtyRef.current || savingRef.current)) {
      setStale(true)
      return
    }
    if (loaded === undefined) {
      // A background read that found nothing keeps the last good list and
      // retries at the fold's next open; only an asked-for read may fail visibly.
      if (silent) {
        setStale(true)
        return
      }
      setView(undefined)
      setFailure(t('loadFailed'))
      setStatus('ready')
      return
    }
    seen.current = loaded.revision
    setView(loaded)
    setRows(loaded.models.map(row => ({ ...row })))
    setFailure(undefined)
    // A commit that outran this read mid-flight keeps the notice parked; the
    // adoption effect sees the fresh view and reads again until level.
    setStale(loaded.revision < noticed.current)
    setStatus('ready')
  }, [loadModels, provider, t])

  // The page writes the same namespace this fold reads, so every pushed
  // invalidation is the fold's notice that its list moved underneath it.
  useEffect(() => {
    if (configured !== true) return undefined
    return subscribeChanges((revision) => {
      if (revision > noticed.current) noticed.current = revision
      // Data already in hand covers this revision: the card's own write's
      // echo, or a notice whose commit the last adopted read already caught.
      if (revision <= seen.current) return
      setStale(true)
    })
  }, [configured, subscribeChanges])

  // An open fold with nothing at stake adopts the change immediately; one that
  // is closed or holds a draft waits for the toggle handler or the fence. The
  // view dep re-runs the check after every completed read, so a read a newer
  // commit outran is followed by another until the fold is level.
  useEffect(() => {
    if (stale && open && status === 'ready' && !dirty) void reload(true)
  }, [stale, open, status, dirty, view, reload])

  // A dormant directory row has no profile to read models from; the create
  // card dispatches this seat only after the provider is saved anyway.
  if (configured !== true) return null

  const choose = (index: number, choice: ImageInputChoice): void => {
    setRows(current => current.map((row, at) => at === index ? withImageInput(row, choice) : row))
  }

  const submit = async (): Promise<void> => {
    if (view === undefined) return
    setStatus('saving')
    const outcome = await saveModels(provider, rows, view.revision)
    if (outcome.kind === 'written') {
      // The fold now holds data for the committed revision, so its own echo
      // is old news; a notice that raced the write stays parked for the
      // adoption effect, which the just-settled draft unlocks.
      seen.current = outcome.revision
      setView({ ...view, revision: outcome.revision, models: rows.map(row => ({ ...row })), fromUser: true })
      setSaved(true)
      setFailure(undefined)
      setStale(noticed.current > outcome.revision)
      setStatus('ready')
      return
    }
    setFailure(outcome.kind === 'conflict' ? t('conflict') : outcome.message)
    if (outcome.kind === 'conflict') await reload(false)
    else setStatus('ready')
  }

  return (
    <details
      className={css['fold']}
      onToggle={(event) => {
        const opened = event.currentTarget.open
        setOpen(opened)
        // First open reads; a clean reopen adopts whatever the parked notice
        // held. A reopen over an unsaved draft keeps it: the notice stays
        // parked until the draft settles — saved into a fence conflict, or
        // reverted into a silent re-read.
        if (opened && (status === 'idle' || (stale && !dirty))) void reload(false)
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
                <Button variant="ghost" size="sm" onClick={() => { void reload(false) }}>{t('retry')}</Button>
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
                      <Button variant="ghost" size="sm" disabled={status === 'saving'} onClick={() => { void reload(false) }}>
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
