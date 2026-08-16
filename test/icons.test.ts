import { describe, expect, it } from 'vitest'
// A renderer module, but a DOM-free one — hence the entry for it in
// tsconfig.node.json, which is the project the tests belong to.
import { fileIcon } from '../src/renderer/src/icons'

describe('fileIcon', () => {
  it('gives a language its own colour on the shared shape', () => {
    expect(fileIcon('src/App.tsx')).toEqual({ shape: 'code', tone: 'blue' })
    expect(fileIcon('src/app.py')).toEqual({ shape: 'code', tone: 'green' })
    expect(fileIcon('main.rs')).toEqual({ shape: 'code', tone: 'orange' })
  })

  it('reads the extension case-insensitively', () => {
    expect(fileIcon('DOC/README.MD')).toEqual(fileIcon('doc/readme.md'))
    expect(fileIcon('Shot.PNG')).toEqual({ shape: 'image', tone: 'magenta' })
  })

  it('matches a whole name before an extension', () => {
    // Data by its extension, a lockfile by its name.
    expect(fileIcon('package.json')).toEqual({ shape: 'braces', tone: 'yellow' })
    expect(fileIcon('package-lock.json')).toEqual({ shape: 'lock', tone: 'red' })
    expect(fileIcon('Dockerfile')).toEqual({ shape: 'shell', tone: 'blue' })
  })

  it('matches the name, not the directories above it', () => {
    // `docs.rs/notes.txt` ends in neither `rs` nor a listed name.
    expect(fileIcon('docs.rs/notes.txt')).toEqual({ shape: 'doc', tone: 'dim' })
    expect(fileIcon('a/b/Makefile')).toEqual({ shape: 'shell', tone: 'orange' })
  })

  it('reads a dotfile by what follows its last dot, and only then', () => {
    expect(fileIcon('.eslintrc.json')).toEqual({ shape: 'braces', tone: 'yellow' })
    // No second dot: `bashrc` is not a language.
    expect(fileIcon('.bashrc')).toEqual({ shape: 'file', tone: 'dim' })
    // Named dotfiles win over that rule.
    expect(fileIcon('.gitignore')).toEqual({ shape: 'git', tone: 'orange' })
  })

  it('takes the outer extension of a double one', () => {
    expect(fileIcon('release/gitty.tar.gz')).toEqual({ shape: 'archive', tone: 'yellow' })
  })

  it('falls back to a plain page rather than guessing', () => {
    expect(fileIcon('CHANGELOG')).toEqual({ shape: 'file', tone: 'dim' })
    expect(fileIcon('data/thing.qqq')).toEqual({ shape: 'file', tone: 'dim' })
  })
})
