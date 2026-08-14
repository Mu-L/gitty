/**
 * Which monospace fonts this machine actually has.
 *
 * There is no API that lists them: `queryLocalFonts` needs a permission prompt
 * and is not in Electron's default build, so the only portable answer is to
 * name the fonts worth offering and measure which ones the browser resolves.
 */

/** Fonts common enough to be worth probing for, best first. */
const CANDIDATES = [
  'JetBrains Mono',
  'Fira Code',
  'Cascadia Code',
  'Cascadia Mono',
  'SF Mono',
  'Menlo',
  'Monaco',
  'Consolas',
  'DejaVu Sans Mono',
  'Liberation Mono',
  'Ubuntu Mono',
  'Noto Sans Mono',
  'Source Code Pro',
  'IBM Plex Mono',
  'Hack',
  'Inconsolata',
  'Roboto Mono',
  'Courier New'
]

/** Wide enough that a substituted font measures differently. */
const PROBE = 'mmmmmmmmmmlli0O'

/**
 * A font is installed when text set in it measures differently from the same
 * text in a generic family — a font that is missing falls back to that generic
 * and matches it exactly. Two generics are tried because a real font can
 * happen to match one of them.
 */
function installed(ctx: CanvasRenderingContext2D, name: string): boolean {
  const width = (family: string): number => {
    ctx.font = `72px ${family}`
    return ctx.measureText(PROBE).width
  }
  return (
    width(`"${name}", monospace`) !== width('monospace') ||
    width(`"${name}", serif`) !== width('serif')
  )
}

let found: string[] | null = null

/** The installed candidates, measured once — fonts do not come and go. */
export function monoFonts(): string[] {
  if (found) return found
  const ctx = document.createElement('canvas').getContext('2d')
  found = ctx ? CANDIDATES.filter((f) => installed(ctx, f)) : []
  return found
}
