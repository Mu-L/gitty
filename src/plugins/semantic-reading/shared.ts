/**
 * What both halves of the semantic-reading plugin agree on — see
 * `ref/spec/semantic-reading.md`. This is also where the two ends of
 * `plugin:invoke` agree what a method is called and what it answers with:
 * across that channel the types are this file, not the compiler's.
 */

export const ID = 'semantic-reading'

/** The methods the main half answers. */
export const METHOD = {
  /** (analyzer, segments) → one Span[] per segment. */
  analyse: 'analyse',
  /** () → the reader's rules, with every kind filled in. */
  rules: 'rules',
  /** () → where the reader's two files are; asking also creates them. */
  configPaths: 'configPaths'
} as const

/** Which analyser finds the spans: local segmentation, or a configured model. */
export type Analyzer = 'jieba' | 'llm'

export const ANALYZERS: readonly Analyzer[] = ['jieba', 'llm']

/**
 * What was found. Four are proper nouns an analyser distinguished — `proper`
 * being the one that is none of the other three. `latin` is not a proper noun
 * at all: it is a run of latin letters and digits inside CJK prose, which is a
 * different thing to see and so a different thing to paint. Nor is
 * `sentence-end`, which is the terminator itself — the full stop, not the
 * sentence — so that the eye finds the end of one without reading to it.
 */
export type Kind = 'person' | 'place' | 'org' | 'proper' | 'latin' | 'sentence-end'

export const KINDS: readonly Kind[] = [
  'person',
  'place',
  'org',
  'proper',
  'latin',
  'sentence-end'
]

/**
 * One marked range of a segment: half-open, in JavaScript string indices.
 * Spans never overlap and always arrive in ascending order.
 */
export interface Span {
  start: number
  end: number
  kind: Kind
}

/** How a line is drawn under a marked span; `none` leaves it undrawn. */
export type Underline = 'none' | 'solid' | 'dotted' | 'dashed' | 'double' | 'wavy'

export const UNDERLINES: readonly Underline[] = [
  'none',
  'solid',
  'dotted',
  'dashed',
  'double',
  'wavy'
]

/**
 * What one kind looks like. Every field is validated before it reaches a
 * stylesheet — the values come from a file the reader writes, so there is no
 * "any CSS you like" field, on purpose.
 */
export interface Decoration {
  underline: Underline
  /** `#rgb`, `#rrggbb` or `#rrggbbaa`; null leaves the text's own colour. */
  underlineColor: string | null
  color: string | null
  background: string | null
  bold: boolean
  italic: boolean
  /**
   * Extra room after the span, in em, 0 to 2. A pause the eye can see: what a
   * sentence ending is worth is not another colour among the colours but a
   * gap, which is what a printer would have given it.
   */
  spaceAfter: number
}

/** The widest gap a rule may ask for. Past this it is not a pause, it is a
 *  hole, and the line stops reading as a line. */
export const MAX_SPACE_AFTER = 2

/** The reader's `rules.json`, one decoration per kind. */
export type Rules = Record<Kind, Decoration>

/** Underline in the accent blue, which is what a first run gets. */
const DEFAULT_MARK: Decoration = {
  underline: 'solid',
  underlineColor: '#7aa2f7',
  color: null,
  background: null,
  bold: false,
  italic: false,
  spaceAfter: 0
}

export const DEFAULT_RULES: Rules = {
  person: { ...DEFAULT_MARK },
  place: { ...DEFAULT_MARK },
  org: { ...DEFAULT_MARK },
  proper: { ...DEFAULT_MARK },
  // A colour rather than a line, so the two marks use different channels and
  // an English name inside a Chinese sentence can be both at once. The palette
  // here is the dark theme's; the file holds literal colours and knows nothing
  // about themes, so a reader on the light one edits it.
  latin: {
    underline: 'none',
    underlineColor: null,
    color: '#4fc3d0',
    background: null,
    bold: false,
    italic: false,
    spaceAfter: 0
  },
  // A third channel again: not a line and not the colour a word gets, but
  // weight and a gap. A full stop is small, easy to miss and the one mark on
  // the line that says "you may stop here" — so it is given room rather than
  // another hue to tell apart from the two above.
  'sentence-end': {
    underline: 'none',
    underlineColor: null,
    color: '#e09a52',
    background: null,
    bold: true,
    italic: false,
    spaceAfter: 0.35
  }
}

/** Where the reader's two files are, for the settings rows to open. */
export interface ConfigPaths {
  rules: string
  models: string
}

/** Preference keys, which are also the settings rows' `pref` names. */
export const PREF = { analyzer: 'analyzer' } as const
