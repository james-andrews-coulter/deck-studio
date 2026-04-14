# Deploy

Deck Studio is a static bundle. Anything that serves static files works. This repo is set up for Vercel because the CI and custom domain use it.

## Hosted instance

The maintainer's instance lives at **[`cards.jamesandrewscoulter.com`](https://cards.jamesandrewscoulter.com)**. It's deployed on Vercel, wired to this GitHub repo — every push to `main` rebuilds and promotes.

Project dashboard: https://vercel.com/james-projects-2c337c4f/deck-studio

## DNS for `cards.jamesandrewscoulter.com`

The domain `jamesandrewscoulter.com` is on **Cloudflare** (not Vercel nameservers), so the custom subdomain needs one manual DNS record. Add it in the Cloudflare dashboard:

| Type | Name | Content | Proxy status | TTL |
|---|---|---|---|---|
| `A` | `cards` | `76.76.21.21` | **DNS only** (grey cloud) | Auto |

Set the proxy status to **DNS only** (grey cloud, not orange) so Vercel can issue the TLS certificate. You can switch it to proxied later if you want Cloudflare's cache / WAF in front.

After the record propagates (usually < 1 minute), Vercel will auto-issue a certificate and the site will resolve at `https://cards.jamesandrewscoulter.com`.

To verify:

```bash
dig cards.jamesandrewscoulter.com +short          # should return 76.76.21.21
curl -sI https://cards.jamesandrewscoulter.com/   # should return HTTP/2 200
```

## Re-deploying from a local clone

Already-linked (`.vercel/project.json` in the repo is gitignored — each contributor links once):

```bash
vercel link --yes --project deck-studio
vercel --prod --yes
```

In most cases you don't need to do this — pushes to `main` auto-deploy through the GitHub ↔ Vercel integration.

## Hosting somewhere else

`npm run build` emits `dist/`. Upload that directory to any static host:

- **Cloudflare Pages**: point at this repo, set build command to `npm run build`, output directory to `dist`.
- **Netlify**: same, `npm run build` + `dist`.
- **S3 + CloudFront**: sync `dist/` to an S3 bucket behind a CloudFront distribution.
- **Your own nginx**: `rsync -a dist/ server:/var/www/deck-studio/` and point the vhost at it.

No environment variables. No backend. No database. Just static files.
