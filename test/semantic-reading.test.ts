import { describe, expect, it } from 'vitest'
import {
  latinSpans,
  locateTerms,
  taggedSpans,
  sentenceSpans,
  withPatterns,
  worthAnalysing
} from '../src/plugins/semantic-reading/analyze'
import { marksCss } from '../src/plugins/semantic-reading/render'
import { DEFAULT_RULES, type Rules } from '../src/plugins/semantic-reading/shared'

/**
 * The semantic-reading plugin's string work — see
 * `ref/spec/semantic-reading.md`. Importing it is safe: jieba is loaded lazily
 * by the plugin's main half, so nothing native is touched by a test run.
 */

describe('taggedSpans', () => {
  it('turns jieba tags into offsets', () => {
    const text = '小明毕业于中国科学院'
    const spans = taggedSpans(text, [
      { tag: 'nr', word: '小明' },
      { tag: 'v', word: '毕业' },
      { tag: 'p', word: '于' },
      { tag: 'nt', word: '中国科学院' }
    ])
    expect(spans).toEqual([
      { start: 0, end: 2, kind: 'person' },
      { start: 5, end: 10, kind: 'org' }
    ])
    expect(text.slice(5, 10)).toBe('中国科学院')
  })

  it('marks nothing for a tag that is not a proper noun', () => {
    expect(taggedSpans('the model', [{ tag: 'eng', word: 'model' }])).toEqual([])
  })

  it('drops a one-character name, which is noise more often than not', () => {
    expect(taggedSpans('李走了', [{ tag: 'nr', word: '李' }])).toEqual([])
  })

  it('picks up again after a word that is not where it was said to be', () => {
    // A tagger that swallowed the space still leaves the later words findable.
    const spans = taggedSpans('北京 上海', [
      { tag: 'ns', word: '北京' },
      { tag: 'ns', word: '上海' }
    ])
    expect(spans).toEqual([
      { start: 0, end: 2, kind: 'place' },
      { start: 3, end: 5, kind: 'place' }
    ])
  })

  it('abandons the segment once a word cannot be found at all', () => {
    // Anything after the miss would be offset by however much was lost.
    expect(
      taggedSpans('北京', [
        { tag: 'x', word: 'nowhere' },
        { tag: 'ns', word: '北京' }
      ])
    ).toEqual([])
  })
})

describe('locateTerms', () => {
  it('finds every occurrence of a term', () => {
    expect(locateTerms('Claude and Claude', [{ text: 'Claude', kind: 'proper' }])).toEqual([
      { start: 0, end: 6, kind: 'proper' },
      { start: 11, end: 17, kind: 'proper' }
    ])
  })

  it('lets the longer term win over one inside it', () => {
    expect(
      locateTerms('Ada Lovelace wrote it', [
        { text: 'Ada', kind: 'person' },
        { text: 'Ada Lovelace', kind: 'person' }
      ])
    ).toEqual([{ start: 0, end: 12, kind: 'person' }])
  })

  it('drops a term the model invented rather than copied', () => {
    expect(locateTerms('nothing here', [{ text: 'Xanadu', kind: 'place' }])).toEqual([])
  })

  it('answers in ascending order whatever order it was asked in', () => {
    const spans = locateTerms('Paris then Rome', [
      { text: 'Rome', kind: 'place' },
      { text: 'Paris', kind: 'place' }
    ])
    expect(spans.map((s) => s.start)).toEqual([0, 11])
  })
})

describe('latinSpans', () => {
  it('marks the latin runs in a Chinese sentence', () => {
    const text = '我们用 GPT-4 跑了 Claude 的评测'
    const spans = latinSpans(text)
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual(['GPT-4', 'Claude'])
    expect(spans.every((s) => s.kind === 'latin')).toBe(true)
  })

  it('keeps a version together and leaves the full stop after it out', () => {
    const text = '升级到 v0.1.9。'
    expect(latinSpans(text).map((s) => text.slice(s.start, s.end))).toEqual(['v0.1.9'])
  })

  it('leaves a bare number alone, which already reads as a number', () => {
    const text = '一共 42 个'
    expect(latinSpans(text)).toEqual([])
  })

  it('marks nothing in an English paragraph, where every word is latin', () => {
    expect(latinSpans('Every word here is a latin run.')).toEqual([])
  })

  it('reads a Japanese segment as CJK too', () => {
    const text = 'これは Claude です'
    expect(latinSpans(text).map((s) => text.slice(s.start, s.end))).toEqual(['Claude'])
  })
})

