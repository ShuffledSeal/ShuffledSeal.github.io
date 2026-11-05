# Æther Grand Tour — Premium Gameplay Build

This build is a substantial playable upgrade, not a finished or commercially validated £90 release.

## What changed
- Expanded Grand Tour action gameplay with additional combat and boss mechanics.
- New richer standalone trial experiences and mouse-responsive steering.
- Revised premium presentation and enhanced visual assets.
- Existing observatory, progression, and locally stored saves remain part of the static-site project.

## Deployment
Æther lives at the **`/aether/` path** of the `ShuffledSeal.github.io` site, which GitHub Pages publishes from the root of the `main` branch. Keep these files inside the `aether/` directory — **do not copy them over the repository root**, or you will overwrite the root portfolio site (root `index.html`, `portfolio.html`). Commit and push to `main` to deploy; no bundler or backend is required. Hard-refresh after pushing, since Pages/CDN caching can lag a commit. Test locally with `python3 -m http.server 4173` from this folder and open `http://localhost:4173`.

## Quality caveat
Static syntax checks and limited browser smoke tests have been performed. Full balancing, accessibility auditing, extended playtesting, and commercial price validation remain necessary. Do not advertise this as a fully tested £90 release yet.
