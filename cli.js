#!/usr/bin/env node
// npm global entry point: launch Gitty in the Electron this package installs.
// Under plain Node, require('electron') resolves to the binary's path rather
// than the app API, so spawn it with the built main process as its app.
const { spawn } = require('node:child_process')
const path = require('node:path')

// On Linux the SUID sandbox cannot keep a root-owned setuid bit inside
// node_modules; run.sh does the same thing for the same reason.
if (process.platform === 'linux') process.env.ELECTRON_DISABLE_SANDBOX = '1'

const electron = require('electron')
const app = path.join(__dirname, 'out', 'main', 'index.js')
const child = spawn(electron, [app, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
})
child.on('close', (code) => process.exit(code ?? 0))
child.on('error', (err) => {
  console.error(`gitty: could not start Electron: ${err.message}`)
  process.exit(1)
})
