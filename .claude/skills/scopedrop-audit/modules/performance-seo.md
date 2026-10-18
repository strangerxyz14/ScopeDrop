# Module: performance-seo

Goal: check load performance and whether search engines can index the content. Daily return visits depend on discovery, and discovery depends on SEO.

## Performance

1. **Bundle analysis.** Use the build output from `repo-build`. If it is unavailable, use `du -sh dist/assets/*` on an existing `dist/`.
   - Report the total JS size and the total CSS size.
   - Report the largest chunk. Above 500 KB minified is P1, and 250–500 KB is P2.
2. **Code splitting.** Check whether routes are lazy-loaded (`React.lazy`, `import()`). If every page sits in the main chunk, that is P2.
3. **Heavy dependencies.** Inspect the `package.json` dependencies for these:
   - `moment`
   - Full `lodash`
   - Multiple chart libraries
   - Multiple icon packs
   - Large UI kits that are only partially used

   For each, check that it is actually imported in `src`. An unused dependency is P2.
4. **Images.**
   - Check that `<img>` elements below the fold use `loading="lazy"`.
   - Check that they declare `width` and `height` (or `aspect-ratio`) to prevent layout shift.
   - Check the format of the generated images. FLUX output stored as PNG instead of WebP/AVIF is a P2 finding.
   - Check whether any images are served through a resizing layer, or whether full 1536×864 images are used for thumbnails.
5. **Fonts.**
   - Check whether fonts are self-hosted or loaded from Google Fonts.
   - Check for `font-display: swap` and preconnect hints.
   - Count the number of font weights loaded. Loading more than 6 weights in total is P2.
6. **Data fetching.**
   - Find N+1 query patterns, meaning per-card fetches inside lists.
   - Find unbounded `select('*')` without `.limit()` on list views. These are P1 at scale.
   - Check for missing pagination.

## SEO and indexability

7. **Rendering model.** Determine whether the app is a client-only SPA, or whether there is pre-rendering or SSR. Check for a prerender plugin, Workers HTML rewriting, or a static generation step.
   - If it is client-only, the `/events/[slug]` SEO goal from Phase 2 is not met. Report this as P1 in the "Baseline divergences" section.
8. **Meta tags.**
   - Check whether per-route `<title>`, `meta description`, and canonical tags are set (`react-helmet-async` or equivalent).
   - Check for Open Graph and Twitter card tags on article, event, and company pages.
9. **Structured data.** Check for JSON-LD on the detail pages: `Event` schema on event pages, `NewsArticle` on article pages, and `Organization` on company pages.
10. **Crawl assets.**
    - Check for `robots.txt` and `sitemap.xml` in `public/`, or a generated sitemap.
    - Check whether the sitemap includes the dynamic slugs.
11. **URLs.**
    - Check that the slugs are human-readable and stable.
    - Check that the Workers SPA fallback config handles deep links without returning 404 (`not_found_handling` in `wrangler.jsonc`).
