import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, validFilename } from './store.mjs';
import { resolveDataDirectory } from './directory.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
if (process.env.CV_STUDIO_TEST_DIR) app.setPath('userData', path.join(process.env.CV_STUDIO_TEST_DIR, '.app'));
let window;
let store;
let dirty = false;
let closing = false;
let printBusy = false;
const configFile = () => path.join(app.getPath('userData'), 'settings.json');

// A single running app prevents two editor windows from overwriting each other.
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { window?.restore(); window?.focus(); });
  app.whenReady().then(start).catch(error => {
    if (process.env.CV_STUDIO_TEST_DIR) {
      fs.writeFile(path.join(process.env.CV_STUDIO_TEST_DIR, 'failure.txt'), error.stack).finally(() => app.exit(1));
      return;
    }
    dialog.showErrorBox('Không mở được CV Studio', error.message);
    app.quit();
  });
}

async function start() {
  const legacyDirectory = path.join((process.platform === 'darwin' ? app.getPath('userData') : null) || process.env.PORTABLE_EXECUTABLE_DIR ||
    (app.isPackaged ? path.dirname(app.getPath('exe')) : path.join(here, '..')), 'data', 'cvs');
  // Test fixtures are isolated from the user's CVs and saved preferences.
  const directory = process.env.CV_STUDIO_TEST_DIR || await resolveDataDirectory(app.getPath('userData'), legacyDirectory);
  store = createStore(directory);
  window = new BrowserWindow({
    width: 1320, height: 960, minWidth: 900, minHeight: 650,
    title: 'CV Studio', icon: path.join(here, '..', 'dist', 'app-icon.ico'), backgroundColor: '#ffffff', show: !process.env.CV_STUDIO_TEST_DIR,
    webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  const trusted = event => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) {
      throw new Error('Yêu cầu không hợp lệ.');
    }
  };
  const handle = (channel, handler) => ipcMain.handle(channel, (event, ...args) => {
    trusted(event);
    return handler(...args);
  });
  handle('cv:list', async kind => ({ files: await store.list(kind), directory: store.root }));
  handle('cv:load', name => store.load(name));
  handle('cv:save', (name, data, layout, revision, create) => store.save(name, data, layout, revision, create === true));
  handle('cv:folder', async (kind = 'cv') => {
    const result = await dialog.showOpenDialog(window, { title: 'Chọn thư mục chứa CV (.md)', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled) return null;
    const next = createStore(result.filePaths[0]);
    const files = await next.list(kind);
    if (!process.env.CV_STUDIO_TEST_DIR) await fs.writeFile(configFile(), JSON.stringify({ directory: next.root }));
    store = next;
    return { files, directory: store.root };
  });
  handle('cv:pdf', async () => {
    if (printBusy) throw new Error('Đang tạo bản in, vui lòng đợi.');
    printBusy = true;
    try {
      await window.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
      const bytes = await window.webContents.printToPDF({
        pageSize: 'A4', printBackground: true, displayHeaderFooter: false,
        preferCSSPageSize: true, margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      return new Uint8Array(bytes);
    } finally { printBusy = false; }
  });
  handle('cv:save-pdf', async (name, bytes) => {
    if (!(bytes instanceof Uint8Array) || bytes.length > 30_000_000 ||
        Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') throw new Error('Bản PDF không hợp lệ.');
    const result = await dialog.showSaveDialog(window, {
      title: 'Lưu tài liệu thành PDF', defaultPath: path.join(app.getPath('documents'), validFilename(name).replace(/\.md$/, '.pdf')),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (result.canceled) return null;
    await fs.writeFile(result.filePath, bytes);
    return result.filePath;
  });
  handle('cv:print', () => new Promise((resolve, reject) => {
    window.webContents.print({ silent: false, printBackground: true, pageSize: 'A4', margins: { marginType: 'none' } },
      (success, reason) => success ? resolve(true) : /cancel/i.test(reason) ? resolve(false) : reject(new Error(reason || 'Không in được CV.')));
  }));
  ipcMain.on('cv:dirty', (event, value) => { trusted(event); dirty = Boolean(value); });
  ipcMain.on('cv:close-ready', event => { trusted(event); closing = true; window.close(); });
  window.on('close', event => {
    if (!closing && dirty) { event.preventDefault(); window.webContents.send('cv:closing'); }
  });
  await window.loadFile(path.join(here, '..', 'dist', 'index.html'));
  if (process.env.CV_STUDIO_TEST_DIR) {
    const { runSmokeTest } = await import('./smoke.mjs');
    try { await runSmokeTest(window, store); app.exit(0); }
    catch (error) {
      await fs.writeFile(path.join(store.root, 'failure.txt'), error.stack);
      console.error(error); app.exit(1);
    }
  }
}
app.on('window-all-closed', () => { if (!process.env.CV_STUDIO_TEST_DIR) app.quit(); });
