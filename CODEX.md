# Codex Notes

## Site voice

Write as Saujana, a thoughtful host: warm, specific, and quietly playful. Keep Mika as the invisible voice. Never name her, introduce a narrator or sign public copy on her behalf. Use British English, sentence case, natural contractions, and “we”, “our” and “you” where they sound natural.

Make newcomers and regulars feel equally welcome. Offer a simple way to join, watch or ask for help. Keep invitations short and practical details beside the decision they support. Use a light touch of humour or curiosity when it suits the activity. Keep buttons clear. Errors say what happened and how to recover. Use plain language for sign-ups, consent and scoring rules. Avoid corporate clichés, exaggerated enthusiasm, repeated metaphors, childish expressions and excess emojis.

Keep game titles, published descriptions, event details, league rules and consent meanings factual. Don’t promise a seat, attendance or a greeting that the data doesn’t establish. A missing logged play means “No plays logged”, not “Never played”; activity counts don’t establish winning skill. Describe images for what they show without naming Mika. Keep SEO terms natural and navigation and controls direct.

Prefer an invitation over an instruction where it stays clear. For example, “Come watch a hand and ask us how it works” can welcome a new player, while “Save your place” only fits when the action really reserves a place. Say “You’re on the sign-up list” for a saved gathering sign-up. Reserve “Your place is confirmed” for confirmed tournament entries. A quiet playful line belongs in an introduction, while a form label, payment term or rule should be precise.

For new visitor copy, offer one useful next step such as “Find a gathering”, “Watch a hand first” or “We’ll help you find a table”. Keep Board Games relaxed, Riichi Mahjong thoughtful, Blood on the Clocktower lightly mysterious and Birthday Club affectionate. Use “No plays logged” for an empty play record. Event descriptions should name the activity, say what someone can try, then give the verified logistics. Don’t promise attendance, an available place or a public greeting unless the saved state confirms it.

## Responsive text

Let ordinary copy and short callouts use the space their container provides. Give long articles and guides an intentional reading width. Use balanced wrapping for short headings where it helps. Reserve forced breaks and no-wrap styles for cases where the content needs them. Follow the [responsive text wrapping plan](docs/responsive-text-wrapping-plan.md) when changing layouts or adding pages.

## Visual consistency

Align page content to the shared width, gutter and spacing tokens in `app/assets/css/main.css`. Reuse the established action, focus and status patterns for equivalent tasks. Keep event-specific accents and compact scoring controls scoped to their pages. Follow the [visual polish and predictability plan](docs/visual-polish-and-predictability-plan.md) when adding or revising a page.

Use the Saujana paper, near-white, green and brass palette with Playfair Display for public display headings and the existing sans serif for body text and controls. Keep body copy at least 16px and recurring controls and essential metadata at least 14px. Use photo-led introductions for discovery pages, bring tools and search close to the top of utility pages, and give long reference content a comfortable reading width. Show game covers in consistent square frames and keep tournament artwork in its portrait ratio. Use tabular figures for dates and scores. Follow the [boutique visual design plan](docs/boutique-visual-design-plan.md) for page-specific direction.

Respect `prefers-reduced-motion` in both CSS and JavaScript initiated scrolling or animation. Give meaningful loading, success and error feedback a stable, nearby status style. Review populated, loading, empty and error states when they apply.

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
