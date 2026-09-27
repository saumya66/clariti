// Central place for externally-configurable links.
// Set these in landingsite/.env (see .env.example).

export const BOOK_DEMO_URL: string =
  import.meta.env.PUBLIC_BOOK_DEMO_URL || 'https://calendly.com/claritihq/30min';

export const DEMO_VIDEO_URL: string =
  import.meta.env.PUBLIC_DEMO_VIDEO_URL || 'https://www.youtube.com/embed/yZmDxbxCm2w?enablejsapi=1';

export const NAV_LINKS = [
  { label: 'The Problem', href: '#problem' },
  { label: 'The Solution', href: '#solution' },
] as const;
