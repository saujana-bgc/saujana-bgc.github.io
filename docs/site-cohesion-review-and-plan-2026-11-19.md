# Saujana site cohesion review and plan

19 November 2026 · Deployed site and repository at `c1e87a2`

The [follow-up plan](#follow-up-plan) covers the gaps still present after the first rollout and voice update.

Saujana already has a consistent visual identity. The Home collage, activity illustrations, green actions and Playfair headings give the pages a shared character. The next improvement is to make routes through the site feel continuous. A visitor should recognise the event, activity or game they were just looking at and know what they can do next.

## What the review found

| Area | Evidence and impact |
| --- | --- |
| **Gathering handoff** | Home and Clocktower both sent visitors to the 21 November gathering, with matching time, venue and directions. The calendar panels still make different choices about loading, retry and alternate actions. Home uses a generic calendar link when loading fails. Clocktower offers a retry for the calendar, but silently ignores an archive request failure even though that feed can supply a future event. [Home](../pages/index.vue) · [Gatherings](../pages/gatherings.vue) · [Clocktower](../pages/only-blood-in-the-clocktower/index.vue) |
| **Location within an activity** | The mobile menu correctly marked Collection and the desktop dropdown marked Riichi Calculator. On desktop, the closed Riichi menu trigger gave little indication of the current section. Clocktower Recaps links back to its overview in the page, while Calculator only names its parent in an eyebrow. A direct link into a tool can leave the relationship between pages unclear. [Public layout](../layouts/default.vue) · [Calculator](../pages/riichi-calculator.vue) · [Recaps](../pages/only-blood-in-the-clocktower/recaps.vue) |
| **Browsing order** | Collection visually places search before “See Just One”, while the featured game button precedes search in the document and keyboard order. The feature also separates search from “Sort and filter”. Play History places its count, contextual links and reset in a different sequence. Collection search and game details worked on mobile, and Escape returned focus to the game. [Collection](../pages/collection.vue) · [Play History](../pages/playlog.vue) |
| **Riichi paths** | The Riichi overview links to Rules twice, and the Calculator, League, Rules and Open pages offer different ways to continue across the section. Open I correctly showed “Event complete” and opened on final standings. The label “Riichi Open” works for the series in the menu, but the overview could make clear that the current destination contains Open I results. [Riichi overview](../pages/riichi-mahjong.vue) · [League](../pages/riichi-league.vue) · [Rules](../pages/riichi-rules.vue) · [Open](../pages/riichi-open/index.vue) |
| **Shared presentation** | The recent refresh established common widths, type, focus and status styles. Board Games and Riichi already share the weekly gatherings action and use `ActivityOverviewFeature`. Nearby link lists, action variants and form feedback still mix page-local conventions. The organiser menu and dashboard also label Clocktower separately in code, even though the rendered labels largely agree. [Shared styles](../assets/css/main.css) · [Activity feature](../components/ActivityOverviewFeature.vue) · [Organiser navigation](../utils/adminNavigation.js) |

## Implementation order

1. **Fix Collection’s browsing order and use it as the archive reference.** Put search and filters together in source and visual order, then put the Just One suggestion below the controls. Keep the result count and reset beside the controls they describe. Apply that same placement to Play History and Clocktower Recaps where equivalent controls exist. Keep Collection’s square covers and virtual sizing, Play History’s dated sessions and Recaps’ story layout. Put any partial data failure next to the feature it affects so people can keep browsing Collection when play statistics are unavailable.
2. **Give each activity a consistent way back and onward.** Use one route grouping for desktop and mobile current-page states. Add a linked parent label to child pages where it helps people arriving from search or a shared link. Apply it to Collection and Play History, the four Riichi destinations and Clocktower Recaps. Use the same destination labels across the menus and overview link lists. Remove the duplicate overview link to Riichi Rules or point the introductory link directly to the relevant format section. Keep the Calculator entry controls high on mobile. Keep “Riichi Open” as the series label and identify Open I where the link leads to that edition.
3. **Make event summaries and fallback actions agree.** Preserve the Home hero collage. Define one presentation order for event facts across its next-gathering panel, Gatherings and Clocktower. Reuse date formatting and link-label logic where the underlying facts match. Keep the event card as the place for attendance terms and sign-up, with a clear exception for external RSVP links. Distinguish checking dates, no dates announced and a failed lookup. Give each view a usable next step in those states. Handle a partial Clocktower source failure without hiding a valid event from the other source or presenting a failed lookup as a confirmed empty schedule.
4. **Reuse the patterns once they work on each page family.** Start with the existing layout tokens, Nuxt UI controls and `ActivityOverviewFeature`. Align overview link lists, archive toolbars and status feedback where they serve the same task. Apply consistent labels and save or retry placement to Gatherings, Birthday Club and organiser modules. Keep the calendar, tile picker, score tables, long-form Rules and the 404 suited to their content. Use the same organiser module labels in the dashboard, menu and page headings. Keep publishing and round certification clearly identified at the point of confirmation.

## Acceptance checks

- **Find and attend.** From Home and each activity overview, reach the right gathering or external RSVP. Compare the same event’s facts at phone and desktop widths. Check upcoming, recent and shared event links around Kuala Lumpur date rollover. Use fixtures for empty calendars, partial failures and sign-up.
- **Browse and return.** Verify that keyboard focus follows visual order in Collection, Play History and Recaps. Search, filter, reset and retry where available. Follow a logged game from Collection to Play History and back. Check focus return and grid position when closing game details. Open a shared Clocktower recap link and check that the intended entry is in view.
- **Orient and act.** Check current route cues in both menus. Open Rules, League, Calculator and Open directly, and verify that the routes onward are clear. Check completed and active tournament states with fixtures, including receipt recovery. Review Birthday Club’s greeting choice and each signed-in organiser module with test data.
- **Check page families together.** Compare wide and narrow layouts, keyboard focus, sticky-header anchors and reduced motion. Run the existing responsive and SEO checks after implementation. Recheck the legacy calendar redirect, the rules fragment redirect and the custom 404.

## Review coverage

Reviewed all 13 public pages and the organiser sign-in at 390 and 1440 CSS px. Opened the missing-page fallback and checked both legacy redirects, including the old Head Bump fragment. Checked the live Home-to-Gatherings link and focus on the linked event after direct navigation, the desktop Riichi menu, Collection search and dialog focus, game details in Play History, the Calculator mode switch and the completed Open I state. Reviewed signed-in organiser views from source. Transactional flows and alternate data states belong in fixture-based verification. The [17 November review](site-cohesion-plan-2026-11-17.md) and [boutique visual plan](boutique-visual-design-plan.md) record the earlier work this plan builds on.

## Implementation record · 19 November 2026

- Reordered Collection in both the document and page layout so keyboard focus reaches search, filters and the result count before the Just One feature. Added clear parent links to Collection, Play History and all four Riichi destinations. Removed the duplicate Rules link from the Riichi overview and named Open I as that overview’s destination.
- Added an explicit current-section treatment to desktop menu groups. Aligned the organiser menu label with the dashboard’s “Clocktower organiser” name.
- Added a retry action when Home’s calendar request fails. Clocktower now checks both its event and archive sources before reporting that no next date is announced, offers retry on an unresolved partial failure, and still displays a valid date from either source.
- Verified the static export and all 13 public SEO entries. The responsive check passed 20 generated routes, the custom 404 and its missing-route fallback at 320, 390, 512, 720, 768, 1024 and 1440 CSS px. The type check passed. Transactional fixture flows and signed-in organiser interactions still require test data.

## Follow-up plan

Reviewed source at `e1503aa` and inspected the local static preview at 390 and 1440 CSS px. The preview covered Home, the Board Games and Riichi overviews, Collection, Play History, Clocktower Recaps and the Calculator. External requests were blocked in the preview. Calendar, sign-up and organiser scenarios below are checks for implementation.

### 1. Make it clear where you are and where to go next

Collection, Play History and the Riichi child pages repeat their activity name as a link and an eyebrow. Clocktower Recaps puts its overview link after the description. In the mobile preview, search starts at 238 px on Collection and 301 px on Play History. The duplicate label uses space above the controls on both pages. [Collection](../pages/collection.vue) · [Play History](../pages/playlog.vue) · [Clocktower Recaps](../pages/only-blood-in-the-clocktower/recaps.vue) · [Riichi Calculator](../pages/riichi-calculator.vue)

- Pilot one compact header on Collection and Play History. Put a single linked parent above the page title, with a short description where it helps. Apply this order to Clocktower Recaps and the four Riichi child pages. Keep the Calculator’s compact spacing so players can reach the controls quickly.
- Derive desktop and mobile current states from the existing navigation destinations. Use the same title for a destination in menus and overview links, with “Riichi Open” for the series and “Riichi Open I” for the edition. Give a directly linked archive, rule or tool an obvious path back to the activity and surface one related destination where it helps the task.
- Check child routes opened directly and with a query or fragment. Confirm that the parent link takes visitors to the overview, the menu shows the right section, and the heading and controls follow the visible keyboard order. [Public layout](../layouts/default.vue) · [Shared styles](../assets/css/main.css)

### 2. Make gathering information agree across pages

Home, Gatherings and Clocktower each format dates locally. Home links to the event card, while Clocktower can link to the event card, all gatherings or an external sign-up. The calendar retry controls now exist on both overview pages. The remaining work is to make the facts, link labels and fallback actions agree. [Home](../pages/index.vue) · [Gatherings](../pages/gatherings.vue) · [Clocktower](../pages/only-blood-in-the-clocktower/index.vue)

- Use shared date formatting for date-only gathering records and one Kuala Lumpur definition of “today” when selecting upcoming events. Display the same date, time and venue for the same record, with compact and full formats suited to each layout. Keep the original Home collage and its next-gathering panel.
- Use “See gathering details” for a link to a specific local event and “Find a gathering” for the calendar. Name the external sign-up action where it goes to another organiser. Keep sign-up terms near the form on Gatherings, with directions alongside the venue.
- Use the same treatment for checking dates, an empty calendar and an unavailable calendar. Keep the partial-source behaviour on Clocktower. Check that the three pages agree when showing the same event, including around Kuala Lumpur midnight, and that a retry or external sign-up reaches its expected destination.

### 3. Make browsing controls and recovery predictable

Collection offers a result count and reset beside search, Play History places context links among its search controls, and Recaps puts the shared-link notice before the filtered count. Collection reloads the whole page when play history fails. Play History already retries the same data request in place. [Collection](../pages/collection.vue) · [Play History](../pages/playlog.vue) · [Clocktower Recaps](../pages/only-blood-in-the-clocktower/recaps.vue) · [Play history loader](../composables/usePlaylogData.js)

- Put search or filters first, then the result count and reset, then any contextual links. Use “Clear search” for a text query and “Reset filters” when restoring defaults. Keep this order in the source and on screen. Preserve each archive’s useful format, including Collection’s covers and virtual scrolling, Play History’s dated groups and Clocktower’s stories and approved photos.
- Use the existing retry from `usePlaylogData` in Collection. Put the error near play statistics and keep search, filters and the current browsing position during the retry. Use the shared status styles to distinguish a failed request, an empty archive and a search with no matches.
- Verify no results, a failed request and successful retry. Follow a game between Collection and Play History and open a shared recap. Check that filters, link destinations and dialog focus behave as expected. Use fixtures for the archive and request states.

### 4. Apply the proven patterns to forms and organiser pages

Board Games and Riichi use identical gathering actions and nearly identical link cards, with styles maintained in each page. The same organiser destinations also appear in separate menu and dashboard lists. This makes small changes easy to miss in one place. [Board Games](../pages/board-games.vue) · [Riichi Mahjong](../pages/riichi-mahjong.vue) · [Organiser navigation](../utils/adminNavigation.js)

- Reuse the existing tokens and Nuxt UI controls for primary actions, secondary actions, link cards and status feedback. Start with the two activity overviews. Apply the same control and feedback patterns to Gatherings, Birthday Club and Riichi Open where the action is equivalent. Keep Clocktower’s accent and the layouts suited to the Calculator, results tables and long rules.
- Put save, retry and validation messages beside their controls. Use distinct wording for a public sign-up entry, a tournament hold, a receipt awaiting review and a confirmed place. In organiser views, distinguish saving a draft, publishing and certifying. Keep one source for repeated organiser module names and routes. [Birthday Club](../pages/birthday-club.vue) · [Riichi Open](../pages/riichi-open/index.vue) · [Organiser layout](../layouts/admin.vue)
- Confirm that these interactions communicate the right outcome with fixture data, including failed saves, greeting consent, full capacity, receipt recovery and an organiser score retry. Use the existing site voice guidance for each activity and for precise payment and rule language. [Site voice and visual guidance](../CODEX.md)

### Follow-up implementation record

- Removed duplicate parent labels from Collection, Play History and Riichi child headers. Moved the Clocktower Recaps parent link above its title. Collection now retries the play-history request in place, retaining its current search and filters.
- Added shared date helpers for Kuala Lumpur's current date and date-only gathering records. Home, Gatherings and Clocktower now use the same date source and formats. Calendar actions consistently distinguish a specific event, the gathering list and an external organiser sign-up.
- Moved the shared primary gathering action and navigation-card styles for Board Games and Riichi into the common stylesheet, including the same single-column card layout on narrow screens. Existing forms and organiser actions already use shared Nuxt UI controls and status classes; repeated organiser destinations already come from the shared navigation utility.
- The test suite (149 tests), type check, static generation, SEO check and responsive check passed. The responsive check covered 20 generated routes, the custom 404 and its missing-route fallback at 320, 390, 512, 720, 768, 1024 and 1440 CSS px. Fixture-based sign-up and organiser transactions remain a separate verification because they require test data.

### Release checks

- Compare the changed routes at 320, 390 and 1440 CSS px. Check keyboard order, focus return, reduced motion and shared anchors. Verify the original Home hero, custom 404 and legacy redirects.
- Run the existing test suite, type check, static generation, SEO check and responsive check. Treat fixture flows as a separate check of what the site says and does when data is missing, an action fails or a visitor needs to retry.
