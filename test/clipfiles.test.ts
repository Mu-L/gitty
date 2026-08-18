import { describe, expect, it } from 'vitest'
import {
  copyName,
  fileUriToPath,
  parseCopiedFiles,
  parsePlainPaths,
  parseUriList
} from '../src/main/clipfiles'

describe('fileUriToPath', () => {
  it('decodes a local file URI', () => {
    expect(fileUriToPath('file:///home/u/a%20b.txt')).toBe('/home/u/a b.txt')
  })

  it('refuses anything that is not a local file', () => {
    expect(fileUriToPath('https://example.com/a')).toBeNull()
    expect(fileUriToPath('file://server/share/a')).toBeNull()
    expect(fileUriToPath('/home/u/a')).toBeNull()
  })

  it('keeps a stray percent rather than dropping the path', () => {
    expect(fileUriToPath('file:///tmp/100%')).toBe('/tmp/100%')
  })
})

describe('parseCopiedFiles', () => {
  it('reads the verb and the URIs', () => {
    expect(parseCopiedFiles('copy\nfile:///a\nfile:///b')).toEqual({
      op: 'copy',
      paths: ['/a', '/b']
    })
    expect(parseCopiedFiles('cut\nfile:///a')).toEqual({ op: 'cut', paths: ['/a'] })
  })

  it('skips the format name older Nautilus writes first', () => {
    expect(parseCopiedFiles('x-special/nautilus-clipboard\ncopy\nfile:///a')).toEqual({
      op: 'copy',
      paths: ['/a']
    })
  })

  it('is nothing without a verb, or without a path', () => {
    expect(parseCopiedFiles('file:///a\nfile:///b')).toBeNull()
    expect(parseCopiedFiles('copy')).toBeNull()
    expect(parseCopiedFiles('copy\nhttps://example.com/a')).toBeNull()
  })
})

describe('parseUriList', () => {
  it('takes the URIs and leaves the comments', () => {
    expect(parseUriList('# a comment\nfile:///a\n\nfile:///b')).toEqual({
      op: 'copy',
      paths: ['/a', '/b']
    })
  })

  it('has no verb to read, so it is always a copy', () => {
    expect(parseUriList('file:///a')?.op).toBe('copy')
  })

  it('is nothing when no line is a local file', () => {
    expect(parseUriList('https://example.com/a')).toBeNull()
  })
})

describe('parsePlainPaths', () => {
  it('takes absolute paths, one per line', () => {
    expect(parsePlainPaths('/home/u/a\n/home/u/b')).toEqual({
      op: 'copy',
      paths: ['/home/u/a', '/home/u/b']
    })
  })

  it('unquotes a path copied from a shell', () => {
    expect(parsePlainPaths("'/home/u/a b'")).toEqual({ op: 'copy', paths: ['/home/u/a b'] })
  })

  it('takes Windows paths too', () => {
    expect(parsePlainPaths('C:\\Users\\u\\a.txt')?.paths).toEqual(['C:\\Users\\u\\a.txt'])
  })

  it('refuses the whole payload when a line is not a path', () => {
    // Ordinary copied prose must not read as a file list.
    expect(parsePlainPaths('/home/u/a\nsome notes about it')).toBeNull()
    expect(parsePlainPaths('relative/path')).toBeNull()
    expect(parsePlainPaths('')).toBeNull()
  })
})

describe('copyName', () => {
  const taken = (names: string[]) => (c: string) => names.includes(c)

  it('leaves a free name alone', () => {
    expect(copyName('notes.md', taken([]))).toBe('notes.md')
  })

  it('puts the suffix before the extension', () => {
    expect(copyName('notes.md', taken(['notes.md']))).toBe('notes (copy).md')
  })

  it('counts up while the copies are taken', () => {
    expect(copyName('notes.md', taken(['notes.md', 'notes (copy).md']))).toBe('notes (copy 2).md')
  })

  it('treats a leading dot as the name, not an extension', () => {
    expect(copyName('.gitignore', taken(['.gitignore']))).toBe('.gitignore (copy)')
  })
})
