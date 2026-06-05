import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  platform: process.platform,

  // API key management
  saveAnthropicKey: (key: string) => ipcRenderer.invoke('save-anthropic-key', key),
  getAnthropicKey: (): Promise<string | null> => ipcRenderer.invoke('get-anthropic-key'),
  deleteAnthropicKey: () => ipcRenderer.invoke('delete-anthropic-key'),

  // macOS permission checking — reads AutoQA.app TCC status via systemPreferences
  checkPermissions: (): Promise<{ screen_recording: boolean; accessibility: boolean }> =>
    ipcRenderer.invoke('check-permissions'),

  // Opens System Preferences → Screen Recording so the user can grant access.
  requestScreenRecording: (): Promise<boolean> =>
    ipcRenderer.invoke('request-screen-recording'),

  // Opens System Preferences → Accessibility (prompts if not yet decided).
  requestAccessibility: (): Promise<boolean> =>
    ipcRenderer.invoke('request-accessibility'),
});

