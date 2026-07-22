# DailyOS

Personal daily operating system for one user (Ish): fitness, nutrition with AI food logging, hydration, prayer times, habits, supplements, and body progress. A single-file React PWA (`index.html`, no build step) deployed to Netlify and installed to an iPhone home screen.

- **Audience:** one person — the owner — primarily on iOS Safari as an installed PWA.
- **Register:** product. Design serves the tool: dense daily-glance surfaces, fast taps, zero onboarding.
- **Visual system:** dark glassmorphism, Syne/Space Grotesk type, switchable accent themes (OG multicolor + monochrome families) driven entirely by CSS custom properties.
- **Non-negotiables:** single-file architecture, localStorage + IndexedDB persistence, no external state or UI libraries, CDN scripts pinned with SRI, all AI calls through `callClaude`/`analyzePhotoWithKey` behind the rate limiter.
