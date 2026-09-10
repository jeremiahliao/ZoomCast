// Global type declarations shared across the app

interface User {
  name: string;
  email: string;
}

// Electron preload bridge exposed via contextBridge.exposeInMainWorld
interface Window {
  auth: {
    signIn: () => Promise<User | null>;
    restoreSession: () => Promise<User | null>;
    signOut: () => Promise<void>;
  };
}
