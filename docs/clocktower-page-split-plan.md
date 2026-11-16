# Clocktower Overview and Recaps

Create two public pages and give each its own entry in the Clocktower menu.

| Menu label | URL | Page title | Main action |
| --- | --- | --- | --- |
| Overview | `/only-blood-in-the-clocktower/` | Blood on the Clocktower | Find the next gathering and open its sign-up details |
| Recaps | `/only-blood-in-the-clocktower/recaps/` | Clocktower Recaps | Browse past gatherings or open a specific recap |

## 1. Make the current URL the Overview

- Keep the Clocktower illustration and the short explanation of hidden roles, clues and finding the Demon. Use the shared public page heading and preserve the Clocktower palette.
- Put the next gathering near the top. Show the date, time and venue when available. Keep Directions, event-specific notes and the existing hand-off to Gatherings or the published sign-up link.
- Keep **Your first game** with the Storyteller explanation, advice for solo visitors and the official how-to-play link. Keep the existing `#next-gathering` and `#what-to-expect` anchors.
- Add a visible **Browse recaps** link beside the gathering and first-game links. Point it to the Recaps page. Move the list of past sessions, filters and statistics to Recaps.
- Preserve loading, no upcoming date, and calendar unavailable states. Keep a retry action for failures and a link to the full Gatherings calendar.

## 2. Move the archive to Recaps

- Move the existing public page into `pages/only-blood-in-the-clocktower/index.vue` and put the archive at `pages/only-blood-in-the-clocktower/recaps.vue`. Follow the same site navigation, heading and spacing conventions on both pages.
- Start Recaps with a short introduction and put the archive controls directly below it. Keep **Clocktower overview** near the title for visitors looking for the next gathering.
- Preserve the latest recap treatment, newest-first ordering, year and script filters, result count, three sessions per page, and pagination. Keep loading, retry, empty archive and no-filter-match states distinct.
- Move retellings, outcomes, characters, player display names, notes, photo disclosures, tally and character icon credits with the archive. Preserve existing public-name handling and approved-photo display. Keep publisher attribution wherever the relevant artwork or game content appears.
- Keep the existing `session-<id>` and `game-<id>` element IDs. Use a sensible heading order under the new page title so session headings and game headings remain clear to keyboard and screen reader users.

## 3. Preserve the next-gathering rules

The Overview currently combines community event records with published Clocktower sessions. Published sessions can carry sign-up details and first-timer notes. A matching result also takes a completed same-day gathering out of the upcoming list.

- Reuse the existing public data and selection rules for the split. Keep Kuala Lumpur date handling, date and venue matching, and the precedence for an explicit session sign-up link. Keep announcements without results eligible as upcoming. A recap published early must still leave a future gathering visible.
- Isolate the shared session classification and upcoming selection where needed so both pages interpret a published session consistently. Recaps should load the archive without requesting the community calendar. Overview can initially reuse the existing public session response for scheduling while rendering only the event information it needs.
- Handle a failed session request independently of a failed calendar request. If the Overview can still show a future community event, retain it and its calendar link. If both sources fail, show the unavailable state and offer a retry.
- Keep organiser publishing, access controls, and public-versus-draft visibility on the existing data path.

## 4. Move links without losing shared destinations

- Keep a visit to the existing plain URL on Overview. When it carries a legacy `?session=<id>` or `?game=<id>` query, send the visitor to Recaps with the original query intact.
- Send legacy `#clocktower-archive`, `#session-<id>` and `#game-<id>` links to Recaps too. GitHub Pages serves static files and URL fragments are available only in the browser, so handle this on initial client navigation and when the route is reached from within the site. Replace the history entry so Back works without bouncing through the old URL.
- On Recaps, resolve the target after the session data loads. Clear filters that would hide it, select the page containing it, scroll to the target and move keyboard focus to its heading. Preserve the current friendly message for a missing or unpublished target. Update any code or documentation that generates public recap links to use the new URL.
- Change **Clocktower** into a menu group with **Overview** and **Recaps** in the shared desktop and mobile navigation. Mark the active child and parent the same way as the Board Games and Riichi Mahjong groups. Keep **Play History** as a separate top-level item.
- Keep the homepage activity card and footer Clocktower link pointed at Overview. Update the Clocktower link from Play History to point straight to Recaps, with the label **Browse Clocktower recaps**.

## 5. Verify and release together

1. Update the Overview metadata and register Recaps in `utils/siteSeo.ts`. Run the static generation and existing SEO verification. Both pages should have their own title, description, canonical URL, and sitemap entry.
2. Open both pages on desktop and phone widths. Navigate using the two menu entries, the Overview’s recap link, the Recaps page’s Overview link, and the Play History link. Check focus, menu active states and keyboard operation.
3. Check Overview with an upcoming date, no date, a calendar error, and an archive error. Adapt the existing Clocktower regression tests to cover future recaps, completed same-day events, and announcements without results after the split.
4. Check Recaps with multiple pages, script and year filters, no matching results, an empty archive, an error and a retry. Open approved photos and confirm unpublished sessions stay hidden.
5. Verify fresh loads and in-site navigation for both old and new recap links, including a game on a later page, a missing target, and legacy fragment-only links. Confirm Back returns to the page the visitor came from.
6. Release the two routes, navigation changes and legacy link handling together so existing shared links work as soon as the archive moves.
