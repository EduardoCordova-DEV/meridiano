import { app, BrowserWindow, dialog, Menu, protocol, screen, session } from 'electron'
import { mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, isAbsolute } from 'node:path'

const APP_ID = 'com.meridiano.desk'
const APP_URL = 'meridiano://app/'
const DEV_URL = 'http://127.0.0.1:5183/'
const development = !app.isPackaged && process.argv.includes('--dev')
const entry = development ? DEV_URL : APP_URL
const origin = development ? 'http://127.0.0.1:5183' : 'meridiano://app'

app.setName('Meridiano Desk App')
app.setAppUserModelId(APP_ID)
const explicitProfile = app.commandLine.getSwitchValue('user-data-dir')
if (explicitProfile && !isAbsolute(explicitProfile)) throw new Error('--user-data-dir must be absolute')
const profile = explicitProfile || join(app.getPath('appData'), development ? 'meridiano-desk-app-dev' : 'meridiano-desk-app')
mkdirSync(profile, { recursive: true })
app.setPath('userData', profile)
app.setPath('sessionData', profile)
app.enableSandbox()

protocol.registerSchemesAsPrivileged([{
  scheme: 'meridiano',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}])

const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

function isDocument(url: string): boolean {
  try {
    const candidate = new URL(url)
    const expected = new URL(entry)
    return candidate.protocol === expected.protocol && candidate.host === expected.host &&
      (candidate.pathname === '/' || candidate.pathname === '/index.html') &&
      !candidate.username && !candidate.password && !candidate.search
  } catch {
    return false
  }
}

async function localResource(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname
  if (request.method !== 'GET' || url.host !== 'app' || url.username || url.password || url.search ||
      !/^\/(?:index\.html|theme-init\.js|favicon\.svg|earth-textures\.LICENSE\.txt|assets\/[\w.-]+\.(?:js|css|webp|png|svg|woff2?))$/.test(pathname)) {
    return new Response('Not found', { status: 404 })
  }
  try {
    const file = join(app.getAppPath(), 'dist', ...pathname.slice(1).split('/'))
    const types: Record<string, string> = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
      '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
    }
    return new Response(new Uint8Array(await readFile(file)), { headers: {
      'Content-Type': types[extname(file)],
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    } })
  } catch (error) {
    console.error('Unable to serve packaged resource', pathname, error)
    return new Response('Resource unavailable', { status: 404 })
  }
}

let mainWindow: BrowserWindow | null = null
let quitting = false

function reportFailure(message: string) {
  console.error(message)
  dialog.showErrorBox('Meridiano Desk App', message)
}

async function createWindow() {
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
  const width = Math.min(1440, area.width)
  const height = Math.min(1000, area.height)
  const window = new BrowserWindow({
    width,
    height,
    x: area.x + Math.round((area.width - width) / 2),
    y: area.y + Math.round((area.height - height) / 2),
    minWidth: Math.min(800, area.width),
    minHeight: Math.min(600, area.height),
    show: false,
    backgroundColor: '#f7f8f4',
    title: 'Meridiano Desk App',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#f7f8f4', symbolColor: '#000000', height: 34 },
    roundedCorners: true,
    icon: join(app.getAppPath(), 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  })
  mainWindow = window
  window.on('page-title-updated', (event) => event.preventDefault())
  // Theme metadata also styles native controls; no preload or renderer bridge is needed.
  window.webContents.on('did-change-theme-color', (_event, themeColor) => {
    const color = themeColor ?? '#f7f8f4'
    const [red, green, blue] = [1, 3, 5].map((offset) => {
      const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
    })
    const luminance = .2126 * red + .7152 * green + .0722 * blue
    const symbolColor = (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? '#000000' : '#ffffff'
    window.setTitleBarOverlay({ color, symbolColor })
    window.setBackgroundColor(color)
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => {
    if (!isDocument(event.url)) event.preventDefault()
  })
  window.webContents.on('will-redirect', (event) => {
    if (!isDocument(event.url)) event.preventDefault()
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  window.webContents.on('render-process-gone', (_event, details) => {
    if (!quitting && details.reason !== 'clean-exit') reportFailure('La ventana dejó de responder. Cierra y vuelve a abrir Meridiano; tus preferencias guardadas se conservan.')
  })
  window.on('closed', () => { mainWindow = null })
  await window.loadURL(entry)
  // A hidden/occluded window can defer its first paint indefinitely.
  window.show()
  window.maximize()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.show()
    mainWindow?.focus()
  })
  app.on('window-all-closed', () => app.quit())
  app.on('before-quit', () => {
    quitting = true
    session.defaultSession.flushStorageData()
  })
  void app.whenReady().then(async () => {
    Menu.setApplicationMenu(null)
    protocol.handle('meridiano', localResource)
    const browserSession = session.defaultSession
    browserSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    browserSession.setPermissionCheckHandler(() => false)
    browserSession.setDevicePermissionHandler(() => false)
    browserSession.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url)
      const local = url.protocol === 'meridiano:' && url.host === 'app'
      const dev = development && ['http:', 'ws:'].includes(url.protocol) && url.host === '127.0.0.1:5183'
      const download = url.protocol === 'blob:' && details.url.startsWith(`blob:${origin}/`)
      callback({ cancel: !(local || dev || download || url.protocol === 'data:') })
    })
    browserSession.on('will-download', (event, item, contents) => {
      if (contents !== mainWindow?.webContents ||
          !item.getURL().startsWith(`blob:${origin}/`) ||
          !/^meridiano-preferences-[\d-]+\.json$/.test(item.getFilename()) ||
          item.getMimeType() !== 'application/json') {
        event.preventDefault()
        reportFailure('Se bloqueó una descarga no reconocida. Solo se permite exportar las preferencias JSON.')
        return
      }
      item.setSaveDialogOptions({
        title: 'Exportar preferencias / Export preferences',
        defaultPath: join(app.getPath('documents'), item.getFilename()),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      item.once('done', (_event, state) => {
        if (state !== 'completed' && state !== 'cancelled') reportFailure('No se pudo guardar la exportación. Comprueba la carpeta y el espacio disponible.')
      })
    })
    await createWindow()
  }).catch((error: unknown) => {
    reportFailure(`No se pudo iniciar Meridiano Desk App.\n${error instanceof Error ? error.message : String(error)}`)
    app.quit()
  })
}
