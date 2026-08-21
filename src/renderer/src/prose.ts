import type { ProseDecoration, ProseKind, ProseRules, ProseSpan } from '../../shared/types'

/**
 * The renderer's half of the reading marks — see `ref/spec/prose.md`. Pure
 * string work, and tested, because both halves are the quiet kind of wrong: a
 * broken escape does not throw, it renders the author's text as markup, and a
 * decoration that escapes its rule leaks into the rest of the stylesheet.
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
 * Worth sending to an analyser. A segment of one character, or one with no
 * letters in it at all, cannot hold a proper noun — and a document is mostly
 * made of those, so they would dominate the request without ever earning a
 * mark.
 */
export function worthAnalysing(text: string): boolean {
  return text.length >= 2 && /\p{L}/u.test(text)
}

/**
 * One text token, marked. Spans are half-open, non-overlapping and ascending —
 * which the analysers guarantee — and anything that is not is dropped rather
 * than emitted, because a span running backwards or past the end would produce
 * markup that swallows the rest of the document.
 */
export function decorateSegment(text: string, spans: readonly ProseSpan[]): string {
  let out = ''
  let at = 0
  for (const span of spans) {
    const start = Math.trunc(span.start)
    const end = Math.trunc(span.end)
    if (!(start >= at && end > start && end <= text.length)) continue
    out += escapeHtml(text.slice(at, start))
    out += `<span class="prose-mark prose-${span.kind}">${escapeHtml(text.slice(start, end))}</span>`
    at = end
  }
  return out + escapeHtml(text.slice(at))
}

/**
 * One kind's declarations. `text-decoration` is written in longhand parts so a
 * rule that sets only a colour still leaves the line the shorthand would have
 * reset.
 */
function declarations(d: ProseDecoration): string {
  const out: string[] = []
  if (d.underline !== 'none') {
    out.push('text-decoration-line: underline')
    out.push(`text-decoration-style: ${d.underline}`)
    // Under the text rather than through the descenders, and thin enough to
    // read as a mark rather than as a correction.
    out.push('text-underline-offset: 0.18em')
    out.push('text-decoration-thickness: 1px')
    if (d.underlineColor) out.push(`text-decoration-color: ${d.underlineColor}`)
  }
  if (d.color) out.push(`color: ${d.color}`)
  if (d.background) out.push(`background: ${d.background}`)
  if (d.bold) out.push('font-weight: 600')
  if (d.italic) out.push('font-style: italic')
  return out.join('; ')
}

/**
 * The reader's rules as a stylesheet for one pane. It is generated rather than
 * written into `index.css` because the values come from a file that does not
 * exist until the reader writes it — but the selectors are ours: the kind in
 * `prose-<kind>` comes from our own union, never from the file, and every
 * value in it has already been validated against an enum or a colour pattern
 * in the main process.
 */
export function proseCss(rules: ProseRules): string {
  const kinds = Object.keys(rules) as ProseKind[]
  return kinds
    .map((kind) => ({ kind, css: declarations(rules[kind]) }))
    .filter(({ css }) => css !== '')
    .map(({ kind, css }) => `.md-body .prose-${kind} { ${css} }`)
    .join('\n')
}
