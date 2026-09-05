# Tile estimate (wall coverage)

Browser SPA for Pre-start tile estimating: enter wall dimensions and openings, choose tile size/kind/layout, get required tile count and Extra over labor.

Public URL: https://tile-estimate.pages.dev/

Repository: https://github.com/sunfloweratnight/tile-estimate

## Deploy (Cloudflare Pages + Git)

Production deploys from **GitHub `master`** via Cloudflare Pages.

### One-time: connect Git in the dashboard

1. Open [Cloudflare Dashboard → Workers & Pages → tile-estimate](https://dash.cloudflare.com/?to=/:account/pages/view/tile-estimate)
2. **Settings → Builds & deployments → Connect to Git** (or Create / reconnect)
3. Authorize GitHub and select `sunfloweratnight/tile-estimate`
4. Build settings:
   - Production branch: `master`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable (if needed): `NODE_VERSION=20`
5. Save — pushes to `master` trigger production deploys

### Day-to-day

```bash
git push origin master
```

### Emergency / local deploy (no Git build)

```bash
npx wrangler login   # first time only
npm run deploy       # build + wrangler pages deploy
```

Prefer Git-connected deploys so dashboard history matches commits.

## Stack

- Vite + React + TypeScript
- Zustand store
- Canvas 2D editor + pattern preview
- Web Worker estimate pipeline
- `polygon-clipping` for opening subtraction (robust boolean ops)

## Provisional masters

Loss: Std 5%, R 8%, S 10%, H/B 15%. Extra over = effective area × tier rate.
