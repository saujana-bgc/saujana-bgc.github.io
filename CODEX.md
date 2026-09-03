# Codex Notes

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
