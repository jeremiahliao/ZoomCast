// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
})

contextBridge.exposeInMainWorld('auth', {
  signIn: () => ipcRenderer.invoke('auth:start'),
  restoreSession: () => ipcRenderer.invoke('auth:restoreSession'),
  signOut: () => ipcRenderer.invoke('auth:signOut'),
})
