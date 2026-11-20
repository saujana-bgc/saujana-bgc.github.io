# Saujana mobile improvement plan

20 November 2026

Make the site comfortable to use on a narrow phone, in landscape and with the keyboard open. Prioritise joining a gathering, looking up a game, scoring a hand and completing organiser work. Keep the existing artwork, paper and green palette, and Playfair headings. Build on the earlier mobile pass and the site-wide UI and UX review. [Previous mobile plan](mobile-first-design-plan-2026-11-19.md) · [Site-wide review](site-ui-ux-review-and-plan-2026-11-20.md)

## What to fix first

| Priority | Finding | What to do |
| --- | --- | --- |
| P0 | The GitHub Pages deployment for `0ea7e20` failed at the test step. The latest successful run was for `d39a78d`. The mobile organiser selector, payment filters and recap share buttons from the newer commit were absent on the live pages. | The four reliability tests now provide the router mock required by the organiser page. Local checks pass. Ship this fix, then verify the selector, payment filters and share buttons on production before recording the baseline for new changes. [Failed Pages run](https://github.com/saujana-bgc/saujana-bgc.github.io/actions/runs/44746842169) · [Previous successful run](https://github.com/saujana-bgc/saujana-bgc.github.io/actions/runs/44742985484) |
| P1 | In the Calculator at 568 × 320, the first tile started 703 px down the page. After entering 5 han in the other mode, the payment panel took 112 px of the 320 px viewport. | Bring the first tile above the fold on a typical portrait phone. In short landscape, shorten the path to the tiles and collapse the payment panel to a one-line summary or place it inline. Keep the full breakdown one tap away. |
| P1 | The Riichi Open organiser's check-in checkboxes measured 20 × 20 CSS px in the mobile roster. | Make each labelled area tappable across a larger row, distinct from adjacent controls. Preserve save feedback and show which player a failed save belongs to. |
| P1 | The live Clocktower retelling started about 677 px down at 320 × 568. The organiser's draft action row measured 62 px tall at that width with one game loaded. | Bring the latest story closer to its title and keep sharing secondary. In the editor, keep save feedback visible and let the action row move into the form on short screens or when the keyboard would cover a field. |

Live pages were inspected in Chromium touch emulation at 320 × 568 and 390 × 844. The 13 public routes, five organiser routes and 404 views had no document-level horizontal overflow in the observed states. Organiser requests used synthetic fixtures. Both legacy redirects resolved, including the old Rules fragment. The Calculator received a separate landscape pass. Native keyboards, assistive technology and transaction recovery need their own checks.

## Implementation order

1. **Restore the release and align shared controls.** Do P0 first. Then align page gutters, focus styles, action sizes and heading offsets across both layouts. Keep the public drawer and organiser selector. Make drawers and dialogs scroll within the visible viewport, keep their close controls reachable, and return focus to the opener. Use the same rules for sticky footers on the Calculator and organiser editors, including safe areas, landscape and keyboard handling.
2. **Improve the flows people complete on phones.** Start with Gatherings sign-up, the Calculator, both Riichi Open flows, and Clocktower editing. Give each step one clear action. Keep errors beside the fields that caused them, and keep entered values after validation errors, failed writes or a return from the platform file picker. Use the existing short phone layouts as the starting point.
3. **Make long pages easier to browse.** Apply the route changes below to discovery, archives, rules, league and admin lists. Bring search, section links and current results into view sooner. When a comparison genuinely needs a table, contain horizontal scrolling in a labelled region with a visible cue. Use stacked rows when the most important task is reading or editing one record at a time.
4. **Release in small batches.** Use the same fixtures and viewport sizes before and after each batch. Record the result against the commit that actually ships. Smoke check production after each batch. For changes to recap data, confirm that the public endpoint returns the title and story and that both render on the page.

## Public pages

| Page | Mobile change and acceptance check |
| --- | --- |
| **Home** `/` | Keep one clear next gathering action, with date, time and venue together. At 320 × 568, show the complete event button with the long-title fixture. Keep the collage close on a typical phone and preserve its proportions. |
| **Gatherings** `/gatherings/` | Keep date, venue, Directions and sign-up terms together. Preserve the mobile attendee cards. Complete sign-up with the keyboard open and an optional field expanded. A failed save keeps the entered details and retry in view. |
| **Board Games** `/board-games/` | Keep the activity image and make the next gathering, Collection and Play History links easy to spot. Verify that artwork and long labels wrap without crowding the first action at 320 px. |
| **Collection** `/collection/` | Keep search, filters and result count high and put optional suggestions after results. At 390 × 844, show the first row of titles with the default fixture. Keep game details closable when scrolled and return to the selected cover and filters. |
| **Play History** `/playlog/` | Keep search, date filters and reset together. Scan a long game title and open its collection entry, then return to the same history result and filter state. |
| **Riichi Mahjong** `/riichi-mahjong/` | Put the gathering action and recognisable Rules, Calculator, League and Open destinations near the introduction. Check that the links remain clear when text is enlarged. |
| **Riichi Rules** `/riichi-rules/` | Keep format links and an expandable contents near the top. Give wide examples their own contained scrolling. Jump to a linked rule and back to contents with both headings visible below the header. |
| **Riichi Calculator** `/riichi-calculator/` | Keep mode and player count near the first input. Let the payment summary yield room to input and the keyboard. Complete tile and han/fu hands in portrait and landscape, then open the breakdown, copy a result and undo a change. |
| **Riichi League** `/riichi-league/` | Keep season, week and entry status beside their controls. Make rank, player and total readable at a glance. Submit and edit a table with long names and negative scores, including a failed save that retains the inputs. |
| **Riichi Open** `/riichi-open/` | In an active event, keep the hold deadline and next step together. Verify camera or file selection, a long filename, expired holds and upload retry. In a completed event, keep the winner and final standings easy to find and compare. |
| **Clocktower overview** `/only-blood-in-the-clocktower/` | Keep the next gathering action near the event facts. Check that the external sign-up and internal gathering paths each make their destination clear and that the archive remains easy to reach when there is no date. |
| **Clocktower recaps** `/only-blood-in-the-clocktower/recaps/` | Let long recap titles take the available width and move share controls to their own row when space is tight. Keep retellings visible and make roster and photos easy to reach. Open a shared link to the second game in a populated recap and confirm its heading and story are visible. |
| **Birthday Club** `/birthday-club/` | Keep month and day readable in full, including 29 February. Place the consent choice beside its explanation. Test both consent choices, failed save and confirmation focus on a phone. |

## Organiser pages

| Page | Mobile change and acceptance check |
| --- | --- |
| **Sign-in and authenticator** | Keep username and password autofill, code paste and the manual setup key usable with the keyboard open. Handle an invalid code without losing focus. After sign-in from a direct link, return to its requested page and section. |
| **Dashboard** `/admin/` | Keep the organiser page selector above the workspace and make the first destination visible on a short phone. Verify selection and navigation to each of the four modules without wrapping desktop tabs into the phone layout. |
| **Birthday Club calendar** `/admin/birthday-club/` | Keep the upcoming agenda first and the full calendar in its disclosure. Show the recorded greeting choice beside each name. Check multiple birthdays on one date, long names, year changes and leap-day entries. |
| **Clocktower organiser** `/admin/only-blood-in-the-clocktower/` | Make each game's settings, roster, retelling and photos easy to reach from its summary. While typing in a long retelling, keep the active field visible above the keyboard. With two games, upload a photo, retry a failed save, preview the exact title and story, and publish using test data. |
| **Riichi Open organiser** `/admin/riichi-open/` | Keep the next action, payment queue and check-in easy to find. Expand the tap area for each roster choice and keep table number, seat and player visible during score entry. Use a 16-player fixture to verify payment review, score correction and certification, including failed saves. |
| **Visitor names** `/admin/visitors/` | Keep the date jump, date counts and retry easy to find. Verify a full seven-day fixture with 40 long names and confirm that selecting a date lands on its visible heading. |

## Recovery routes

- **404**, including direct `/404.html` and an unknown URL. Put Home and Gatherings above the fold at 320 × 568 and verify both links.
- **Birthday calendar redirect** `/birthday-club-calendar/`. Open it signed out and confirm the sign-in flow returns to the organiser calendar.
- **Old Riichi Rules** `/riichi-open/rules/`. Preserve mapped section links and confirm the corresponding heading clears the sticky header.

## Release criteria

- **Sizes and layout.** Check every route at 320 × 568 and 390 × 844. Also check key flows at 360 px, 430 px, 568 × 320, 844 × 390 and tablet and desktop breakpoints. Keep page-level horizontal scrolling at zero. Check long names, larger text, zoom, reduced motion and locally scrolling tables.
- **Touch and focus.** Aim for 44 × 44 CSS px hit areas for primary and frequent actions. Check WCAG 2.2 AA reflow, focus visibility, target size and contrast. On iPhone Safari and Android Chrome, open the keyboard, scroll and rotate during sign-in, sign-up, receipt upload, scoring and recap editing. Use VoiceOver and TalkBack to check labels, focus return and announcements. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **States and recovery.** Exercise loaded, loading, empty and error states with realistic fixtures. Use synthetic organiser data and verify the exact public result for test publication. Check that a retry preserves form values or browsing context and that a wide dialog never hides its close or confirmation action.
- **Automation and production.** Extend the existing responsive script with fixture-driven checks for the new interactions, including the organiser menu, check-in targets, short landscape payment panel and published recap text. Run static generation and the existing deployment checks. Compare Home and Recaps image bytes and layout shift against the same baseline profile. Confirm the successful Pages run matches the intended commit and use the visitor stats opt-out for live smoke checks. [Responsive script](../scripts/verify-responsive.mjs) · [Site conventions](../CODEX.md)

## First implementation pass · 20 November 2026

- Fixed the failing reliability-test setup by providing the mocked router used by the Riichi Open organiser page.
- Enlarged the mobile check-in row targets while keeping the checkboxes visually compact.
- Added a short-landscape Calculator layout that makes more room for tile entry and reduces the payment summary. The full breakdown stays available.
- Passed all 149 unit tests, type checking, static generation, SEO verification and the Chromium responsive check across 20 generated routes, the custom 404 and its missing-route fallback at 11 viewport sizes.
- The update is local. Production smoke checks, physical phones, native keyboards, VoiceOver and TalkBack remain pending.
