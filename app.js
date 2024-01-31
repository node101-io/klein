const dotenv = require('dotenv');
const path = require('path');
const windowStateKeeper = require('electron-window-state');
const { app, BrowserWindow } = require('electron');

dotenv.config({ path: path.join(__dirname, '.env') });

let mainWindow;

const renderPugFile = require('./utils/renderPugFile');
// const ipcSSH = require('./ipc/ssh');

const createMainWindow = () => {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 720,
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
  });

  mainWindowState.manage(mainWindow);

  if (process.env.DEV_MODE)
    mainWindow.on("ready-to-show", () => {
      mainWindow.webContents.openDevTools();
    });

  renderPugFile('login/index', {
    page: 'login/index',
  }, (err, path) => {
    if (err)
      return console.error(err);

    mainWindow.loadFile(path);
  });
};

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});