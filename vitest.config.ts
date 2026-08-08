import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The suite lives in test/, one file per parser, importing the pure
    // functions it tests from src/. Entry points are never next to the code
    // they cover, so the folder stays a readable index of what is tested.
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
})
