import { describe, expect, it } from 'vitest'
import { humanBytes } from '../src/renderer/src/bytes'

describe('humanBytes', () => {
  it('writes bytes whole, below a kilobyte', () => {
    expect(humanBytes(0)).toBe('0 B')
    expect(humanBytes(1023)).toBe('1023 B')
  })

  it('turns over to the next unit at the binary boundary', () => {
    expect(humanBytes(1024)).toBe('1.0 KB')
    expect(humanBytes(1024 * 1024 - 1)).toBe('1024.0 KB')
    expect(humanBytes(1024 * 1024)).toBe('1.0 MB')
  })

  it('keeps one decimal above a kilobyte', () => {
    expect(humanBytes(1536)).toBe('1.5 KB')
    expect(humanBytes(12 * 1024 * 1024 + 512 * 1024)).toBe('12.5 MB')
  })
})
