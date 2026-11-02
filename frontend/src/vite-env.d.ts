/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CLOUD_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electronAPI: {
    getBackendUrl: () => Promise<string>;
    platform: string;
    requestUserAttention: () => Promise<void>;
    checkPermissions: () => Promise<{ screen_recording: boolean; accessibility: boolean }>;
    requestScreenRecording: () => Promise<boolean>;
    requestAccessibility: () => Promise<boolean>;
  };
}
