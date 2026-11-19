# Nuxt 4 directory structure migration

The app already pins Nuxt 4.6.4. Nuxt currently resolves the repository root as the app source because the Vue entry point and its directories live there. Adopt the default `app/` layout in one pull request and preserve the site’s routes, rendered content, and GitHub Pages deployment. [Nuxt directory structure](https://nuxt.com/docs/4.x/directory-structure) · [Nuxt upgrade guide](https://nuxt.com/docs/4.x/getting-started/upgrade#new-directory-structure)

## Target layout

```text
app/
  app.vue
  app.config.ts
  assets/
  components/
  composables/
  layouts/
  pages/
  plugins/
  utils/
shared/
  siteSeo.ts
server/
  api/
  routes/
public/
test/
  unit/
  sql/
nuxt.config.ts
tsconfig.json
```

Keep `scripts/`, `docs/`, `supabase/`, `database/`, `.github/`, and the npm files at the root. Use the existing Nitro routes, public assets, test runner, and CI commands.

## Migration sequence

1. **Record the baseline.** Use the Node and npm versions pinned in `.nvmrc` and `package.json`. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run generate`, and `npm run verify:responsive` against the current layout. Install Playwright Chromium as CI does. Record the test count and capture the generated HTML route list and sitemap URLs for comparison.
2. **Move the Vue app as a unit.** Move `app.vue`, `app.config.ts`, and the seven app directories into `app/`. Preserve the relative page paths, nested component names, and `.client.js` suffix on the intersection-fade plugin. Let Nuxt discover the default `app/` source directory. Existing app-local `~/utils/…` and `~/assets/…` imports can retain their spelling, including the global CSS entry in `nuxt.config.ts`. Confirm Tailwind still scans the moved Vue files and Nuxt UI picks up `app/app.config.ts`. [Nuxt upgrade guide](https://nuxt.com/docs/4.x/getting-started/upgrade#new-directory-structure)
3. **Move the SEO registry to `shared/siteSeo.ts`.** Keep `app.vue`, the sitemap route, the prerender configuration, and `scripts/verify-seo.mts` on the same registry. Use Nuxt’s `#shared/siteSeo` alias for the Vue app and Nitro, and explicit relative imports from `nuxt.config.ts` and the standalone SEO script. Keep feature-specific helpers with their callers under `app/utils/`. [Nuxt shared directory](https://nuxt.com/docs/4.x/directory-structure/shared)
4. **Move the tests and update source paths.** Move `tests/*.test.mts` into `test/unit/` and the SQL smoke scripts into `test/sql/`. Change the npm test command to `tsx --test test/unit/*.test.mts`. Update both relative imports and `new URL(…, import.meta.url)` paths in the tests, including those that read moved Vue files and those that still target root-level code. Recheck the generated app TypeScript include and exclude lists before removing exclusions made redundant by the narrower `app/` source directory. Update paths in `CODEX.md` and relevant Markdown references. [Nuxt test directory](https://nuxt.com/docs/4.x/directory-structure/test)

## Acceptance checks

- Run `npm ci`, `npm run typecheck`, and `npm test` on a fresh checkout. Check that Nuxt’s generated app config resolves `~/` to `app/`, and that the test runner discovers the same tests as the baseline.
- Run `npm run generate` and compare the generated page routes and sitemap URLs with the baseline. The bundled SEO check must pass, including canonical URLs, structured data, and admin `noindex`. Verify that `/riichi-rules/` contains its Markdown-rendered tournament rules in the static HTML and that `/riichi-open/rules/` and the linked `/riichi-open/rules/riichi-open-i.md` both load. Check the Pages artifact at `.output/public`.
- Run `npm run verify:responsive` against the generated output. On the local preview, check the home page, collection search, calculator tile entry, admin sign-in screen, and a missing URL. Check that styles, fonts, and the standalone `404.html` load, and that the browser can request `/sw.js` and `/version.json` at their existing URLs.
- Confirm CI passes on the pull request. If deployment reveals a regression, revert the migration commit and regenerate the prior Pages artifact.
