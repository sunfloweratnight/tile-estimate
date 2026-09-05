# Tile estimate (wall coverage)

Browser SPA for Pre-start tile estimating: enter wall dimensions and openings, choose tile size/kind/layout, get required tile count and Extra over labor.

## Deploy (Cloudflare Pages)

```bash
npx wrangler login   # first time only (browser)
npm run deploy       # build + wrangler pages deploy
```

Public URL: https://tile-estimate.pages.dev/

## Stack

- Vite + React + TypeScript
- Zustand store
- Canvas 2D editor + pattern preview
- Web Worker estimate pipeline
- `polygon-clipping` for opening subtraction (robust boolean ops)

## Provisional masters

Loss: Std 5%, R 8%, S 10%, H/B 15%. Extra over = effective area × tier rate.