describe('sentenceSpans', () => {
  const marked = (text: string): string[] =>
    sentenceSpans(text).map((s) => text.slice(s.start, s.end))

  it('marks the full-width terminators wherever they are', () => {
    expect(marked('好了。真的吗？走！')).toEqual(['。', '？', '！'])
  })

  it('takes a run of them as one ending', () => {
    expect(marked('等等……')).toEqual(['……'])
    expect(marked('what?! now')).toEqual(['?!'])
  })

  it('needs whitespace or the end after an ascii terminator', () => {
    expect(marked('v0.1.9 shipped')).toEqual([])
    expect(marked('see google.com now')).toEqual([])
    expect(marked('It shipped. Then it broke.')).toEqual(['.', '.'])
  })

  it('leaves an abbreviation and an initial alone', () => {
    expect(marked('e.g. this one')).toEqual([])
    expect(marked('the U.S. again')).toEqual([])
    expect(marked('J. Smith wrote it')).toEqual([])
  })
})

describe('withPatterns', () => {
  it('lets the analyser keep what it claimed', () => {
    const text = '我们用 Claude 做评测'
    const found = withPatterns(text, [{ start: 4, end: 10, kind: 'org' }])
    expect(found).toEqual([{ start: 4, end: 10, kind: 'org' }])
  })

  it('answers in ascending order with every pattern merged in', () => {
    const text = '北京的 Claude 团队。'
    const found = withPatterns(text, [{ start: 0, end: 2, kind: 'place' }])
    expect(found).toEqual([
      { start: 0, end: 2, kind: 'place' },
      { start: 4, end: 10, kind: 'latin' },
      { start: 13, end: 14, kind: 'sentence-end' }
    ])
  })
})

describe('worthAnalysing', () => {
  it('takes text with letters in it', () => {
    expect(worthAnalysing('Anthropic')).toBe(true)
    expect(worthAnalysing('北京')).toBe(true)
  })

  it('leaves out what cannot hold a name', () => {
    expect(worthAnalysing(' ')).toBe(false)
    expect(worthAnalysing('a')).toBe(false)
    expect(worthAnalysing(' — ')).toBe(false)
    expect(worthAnalysing('42 ')).toBe(false)
  })
})

describe('marksCss', () => {
  it('writes one rule per kind, scoped to the document', () => {
    const css = marksCss(DEFAULT_RULES)
    expect(css).toContain('.md-body .pl-semantic-reading-person {')
    expect(css).toContain('text-decoration-color: #7aa2f7')
    // Four proper-noun kinds underlined, the latin run coloured, and the
    // sentence ending given weight and a gap.
    expect(css).toContain('.md-body .pl-semantic-reading-latin { color: #4fc3d0 }')
    expect(css).toContain('margin-right: 0.35em')
    expect(css.split('\n')).toHaveLength(6)
  })

  it('leaves out a kind the reader asked for nothing on', () => {
    const rules: Rules = {
      ...DEFAULT_RULES,
      org: {
        underline: 'none',
        underlineColor: null,
        color: null,
        background: null,
        bold: false,
        italic: false,
        spaceAfter: 0
      }
    }
    expect(marksCss(rules)).not.toContain('prose-org')
  })

  it('writes the underline in longhand, so a colour cannot reset the line', () => {
    const css = marksCss({
      ...DEFAULT_RULES,
      proper: { ...DEFAULT_RULES.proper, underline: 'wavy', bold: true }
    })
    expect(css).toContain('text-decoration-style: wavy')
    expect(css).toContain('font-weight: 600')
  })
})
