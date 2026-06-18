# Clariti Landing Site — Hero Design Spec

**Date:** 2026-06-18  
**Scope:** `landingsite/` folder in the Moonshot monorepo — marketing/discovery site for Clariti

---

## Goal

A public marketing site that helps people discover Clariti. SEO-first, visually polished, deployed independently from the desktop app.

---

## Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Astro 5 | Best-in-class static HTML output for SEO |
| UI components | React islands (`@astrojs/react`) | Enables React Bits animations without making the whole page a SPA |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` | Consistent with existing `frontend/` |
| Sitemap | `@astrojs/sitemap` | Auto-generates `sitemap.xml` |
| Deployment | Vercel (root dir: `landingsite/`) | Simple subfolder deploy |

---

## Hero Section Design

### Headline
```
It Sees. It Thinks. It Asks. It Judges.
Just like your QA would.
```

- `<h1>` in static Astro HTML for SEO
- BlurText animation (CSS-based, no GSAP) plays over it after hydration — words blur in with staggered delay

### Background
Dark (`#09090b`) with 3 floating aurora blobs:
- Indigo (`#6366f1`) — top-left
- Violet (`#8b5cf6`) — mid-right
- Blue (`#3b82f6`) — bottom-center

Each blob is a radial gradient div with `filter: blur(80px)` and a floating CSS keyframe animation.

### Body copy
> Clariti is an AI-native QA agent that sees your app, understands it, and runs tests autonomously — so your team ships faster with confidence.

### CTA
Email input + **"Notify Me at Launch"** button. Client-side success state (no backend yet — to be wired to Loops/Resend/Buttondown).

### Nav
Fixed top bar — "Clariti" wordmark (white) left-aligned, no links.

---

## File Structure

```
landingsite/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── src/
│   ├── styles/
│   │   └── global.css          # Tailwind import + custom keyframes
│   ├── layouts/
│   │   └── BaseLayout.astro    # <head>, OG tags, JSON-LD
│   ├── pages/
│   │   └── index.astro         # "/" — imports Hero island
│   └── components/
│       ├── Hero.tsx             # React island (client:load)
│       ├── Aurora.tsx           # Animated gradient background
│       └── BlurText.tsx         # Word-by-word blur-in animation
```

---

## SEO Strategy

- Static HTML on every page (Astro pre-renders all pages)
- `<h1>` text always present in server-rendered HTML
- Unique `<title>`, `<meta description>`, Open Graph, Twitter Card per page
- JSON-LD `SoftwareApplication` schema on homepage
- `sitemap.xml` via `@astrojs/sitemap`
- `robots.txt` in `public/`
- Fast Core Web Vitals: minimal JS (React only in islands), no blocking scripts

---

## Deployment

Vercel project settings:
- **Root Directory:** `landingsite`
- **Framework:** Astro (auto-detected)
- **Build command:** `npm run build`
- **Output:** `dist/`
