# Codex Notes

## Site voice

Write like a thoughtful host: warm, specific, and quietly playful. Give each page a distinct purpose, and make the next step easy to recognise. Use British English, sentence case, and natural contractions.

Keep invitations short. Save practical details for where people need them. Buttons describe their action; errors say what happened and how to recover. Use personality in introductions and small moments of discovery, with plain language for sign-ups, consent, and scoring rules.

Avoid repeating table and discovery metaphors in every section. Don’t promise a seat, attendance, or a greeting that the data doesn’t establish. A missing logged play means “No plays logged”, not “Never played”; activity counts don’t establish winning skill. Keep game titles, published descriptions, event details, league rules, and consent meanings factual.

## Search indexing

Keep admin pages out of search. Serve every `/admin` page with a `noindex, nofollow, noarchive` robots meta tag in the generated HTML and exclude it from the public sitemap. Keep these routes crawlable so search engines can read the `noindex` tag. Cover new admin routes in `scripts/verify-seo.mts`.

## Visitor stats

Do not trigger the public visitor counter while testing.

The site skips visitor tracking automatically on `localhost`, `127.0.0.1`, and `::1`.

When testing the live GitHub Pages URL in Codex's browser, opt that browser out once with either:

```js
localStorage.setItem('saujana_skip_visitor_stats', '1')
```

or open the site with:

```text
?skipStats=1
```

The query parameter stores the same local opt-out flag for future visits in that browser.
