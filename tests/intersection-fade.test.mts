import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../plugins/intersection-fade.client.js', import.meta.url), 'utf8')

class Element {
  nodeType = 1
  parentElement: Element | null = null
  children: Element[] = []
  queries = 0
  classes: Set<string>
  classList = { add: (name: string) => { this.classes.add(name) } }
  constructor(classes = '', private body = false) { this.classes = new Set(classes.split(' ')) }
  get isConnected(): boolean { return this.body || Boolean(this.parentElement?.isConnected) }
  append(child: Element) { child.parentElement = this; this.children.push(child); return child }
  remove(child: Element) { this.children = this.children.filter(item => item !== child); child.parentElement = null }
  matches() { return this.classes.has('fade-up') && !this.classes.has('in-view') }
  querySelectorAll(): Element[] {
    this.queries++
    const descendants = (root: Element): Element[] => root.children.flatMap(child => [child, ...descendants(child)])
    return descendants(this).filter(child => child.matches())
  }
}

function animation(intersectionSupported = true) {
  const body = new Element('', true)
  const first = body.append(new Element('fade-up'))
  const hooks = new Map<string, () => void>()
  const frames = new Map<number, () => void>()
  const observed = new Set<Element>()
  const unobserved: Element[] = []
  let intersectionCallback: (entries: { target: Element; isIntersecting: boolean }[]) => void
  let mutations: (records: { addedNodes: unknown[] }[]) => void
  let observerOptions: unknown
  let cleanUp: () => void
  let frameId = 0
  let disconnected = 0
  class IntersectionObserver {
    constructor(callback: typeof intersectionCallback) { intersectionCallback = callback }
    observe(element: Element) { observed.add(element) }
    unobserve(element: Element) { observed.delete(element); unobserved.push(element) }
    disconnect() { disconnected++; observed.clear() }
  }
  class MutationObserver {
    constructor(callback: typeof mutations) { mutations = callback }
    observe(_root: Element, options: unknown) { observerOptions = options }
    disconnect() { disconnected++ }
  }
  const plugin = new Function('defineNuxtPlugin', 'window', 'document', 'IntersectionObserver', 'MutationObserver',
    'requestAnimationFrame', 'cancelAnimationFrame', source.replace('export default', 'return'))(
    (plugin: unknown) => plugin, intersectionSupported ? { IntersectionObserver } : {}, { body },
    IntersectionObserver, MutationObserver,
    (callback: () => void) => { frames.set(++frameId, callback); return frameId },
    (id: number) => frames.delete(id),
  )
  plugin({ hook(name: string, callback: () => void) { hooks.set(name, callback) }, vueApp: { onUnmount(callback: () => void) { cleanUp = callback } } })
  hooks.get('app:mounted')!()
  return {
    body, first, observed, unobserved, frames,
    options: () => observerOptions,
    intersect: (target: Element) => intersectionCallback([{ target, isIntersecting: true }]),
    mutate: (addedNodes: unknown[] = []) => mutations([{ addedNodes }]),
    flush() { for (const [id, callback] of frames) { frames.delete(id); callback() } },
    stop: () => cleanUp(), disconnected: () => disconnected,
  }
}

test('fade observation scans inserted subtrees once and skips text and attribute updates', () => {
  const app = animation()
  assert.ok(app.observed.has(app.first))
  assert.deepEqual(app.options(), { childList: true, subtree: true })
  app.intersect(app.first)
  assert.ok(app.first.classes.has('in-view'))
  assert.ok(!app.observed.has(app.first))
  for (let i = 0; i < 100; i++) app.mutate([{ nodeType: 3 }])
  assert.equal(app.frames.size, 0)
  assert.equal(app.body.queries, 1)

  const parent = app.body.append(new Element())
  const child = parent.append(new Element('fade-up'))
  app.mutate([child, parent, child])
  assert.equal(app.frames.size, 1)
  app.flush()
  assert.ok(app.observed.has(child))
  assert.equal(parent.queries, 1)
  assert.equal(child.queries, 0)
  assert.equal(app.body.queries, 1)
  app.stop()
})

test('detached fade elements and pending frames are released on removal and app teardown', () => {
  const app = animation()
  app.body.remove(app.first)
  app.mutate()
  assert.ok(app.unobserved.includes(app.first))
  const pending = app.body.append(new Element('fade-up'))
  app.mutate([pending])
  app.body.remove(pending)
  app.flush()
  assert.ok(!app.observed.has(pending))
  app.mutate([app.body.append(new Element('fade-up'))])
  app.stop()
  assert.equal(app.frames.size, 0)
  assert.equal(app.disconnected(), 2)
})

test('content stays visible when IntersectionObserver is unavailable', () => {
  const app = animation(false)
  assert.ok(app.first.classes.has('in-view'))
  const inserted = app.body.append(new Element('fade-up'))
  app.mutate([inserted])
  app.flush()
  assert.ok(inserted.classes.has('in-view'))
  app.stop()
})
