# Bertrand’s paradox

An interactive comparison of three ways to choose a random chord, by David Freeborn.

- [Website](https://www.davidpeterwallisfreeborn.com/fun/bertrands-paradox/)
- [GitHub Pages](https://davidfreeborn.github.io/bertrands-paradox/)

Choose independent uniform endpoints, a uniform point along a radius with uniform orientation, or a midpoint uniformly over the disc’s area. At the equilateral-triangle threshold, the exact probabilities are 1/3, 1/2 and 1/4.

Four views show chords, midpoints, the latest construction, or chords coloured by length. Controls support continuous sampling, a single step, batches, reset and adjustable thresholds. Every sample remains rendered up to 100,000 per method. The page includes derivations and exact/empirical midpoint-distance histograms.

## Develop

Use Node.js 22.12 or newer (CI uses Node.js 24).

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

The local development route is /bertrands-paradox/. GitHub Actions checks the source, runs the nine mathematical tests, builds the site and publishes it to GitHub Pages on pushes to main.

## Source and maintenance

This standalone edition was extracted from [the website source](https://github.com/DavidFreeborn/davidpeterwallisfreeborn.com), commit 3b9d2c1. The mathematical model, client renderer and visualisation styles are unchanged. The standalone shell bundles the same fonts and footer assets, uses a project-relative asset base, and links back to the website’s Interactive Tools page. No analytics are included in this edition. The website is the canonical URL.

The website’s native Astro route remains in its own repository. When changing the instrument, keep src/lib/bertrand.mjs, src/scripts/bertrand.ts, src/styles/bertrand.css and the contents of src/pages/index.astro aligned with that route; preserve the standalone layout imports and absolute return link. The mathematical tests are shared unchanged.

EB Garamond is distributed under its bundled SIL Open Font License in src/assets/fonts/eb-garamond/OFL.txt. See the page’s Model and methodology disclosure for scientific assumptions, display limits and references.
