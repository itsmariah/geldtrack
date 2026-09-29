const { app, BrowserWindow, shell } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

let backendProcess = null
let mainWindow = null

function getBackendPath() {
  if (isDev) return path.join(__dirname, '..', 'backend')
  return path.join(process.resourcesPath, 'backend')
}

function startBackend() {
  const backendPath = getBackendPath()
  const dbPath = path.join(app.getPath('userData'), 'geldtrack.db')

  return new Promise((resolve) => {
    backendProcess = spawn(process.execPath, ['server.js'], {
      cwd: backendPath,
      env: {
        ...process.env,
        PORT: '3001',
        ELECTRON: 'true',
        DATABASE_URL: `file:${dbPath}`,
      },
    })

    backendProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim()
      console.log('[backend]', msg)
      if (msg.includes('rodando')) resolve()
    })

    backendProcess.stderr.on('data', (data) => {
      console.error('[backend error]', data.toString().trim())
    })

    // Fallback: resolve after 3s even if log message changes
    setTimeout(resolve, 3000)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'GeldTrack',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
    )
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  if (!isDev) await startBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
})
