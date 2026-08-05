/// <reference types="vite/client" />
import type { GittyApi } from '../../preload/index'

declare global {
  interface Window {
    gitty: GittyApi
  }
}

export {}
