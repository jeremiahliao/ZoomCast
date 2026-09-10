import { App, IpcMain } from 'electron';
import { startGoogleAuth, restoreSession, clearSession } from './google';

export function registerAuthHandlers(app: App, ipcMain: IpcMain): void {
  // Full OAuth sign-in flow
  ipcMain.handle('auth:start', () => startGoogleAuth());

  // Restore session on startup — silently refreshes token if needed
  ipcMain.handle('auth:restoreSession', () => restoreSession());

  // Clear all stored tokens and session data
  ipcMain.handle('auth:signOut', () => clearSession());
}
