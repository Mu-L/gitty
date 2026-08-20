import { describe, expect, it } from 'vitest'
import { isExpression, literalPattern } from '../src/shared/regex'

describe('isExpression', () => {
  it('takes ordinary text and finished expressions', () => {
    expect(isExpression('fix')).toBe(true)
    expect(isExpression('fix|revert')).toBe(true)
    expect(isExpression('\\.tsx?$')).toBe(true)
  })

  it('turns down what is still being typed', () => {
    expect(isExpression('(fix')).toBe(false)
    expect(isExpression('a[b')).toBe(false)
    expect(isExpression('*fix')).toBe(false)
  })
})

describe('literalPattern', () => {
  it('leaves text with nothing to escape alone', () => {
    expect(literalPattern('fix the parser')).toBe('fix the parser')
  })

  it('escapes every character extended syntax would claim', () => {
    expect(literalPattern('.[]{}()*+?^$|\\')).toBe(
      '\\.\\[\\]\\{\\}\\(\\)\\*\\+\\?\\^\\$\\|\\\\'
    )
  })

  it('produces a pattern that matches the text and nothing else', () => {
    const text = 'a+b(c)'
    expect(new RegExp(literalPattern(text)).test('a+b(c)')).toBe(true)
    expect(new RegExp(literalPattern(text)).test('aab c')).toBe(false)
  })
})
