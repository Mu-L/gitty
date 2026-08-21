import { PLUGIN_NAME, type Mark } from './types'

/**
 * Placing the marks a plugin asked for — see the `marks` extension point in
 * `ref/spec/plugins.md`. Pure string work, and tested, because it is the quiet
 * kind of wrong: a broken escape does not throw, it renders the author's text
 * as markup.
 */

/** markdown-it's own escaping, kept here so this module imports nothing. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * The class one mark carries. The pane writes it onto the span and the plugin
 * writes its stylesheet through the same function, so the two cannot drift.
 * Anything outside `[a-z0-9-]` is refused rather than escaped: both halves are
 * written by a plugin in this repository, so a bad one is a bug to fix and not
 * input to sanitise.
 */
export function markClass(pluginId: string, className: string): string {
  if (!PLUGIN_NAME.test(pluginId) || !PLUGIN_NAME.test(className)) {
    throw new Error(`plugin mark class must match ${PLUGIN_NAME}: ${pluginId}/${className}`)
  }
  return `pl-${pluginId}-${className}`
}

/** One plugin's answer for one segment, kept with whose answer it was. */
export interface PluginMarks {
  pluginId: string
  marks: readonly Mark[]
}

/** A mark once it knows its class — what `decorateSegment` places. */
export interface PlacedMark {
  start: number
  end: number
  className: string
}

/**
 * Every plugin's marks for one segment, in an order the renderer can place:
 * ascending, and never overlapping. Registry order decides a collision — two
 * plugins marking the same words is something the document cannot render, and
 * deciding it by order at least makes it the same decision every time.
 */
export function mergeMarks(answers: readonly PluginMarks[]): PlacedMark[] {
  const placed: PlacedMark[] = []
  for (const { pluginId, marks } of answers) {
    for (const m of marks) {
      const start = Math.trunc(m.start)
      const end = Math.trunc(m.end)
      if (!(end > start && start >= 0)) continue
      if (placed.some((p) => start < p.end && p.start < end)) continue
      placed.push({ start, end, className: markClass(pluginId, m.className) })
    }
  }
  return placed.sort((a, b) => a.start - b.start)
}

/**
 * One text token with its marks placed, escaped. Marks are expected ascending
 * and non-overlapping — which `mergeMarks` guarantees — and anything that is
 * not is dropped rather than emitted, because a span running backwards or past
 * the end would produce markup that swallows the rest of the document.
 */
export function decorateSegment(text: string, marks: readonly PlacedMark[]): string {
  let out = ''
  let at = 0
  for (const mark of marks) {
    const { start, end } = mark
    if (!(start >= at && end > start && end <= text.length)) continue
    out += escapeHtml(text.slice(at, start))
    out += `<span class="pl-mark ${mark.className}">${escapeHtml(text.slice(start, end))}</span>`
    at = end
  }
  return out + escapeHtml(text.slice(at))
}
