import { markClass } from '../marks'
import { ID, type Decoration, type Kind, type Rules } from './shared'

/**
 * The reader's rules as a stylesheet for one pane — see
 * `ref/spec/semantic-reading.md`. Generated rather than written into
 * `index.css` because the values come from a file that does not exist until
 * the reader writes it; the selectors are ours either way, built through the
 * same `markClass` the pane writes onto the span.
 */

/**
 * One kind's declarations. `text-decoration` is written in longhand parts so a
 * rule that sets only a colour still leaves the line the shorthand would have
 * reset.
 */
function declarations(d: Decoration): string {
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
 * Every kind the reader asked for something on. A kind they asked nothing of
 * produces no rule at all rather than an empty one.
 *
 * Every value in here has already been validated against an enum or a colour
 * pattern by `main/config.ts`: what the reader wrote is untrusted, and this is
 * downstream of the place that checks it.
 */
export function marksCss(rules: Rules): string {
  const kinds = Object.keys(rules) as Kind[]
  return kinds
    .map((kind) => ({ kind, css: declarations(rules[kind]) }))
    .filter(({ css }) => css !== '')
    .map(({ kind, css }) => `.md-body .${markClass(ID, kind)} { ${css} }`)
    .join('\n')
}
