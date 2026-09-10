/**
 * Pure row helpers for the per-model reasoning-effort claim.
 *
 * The adapter's field is `reasoningEfforts`, and it says which thinking levels a
 * model *offers* — the levels the composer's model picker lists — not which one
 * a request uses. Absent keeps the installed catalog's capability (a
 * hand-declared model has none, so its picker offers no level at all); `false`
 * declares a non-reasoning model; a dict declares the offered levels and, per
 * level, the spelling dispatch sends on the wire.
 */

import type { ModelRow } from './model-row.ts'

/** Every level a row may declare, in escalation order — the adapter's own key set. */
export const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const

/** One level a row may declare. */
export type ThinkingLevel = (typeof THINKING_LEVELS)[number]

/** The three reasoning states a row's select offers. */
export type ReasoningChoice = 'inherit' | 'none' | 'custom'

/** One level's editor state. */
export interface ReasoningLevelDraft {
  /** Whether the row declares the level, i.e. whether selectors offer it. */
  readonly offered: boolean
  /**
   * The wire spelling dispatch sends for the level. Only `off` may leave it
   * empty — "supported, send nothing" — because for most providers not thinking
   * is the parameter's absence; every other declared level needs a value.
   */
  readonly wire: string
}

/** The editor's level rows, one per {@link THINKING_LEVELS} entry. */
export type ReasoningLevels = Readonly<Record<ThinkingLevel, ReasoningLevelDraft>>

/** Why a row's declared levels cannot be saved; the adapter's own two rules. */
export type ReasoningFailure = 'needsLevel' | 'needsWire'

/**
 * The spelling a newly offered level starts from: its own name, except for
 * `off`, whose absence is the spelling most providers read as "do not think".
 * @param level - the level being offered.
 * @returns its default wire spelling.
 */
function defaultWire(level: ThinkingLevel): string {
  return level === 'off' ? '' : level
}

/**
 * A level set offering exactly `offered`, each at its default spelling.
 * @param offered - the levels to declare.
 * @returns the seven level drafts.
 */
function declaring(offered: readonly ThinkingLevel[]): ReasoningLevels {
  const drafts = {} as Record<ThinkingLevel, ReasoningLevelDraft>
  for (const level of THINKING_LEVELS) {
    const on = offered.includes(level)
    drafts[level] = { offered: on, wire: on ? defaultWire(level) : '' }
  }
  return drafts
}

/**
 * The levels a row with no dict of its own starts from when it is switched to a
 * declared set: `off` plus the three efforts an OpenAI-compatible gateway is
 * most likely to serve, each spelled as its own name.
 */
export const DEFAULT_LEVELS: ReasoningLevels = declaring(['off', 'low', 'medium', 'high'])

/**
 * The choice a row's stored `reasoningEfforts` displays. Anything that is not
 * `false` and not a plain object states no claim this card understands, and
 * reads as the inheritance it leaves in place; an empty object reads as a
 * declared set offering nothing, which the validator then names.
 * @param row - one stored model row.
 * @returns the choice the row's select shows.
 */
export function reasoningChoice(row: ModelRow): ReasoningChoice {
  const value = row['reasoningEfforts']
  if (value === false) return 'none'
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return 'custom'
  return 'inherit'
}

/**
 * The row's declared levels as editor state. A level the dict omits is not
 * offered; one it carries is, with its wire spelling — an empty value, which is
 * what a valueless `off:` stores as, and a value of a type the schema refuses
 * both read as no spelling yet. A row declaring nothing shows the defaults a
 * fresh declaration starts from.
 * @param row - one stored model row.
 * @returns the seven level drafts.
 */
export function reasoningLevels(row: ModelRow): ReasoningLevels {
  const value = row['reasoningEfforts']
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return DEFAULT_LEVELS
  const stored = value as Record<string, unknown>
  const drafts = {} as Record<ThinkingLevel, ReasoningLevelDraft>
  for (const level of THINKING_LEVELS) {
    if (!(level in stored)) {
      drafts[level] = { offered: false, wire: '' }
      continue
    }
    const wire = stored[level]
    drafts[level] = { offered: true, wire: typeof wire === 'string' ? wire : '' }
  }
  return drafts
}

/**
 * The row with one reasoning choice applied: `inherit` removes the field,
 * `none` stores `false`, and `custom` stores exactly the levels offered — in
 * escalation order, a valueless `off` as `null`, spellings trimmed so a stray
 * space cannot reach the wire. Every other field, including ones this card
 * never shows, survives.
 * @param row - the row to patch.
 * @param choice - the selected state.
 * @param levels - the editor's level drafts; read only for `custom`.
 * @returns a new row carrying the choice.
 */
export function withReasoning(row: ModelRow, choice: ReasoningChoice, levels: ReasoningLevels): ModelRow {
  const next = { ...row }
  delete next['reasoningEfforts']
  if (choice === 'none') {
    next['reasoningEfforts'] = false
    return next
  }
  if (choice !== 'custom') return next
  const declared: Record<string, string | null> = {}
  for (const level of THINKING_LEVELS) {
    const draft = levels[level]
    if (!draft.offered) continue
    const wire = draft.wire.trim()
    declared[level] = wire.length === 0 ? null : wire
  }
  next['reasoningEfforts'] = declared
  return next
}

/**
 * The level set with one level offered or withdrawn. Offering a level always
 * starts its spelling from the default, so a tick is never a blank the save
 * then refuses, and what a withdrawn level carried is not what a reticked one
 * silently revives; levels left alone keep theirs.
 * @param levels - the drafts to patch.
 * @param level - the level toggled.
 * @param offered - whether the row should declare it.
 * @returns the patched drafts, or the same object when nothing changes.
 */
export function toggleLevel(levels: ReasoningLevels, level: ThinkingLevel, offered: boolean): ReasoningLevels {
  const current = levels[level]
  if (current.offered === offered) return levels
  return { ...levels, [level]: { offered, wire: offered ? defaultWire(level) : '' } }
}

/**
 * The level set with one level's wire spelling retyped.
 * @param levels - the drafts to patch.
 * @param level - the level whose spelling changed.
 * @param wire - the text the field now carries.
 * @returns the patched drafts.
 */
export function setWire(levels: ReasoningLevels, level: ThinkingLevel, wire: string): ReasoningLevels {
  return { ...levels, [level]: { ...levels[level], wire } }
}

/**
 * Why a row's declared levels would be refused, checked before the write so the
 * card can name the row instead of answering a rejected settings mutation. The
 * rules are the adapter's: every declared level but `off` needs a wire spelling,
 * and a set offering no level beyond `off` declares nothing worth declaring.
 * @param row - one stored model row.
 * @returns the failure, or undefined for a row that can be saved.
 */
export function reasoningFailure(row: ModelRow): ReasoningFailure | undefined {
  if (reasoningChoice(row) !== 'custom') return undefined
  const levels = reasoningLevels(row)
  let thinks = false
  for (const level of THINKING_LEVELS) {
    const draft = levels[level]
    if (!draft.offered || level === 'off') continue
    if (draft.wire.trim().length === 0) return 'needsWire'
    thinks = true
  }
  return thinks ? undefined : 'needsLevel'
}

/**
 * Read a select's submitted value. The DOM hands over a bare string, so an
 * unrecognized one is refused rather than cast into the union.
 * @param value - the submitted option value.
 * @returns the choice, or undefined for anything else.
 */
export function parseReasoningChoice(value: string): ReasoningChoice | undefined {
  return value === 'inherit' || value === 'none' || value === 'custom' ? value : undefined
}
