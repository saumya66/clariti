import { createRouter, createHashHistory, createBrowserHistory } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Use hash-based history in packaged Electron (file:// protocol doesn't support
// path-based routing). In dev, Vite serves via http so browser history works fine.
const isElectronPackaged =
  typeof window !== 'undefined' &&
  window.location.protocol === 'file:';

const history = isElectronPackaged ? createHashHistory() : createBrowserHistory();

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  history,
});

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
