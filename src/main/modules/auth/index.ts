import { App, IpcMain } from 'electron';
import { startGoogleAuth } from './google';

export function registerAuthHandlers(app: App, ipcMain: IpcMain): void {
  ipcMain.handle('auth:start', () => startGoogleAuth());
}
