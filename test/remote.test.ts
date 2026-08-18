import { describe, expect, it } from 'vitest'
import { commitUrlBase } from '../src/main/remote'

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
