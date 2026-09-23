import { describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { ModelCapabilityController } from '../src/client/controller.ts'
import type { ProviderDirectoryEntry } from '@deepseek-ai/dsh-client-ui-settings-models/client'

/** One card's directory row, addressed at the pi-ai profile `custom-route`. */
const entry: ProviderDirectoryEntry = {
  provider: 'custom-route',
  displayName: 'Custom Route',
  settingsNs: 'llm-pi-ai',
  settingsPath: ['providers', 'custom-route'],
  active: true,
}

/** The namespace view shape the controller reads, filled with one model list. */
function namespaceView(overrides: Record<string, unknown> = {}) {
  return {
    ns: 'llm-pi-ai',
    schema: {},
    value: { providers: { 'custom-route': { models: [{ id: 'inherited' }] } } },
    applies: 'live',
    secrets: [],
    revision: 3,
    ...overrides,
  }
}

/**
 * A client context carrying only what the controller touches.
 * @param describeResult - the canned `settings/describe` reply.
 * @param mutateResult - the canned `settings/mutate` reply.
 * @returns the stub context and the listener the controller registered.
 */
function stubContext(
  describeResult: unknown = { ok: true, value: { writable: true, namespaces: [namespaceView()] } },
  mutateResult: unknown = { ok: true, value: { revision: 4 } },
) {
  const listeners: Array<(ns: string, revision: number) => void> = []
  const settings = {
    describe: vi.fn(async () => describeResult),
    mutate: vi.fn(async () => mutateResult),
  }
  const ctx = {
    remote: {
      $on: (event: string, listener: (ns: string, revision: number) => void) => {
        expect(event).toBe('settings/document-updated')
        listeners.push(listener)
        return () => {
          listeners.splice(listeners.indexOf(listener), 1)
        }
      },
      settings,
    },
  }
  return { ctx: ctx as unknown as ClientContext, settings, listeners }
}

describe('ModelCapabilityController.watch', () => {
  it('invalidates only cards addressed at the changed loader entry', () => {
    const { ctx, listeners } = stubContext()
    const controller = new ModelCapabilityController(ctx)
    const first = vi.fn()
    const second = vi.fn()
    controller.watch()
    controller.subscribe(first, 'pi-ai-primary')
    controller.subscribe(second, 'pi-ai-secondary')
    listeners[0]?.('pi-ai-secondary', 12)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(12)
  })
  it('fans one pi-ai invalidation out to every subscriber with its revision', () => {
    const { ctx, listeners } = stubContext()
    const controller = new ModelCapabilityController(ctx)
    const first = vi.fn()
    const second = vi.fn()
    controller.watch()
    controller.subscribe(first)
    controller.subscribe(second)

    expect(listeners).toHaveLength(1)
    listeners[0]?.('llm-pi-ai', 7)

    expect(first).toHaveBeenCalledWith(7)
    expect(second).toHaveBeenCalledWith(7)
  })

  it('ignores invalidations of namespaces no card reads', () => {
    const { ctx, listeners } = stubContext()
    const controller = new ModelCapabilityController(ctx)
    const seen = vi.fn()
    controller.watch()
    controller.subscribe(seen)

    listeners[0]?.('llm-deepseek', 8)
    listeners[0]?.('ui-onboarding', 9)

    expect(seen).not.toHaveBeenCalled()
  })

  it('stops delivering to a disposed subscription and survives a disposed watch', () => {
    const { ctx, listeners } = stubContext()
    const controller = new ModelCapabilityController(ctx)
    const kept = vi.fn()
    const dropped = vi.fn()
    const stopWatch = controller.watch()
    controller.subscribe(kept)
    controller.subscribe(dropped)()
    listeners[0]?.('llm-pi-ai', 10)
    expect(kept).toHaveBeenCalledTimes(1)
    expect(dropped).not.toHaveBeenCalled()

    stopWatch()
    expect(listeners).toHaveLength(0)
  })
})

describe('ModelCapabilityController.load', () => {
  it('uses the provider directory namespace when its loader entry was renamed', async () => {
    const { ctx, settings } = stubContext({ ok: true, value: {
      writable: true,
      namespaces: [namespaceView({ ns: 'custom-pi-ai', revision: 18 })],
    } })
    const provider = { ...entry, settingsNs: 'custom-pi-ai' }
    const controller = new ModelCapabilityController(ctx)
    expect(await controller.load(provider)).toMatchObject({ models: [{ id: 'inherited' }], revision: 18 })
    await controller.save(provider, [{ id: 'inherited', input: ['text', 'image'] }], 18)
    expect(settings.mutate).toHaveBeenCalledWith('custom-pi-ai', [
      { op: 'set', path: ['providers', 'custom-route', 'models'], value: [{ id: 'inherited', input: ['text', 'image'] }] },
    ], 18)
  })
  it('prefers the user layer and reports the fence it read at', async () => {
    const { ctx } = stubContext({
      ok: true,
      value: {
        writable: true,
        namespaces: [namespaceView({
          user: { providers: { 'custom-route': { models: [{ id: 'mine', input: ['text', 'image'] }] } } },
          revision: 11,
        })],
      },
    })
    const view = await new ModelCapabilityController(ctx).load(entry)
    expect(view).toEqual({
      writable: true,
      revision: 11,
      models: [{ id: 'mine', input: ['text', 'image'] }],
      fromUser: true,
    })
  })

  it('falls back to the effective list when the user layer owns nothing', async () => {
    const view = await new ModelCapabilityController(stubContext().ctx).load(entry)
    expect(view?.fromUser).toBe(false)
    expect(view?.models).toEqual([{ id: 'inherited' }])
  })

  it('answers undefined when the settings face is unavailable', async () => {
    const { ctx } = stubContext({ ok: false, error: { code: 'remote/unavailable', message: 'down' } })
    expect(await new ModelCapabilityController(ctx).load(entry)).toBeUndefined()
  })
})

describe('ModelCapabilityController.save', () => {
  it('replaces the profile models array under the fence and adopts the new revision', async () => {
    const { ctx, settings } = stubContext()
    const outcome = await new ModelCapabilityController(ctx).save(entry, [{ id: 'mine' }], 3)
    expect(outcome).toEqual({ kind: 'written', revision: 4 })
    expect(settings.mutate).toHaveBeenCalledWith('llm-pi-ai', [
      { op: 'set', path: ['providers', 'custom-route', 'models'], value: [{ id: 'mine' }] },
    ], 3)
  })

  it('names a refused fence as a conflict', async () => {
    const { ctx } = stubContext(undefined, {
      ok: false,
      error: { code: 'settings/conflict', message: 'stale' },
    })
    const outcome = await new ModelCapabilityController(ctx).save(entry, [], 3)
    expect(outcome).toEqual({ kind: 'conflict', message: 'stale' })
  })

  it('names any other refusal as a plain failure', async () => {
    const { ctx } = stubContext(undefined, {
      ok: false,
      error: { code: 'settings/read-only', message: 'read-only' },
    })
    const outcome = await new ModelCapabilityController(ctx).save(entry, [], 3)
    expect(outcome).toEqual({ kind: 'refused', message: 'read-only' })
  })
})
