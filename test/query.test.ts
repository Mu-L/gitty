import { describe, expect, it } from 'vitest'
import { grepExpr, grepPathspecs, parseQuery } from '../src/shared/query'

describe('parseQuery', () => {
  it('reads a plain word as the one term', () => {
    expect(parseQuery('foo')).toEqual({ include: ['foo'], exclude: [], paths: [], notPaths: [] })
  })

  it('ands the words of a bare query', () => {
    expect(parseQuery('foo bar').include).toEqual(['foo', 'bar'])
  })

  it('takes a quoted run as one term, spaces and all', () => {
    expect(parseQuery('"foo bar" baz').include).toEqual(['foo bar', 'baz'])
  })

  it('runs an unclosed quote to the end rather than failing', () => {
    expect(parseQuery('"foo bar').include).toEqual(['foo bar'])
  })

  it('limits the paths with in:', () => {
    const q = parseQuery('foo in:*.py')
    expect(q.include).toEqual(['foo'])
    expect(q.paths).toEqual(['*.py'])
  })

  it('splits a comma list into several globs', () => {
    expect(parseQuery('foo in:*.py,*.pyi').paths).toEqual(['*.py', '*.pyi'])
  })

  it('reads a leading dot as an extension', () => {
    expect(parseQuery('foo in:.py').paths).toEqual(['*.py'])
  })

  it('excludes a term with a leading dash', () => {
    const q = parseQuery('foo -bar')
    expect(q.include).toEqual(['foo'])
    expect(q.exclude).toEqual(['bar'])
  })

  it('excludes a path with -in:', () => {
    expect(parseQuery('foo -in:test/*').notPaths).toEqual(['test/*'])
  })

  it('takes a bare in when a path follows it', () => {
    const q = parseQuery('foo in *.py')
    expect(q.include).toEqual(['foo'])
    expect(q.paths).toEqual(['*.py'])
  })

  it('leaves a bare in alone when the next word is not a path', () => {
    // `for x in list` is code, not a path limit.
    expect(parseQuery('for x in list').include).toEqual(['for', 'x', 'in', 'list'])
  })

  it('searches a quoted operator literally', () => {
    const q = parseQuery('"in:*.py"')
    expect(q.include).toEqual(['in:*.py'])
    expect(q.paths).toEqual([])
  })

  it('takes a lone in: as a path limit with nothing to search for', () => {
    expect(parseQuery('in:*.py')).toEqual({
      include: [],
      exclude: [],
      paths: ['*.py'],
      notPaths: []
    })
  })

  it('reads a dash on its own as a term, not an exclusion', () => {
    expect(parseQuery('-').include).toEqual(['-'])
  })
})

describe('grepExpr', () => {
  it('ands the terms, one -e each', () => {
    expect(grepExpr(parseQuery('foo bar'))).toEqual(['-e', 'foo', '--and', '-e', 'bar'])
  })

  it('negates an excluded term', () => {
    expect(grepExpr(parseQuery('foo -bar'))).toEqual([
      '-e',
      'foo',
      '--and',
      '--not',
      '-e',
      'bar'
    ])
  })

  it('keeps a term beginning with a dash behind its own -e', () => {
    // Quoted, so it is a term rather than an exclusion — and `-e` is what
    // stops git from reading it as an option.
    expect(grepExpr(parseQuery('"--force"'))).toEqual(['-e', '--force'])
  })
})

describe('grepPathspecs', () => {
  it('passes the globs through and marks the exclusions', () => {
    expect(grepPathspecs(parseQuery('foo in:*.py -in:test/*'))).toEqual([
      '*.py',
      ':(exclude)test/*'
    ])
  })

  it('is empty for a query with no path limit', () => {
    expect(grepPathspecs(parseQuery('foo'))).toEqual([])
  })
})
