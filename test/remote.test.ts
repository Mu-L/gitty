import { describe, expect, it } from 'vitest'
import { commitUrlBase, parseSshConfig } from '../src/main/remote'

const H = 'a'.repeat(40)

describe('commitUrlBase', () => {
  it('reads the scp-like SSH form git prints for GitHub', () => {
    expect(commitUrlBase('git@github.com:user/repo.git')).toBe(
      'https://github.com/user/repo/commit/'
    )
  })

  it('reads https, with or without the .git suffix and a trailing slash', () => {
    expect(commitUrlBase('https://github.com/user/repo.git')).toBe(
      'https://github.com/user/repo/commit/'
    )
    expect(commitUrlBase('https://github.com/user/repo/')).toBe(
      'https://github.com/user/repo/commit/'
    )
  })

  it('drops credentials and a port, which belong to the transport', () => {
    expect(commitUrlBase('https://token@github.com/user/repo.git')).toBe(
      'https://github.com/user/repo/commit/'
    )
    expect(commitUrlBase('ssh://git@git.example.com:2222/user/repo.git')).toBe(
      'https://git.example.com/user/repo/commit/'
    )
  })

  it('puts GitLab commits under /-/ and Bitbucket ones under /commits/', () => {
    expect(commitUrlBase('git@gitlab.com:group/sub/repo.git')).toBe(
      'https://gitlab.com/group/sub/repo/-/commit/'
    )
    expect(commitUrlBase('https://gitlab.example.org/g/repo.git')).toBe(
      'https://gitlab.example.org/g/repo/-/commit/'
    )
    expect(commitUrlBase('git@bitbucket.org:user/repo.git')).toBe(
      'https://bitbucket.org/user/repo/commits/'
    )
  })

  it('expands the bare host an ssh config alias leaves in the remote', () => {
    expect(commitUrlBase('git@github:user/repo.git')).toBe(
      'https://github.com/user/repo/commit/'
    )
    expect(commitUrlBase('git@gitlab:group/repo.git')).toBe(
      'https://gitlab.com/group/repo/-/commit/'
    )
    expect(commitUrlBase('git@bitbucket:user/repo.git')).toBe(
      'https://bitbucket.org/user/repo/commits/'
    )
    expect(commitUrlBase('https://gitee/user/repo.git')).toBe(
      'https://gitee.com/user/repo/commit/'
    )
  })

  it('does not rewrite a host that merely contains a service name', () => {
    expect(commitUrlBase('git@github.example.org:user/repo.git')).toBe(
      'https://github.example.org/user/repo/commit/'
    )
    expect(commitUrlBase('https://gitlab.example.org/g/repo.git')).toBe(
      'https://gitlab.example.org/g/repo/-/commit/'
    )
  })

  it('gives an unknown host the layout GitHub, Gitea and sourcehut share', () => {
    expect(commitUrlBase('git@codeberg.org:user/repo.git')).toBe(
      'https://codeberg.org/user/repo/commit/'
    )
    expect(commitUrlBase('https://git.sr.ht/~user/repo')).toBe(
      'https://git.sr.ht/~user/repo/commit/'
    )
  })

  it('refuses what it cannot name: local paths, file URLs, Azure DevOps', () => {
    expect(commitUrlBase('/srv/git/repo.git')).toBeNull()
    expect(commitUrlBase('../sibling')).toBeNull()
    expect(commitUrlBase('file:///srv/git/repo.git')).toBeNull()
    expect(commitUrlBase('C:\\repos\\repo')).toBeNull()
    expect(commitUrlBase('https://dev.azure.com/org/project/_git/repo')).toBeNull()
    expect(commitUrlBase('')).toBeNull()
  })

  it('appends a full hash to the prefix it returns', () => {
    expect(`${commitUrlBase('git@github.com:user/repo.git')}${H}`).toBe(
      `https://github.com/user/repo/commit/${H}`
    )
  })
})

