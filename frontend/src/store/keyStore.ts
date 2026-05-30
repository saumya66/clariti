import { create } from 'zustand';

interface KeyStore {
  anthropicKey: string | null;
  hasKey: boolean;
  setKey: (key: string | null) => void;
  loadFromElectron: () => Promise<void>;
}

export const useKeyStore = create<KeyStore>((set) => ({
  anthropicKey: null,
  hasKey: false,

  setKey: (key) => set({ anthropicKey: key, hasKey: !!key }),

  loadFromElectron: async () => {
    const key = (await window.electronAPI?.getAnthropicKey?.()) ?? null;
    set({ anthropicKey: key, hasKey: !!key });
  },
}));
