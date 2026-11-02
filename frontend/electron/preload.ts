import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  platform: process.platform,
  requestUserAttention: () => ipcRenderer.invoke('request-user-attention'),

  // macOS permission checking — reads Clariti.app TCC status via systemPreferences
  checkPermissions: (): Promise<{ screen_recording: boolean; accessibility: boolean }> =>
    ipcRenderer.invoke('check-permissions'),

  // Opens System Preferences → Screen Recording so the user can grant access.
  requestScreenRecording: (): Promise<boolean> =>
    ipcRenderer.invoke('request-screen-recording'),

  // Opens System Preferences → Accessibility (prompts if not yet decided).
  requestAccessibility: (): Promise<boolean> =>
    ipcRenderer.invoke('request-accessibility'),
});
