import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';

export default defineConfig({
  // Relative asset paths are required for Electron's file:// protocol.
  // With the default '/', /assets/... resolves to the filesystem root and
  // scripts fail to load silently, leaving the page non-interactive.
  base: './',
  plugins: [
    tailwindcss(),
    TanStackRouterVite(),
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
