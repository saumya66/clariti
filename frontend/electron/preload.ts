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

  // Calls CGRequestScreenCaptureAccess() via node-mac-permissions in the main process.
  // This adds AutoQA.app to System Preferences → Screen Recording and shows the
  // macOS permission dialog. Works on non-notarized apps on macOS 14+, unlike
  // desktopCapturer.getSources() which no longer triggers TCC in that case.
  requestScreenRecording: (): Promise<boolean> =>
    ipcRenderer.invoke('request-screen-recording'),

  // Opens System Preferences → Accessibility (prompts if not yet decided).
  requestAccessibility: (): Promise<boolean> =>
    ipcRenderer.invoke('request-accessibility'),
});

