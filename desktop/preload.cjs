const { contextBridge, ipcRenderer } = require('electron');

const invoke = channel => (...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('desktop', {
  list: invoke('cv:list'),
  load: invoke('cv:load'),
  save: invoke('cv:save'),
  chooseFolder: invoke('cv:folder'),
  pdf: invoke('cv:pdf'),
  savePDF: invoke('cv:save-pdf'),
  print: invoke('cv:print'),
  setDirty: dirty => ipcRenderer.send('cv:dirty', Boolean(dirty)),
  closeReady: () => ipcRenderer.send('cv:close-ready'),
  onClose: callback => {
    const listener = () => callback();
    ipcRenderer.on('cv:closing', listener);
    return () => ipcRenderer.removeListener('cv:closing', listener);
  },
});
