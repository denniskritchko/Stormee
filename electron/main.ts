// Use require to ensure CommonJS compatibility in esbuild CJS output
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { app, BrowserWindow } from 'electron'
import path from 'node:path'

const isDev = process.env.ELECTRON_RENDERER_URL !== undefined

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    frame: true, // Changed for debugging
    transparent: false, // Changed for debugging
    alwaysOnTop: false, // Changed for debugging
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexHtmlPath = path.join(__dirname, '..', 'dist', 'index.html')
    await mainWindow.loadFile(indexHtmlPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})


