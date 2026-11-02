/**
 * Resolve files from Vite's public directory in both development and the
 * packaged Electron app. Vite serves public files from `/` during development,
 * while the packaged app needs paths relative to dist/index.html.
 */
export function publicAssetUrl(filename: string): string {
  return `${import.meta.env.BASE_URL}${filename.replace(/^\/+/, '')}`;
}
