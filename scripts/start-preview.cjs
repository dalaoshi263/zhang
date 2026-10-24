'use strict'

const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { setTimeout: delay } = require('node:timers/promises')

const projectPath = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const port = 5173
const previewUrl = `http://${host}:${port}/#home`
const logDirectory = path.join(projectPath, 'qa')
const errorLog = path.join(logDirectory, 'start-preview.stderr.log')
const outputLog = path.join(logDirectory, 'start-preview.stdout.log')

function supportedNode() {
  const [major, minor] = process.versions.node.split('.').map(Number)
  return (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22
}

// Do not start a second server, or stop a process that owns this port.
function probeWebsite() {
  return new Promise(resolve => {
    let settled = false
    const finish = state => {
      if (settled) return
      settled = true
      resolve(state)
    }
    const request = http.get({ hostname: host, port, path: '/', timeout: 1500 }, response => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => {
        body += chunk
        if (body.length > 65536) {
          finish('occupied')
          response.destroy()
        }
      })
      response.on('end', () => {
        const isPortfolio = response.statusCode === 200 && /<title>[^<]*YITING EDITS[^<]*<\/title>/i.test(body)
        finish(isPortfolio ? 'ready' : 'occupied')
      })
      response.on('error', () => finish('occupied'))
    })
    request.on('timeout', () => {
      finish('occupied')
      request.destroy()
    })
    request.on('error', error => finish(error.code === 'ECONNREFUSED' ? 'closed' : 'occupied'))
  })
}

async function openBrowser() {
  if (process.argv.includes('--no-open') || process.platform !== 'win32') return
  await new Promise(resolve => {
    // A fixed loopback URL is passed directly to Explorer, without a shell command.
    const opener = spawn('explorer.exe', [previewUrl], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
    })
    opener.once('spawn', () => {
      opener.unref()
      resolve()
    })
    opener.once('error', error => {
      console.warn(`Could not open the browser automatically: ${error.message}`)
      resolve()
    })
  })
}

async function startServer() {
  const viteEntry = path.join(projectPath, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!fs.existsSync(viteEntry)) {
    throw new Error('Project dependencies are missing. Run pnpm install in this project first.')
  }

  fs.mkdirSync(logDirectory, { recursive: true })
  const stdout = fs.openSync(outputLog, 'a')
  const stderr = fs.openSync(errorLog, 'a')
  let server
  try {
    const marker = `\n[Launcher ${new Date().toISOString()}]\n`
    fs.writeSync(stdout, marker)
    fs.writeSync(stderr, marker)
    server = spawn(process.execPath, [viteEntry, '--host', host, '--port', String(port), '--strictPort'], {
      cwd: projectPath,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', stdout, stderr],
    })
  } finally {
    fs.closeSync(stdout)
    fs.closeSync(stderr)
  }

  let stopped = false
  let startupError
  server.on('error', error => {
    startupError = error
    stopped = true
  })
  server.on('exit', code => {
    startupError = new Error(`Preview process exited with code ${code}.`)
    stopped = true
  })
  if (server.pid) fs.writeFileSync(path.join(logDirectory, 'vite-preview.pid'), `${server.pid}\n`)
  server.unref()

  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (stopped) throw startupError
    const state = await probeWebsite()
    if (stopped) throw startupError
    if (state === 'ready') return
    if (state === 'occupied') {
      throw new Error(`Port ${port} is occupied or not responding as this portfolio. No process was stopped.`)
    }
    await delay(250)
  }
  throw new Error(`The preview did not become ready within 20 seconds. Check ${errorLog}`)
}

async function main() {
  if (!supportedNode()) throw new Error(`Node ${process.versions.node} is unsupported. Use Node 20.19+ or 22.12+.`)
  const state = await probeWebsite()
  if (state === 'occupied') {
    throw new Error(`Port ${port} is occupied by another service or did not respond. No process was stopped.`)
  }
  if (state === 'ready') {
    console.log('The portfolio preview is already running.')
  } else {
    console.log('Starting the portfolio preview...')
    await startServer()
    console.log('The portfolio preview is ready.')
  }
  console.log(previewUrl)
  await openBrowser()
}

main().catch(error => {
  console.error(`Unable to start the preview: ${error.message}`)
  console.error(`Startup log: ${errorLog}`)
  process.exitCode = 1
})
