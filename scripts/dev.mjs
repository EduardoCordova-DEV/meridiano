import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import electron from 'electron'

const server = await createServer()
await server.listen()
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(electron, ['.', '--dev'], { stdio: 'inherit', env })
let stopping = false
async function stop(code = 0) {
  if (stopping) return
  stopping = true
  child.kill()
  await server.close()
  process.exitCode = code
}
child.on('error', (error) => { console.error(error); void stop(1) })
child.on('exit', (code) => { void stop(code ?? 1) })
process.on('SIGINT', () => { void stop() })
process.on('SIGTERM', () => { void stop() })