describe('parseSshConfig', () => {
  it('returns an empty map for empty or comment-only configs', () => {
    expect(parseSshConfig('')).toEqual(new Map())
    expect(parseSshConfig('\n  \n# only a comment\n')).toEqual(new Map())
  })

  it('reads a Host/HostName pair', () => {
    expect(parseSshConfig('Host github\n  HostName github.com\n')).toEqual(
      new Map([['github', 'github.com']])
    )
  })

  it('registers every name of a multi-pattern or comma Host line', () => {
    expect(parseSshConfig('Host a b\n  HostName x.com')).toEqual(
      new Map([['a', 'x.com'], ['b', 'x.com']])
    )
    expect(parseSshConfig('Host a,b\n  HostName x.com')).toEqual(
      new Map([['a', 'x.com'], ['b', 'x.com']])
    )
  })

  it('skips patterns, which are not aliases to expand', () => {
    expect(parseSshConfig('Host *\n  HostName x.com')).toEqual(new Map())
    expect(parseSshConfig('Host github*\n  HostName x.com')).toEqual(new Map())
    expect(parseSshConfig('Host g?thub\n  HostName x.com')).toEqual(new Map())
    expect(parseSshConfig('Host !github\n  HostName x.com')).toEqual(new Map())
  })

  it('a block without a HostName contributes nothing', () => {
    expect(parseSshConfig('Host a\n  User bob')).toEqual(new Map())
  })

  it('the first HostName wins, across blocks and within one', () => {
    expect(parseSshConfig('Host a\n  HostName one.com\nHost a\n  HostName two.com')).toEqual(
      new Map([['a', 'one.com']])
    )
    expect(parseSshConfig('Host a\n  HostName one.com\n  HostName two.com')).toEqual(
      new Map([['a', 'one.com']])
    )
  })

  it('keywords are case-insensitive and comments are stripped', () => {
    expect(parseSshConfig('Host github # my alias\n  hostname GitHub.com # c')).toEqual(
      new Map([['github', 'github.com']])
    )
  })

  it('Match or Include ends the previous block', () => {
    expect(parseSshConfig('Host a\n  HostName one.com\nMatch all\n  HostName two.com')).toEqual(
      new Map([['a', 'one.com']])
    )
  })

  it('tolerates CRLF and tab indentation', () => {
    expect(parseSshConfig('Host a\r\n\tHostName x.com\r\n')).toEqual(
      new Map([['a', 'x.com']])
    )
  })
})

describe('commitUrlBase with an ssh config', () => {
  const ssh = (pairs: [string, string][]): Map<string, string> => new Map(pairs)

  it('expands a custom alias through the config', () => {
    expect(commitUrlBase('git@gh:user/repo.git', ssh([['gh', 'github.com']]))).toBe(
      'https://github.com/user/repo/commit/'
    )
  })

  it('strips the ssh. transport endpoint back to the site', () => {
    expect(commitUrlBase('git@gh:user/repo.git', ssh([['gh', 'ssh.github.com']]))).toBe(
      'https://github.com/user/repo/commit/'
    )
    expect(commitUrlBase('git@gh:user/repo.git', ssh([['gh', 'ssh.gitlab.com']]))).toBe(
      'https://gitlab.com/user/repo/-/commit/'
    )
  })

  it('leaves a single-label ssh. host whole', () => {
    expect(commitUrlBase('git@foo:user/repo.git', ssh([['foo', 'ssh.internal']]))).toBe(
      'https://ssh.internal/user/repo/commit/'
    )
  })

  it('never expands a dotted host, even when the config maps it', () => {
    expect(commitUrlBase('git@github.com:user/repo.git', ssh([['github.com', 'ssh.github.com']]))).toBe(
      'https://github.com/user/repo/commit/'
    )
  })

  it('the config overrides the well-known name fallback', () => {
    expect(commitUrlBase('git@github:user/repo.git', ssh([['github', 'gitlab.com']]))).toBe(
      'https://gitlab.com/user/repo/-/commit/'
    )
  })

  it('falls back to the well-known names when the config is silent', () => {
    expect(commitUrlBase('git@github:user/repo.git', new Map())).toBe(
      'https://github.com/user/repo/commit/'
    )
  })
})
