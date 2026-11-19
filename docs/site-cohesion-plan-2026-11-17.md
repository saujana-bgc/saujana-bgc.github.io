# Saujana site cohesion review and plan

17 November 2026 · Reviewed at commit `7003b1b`

The site already has a recognisable family of pages. The warm palette, serif titles and Mika illustrations work across the activity overviews and Birthday Club. The biggest gaps are between pages. Home, Gatherings and Clocktower showed the same 21 November event with different action placement and repeated information. Related archives use different navigation conventions, and the completed Riichi Open page omits the edition that distinguishes it from the next one.

## 1. Make it easier to choose a gathering

- Keep the Home hero as the welcome and the next-gathering panel as the route to a specific event. Use one factual description across Home, Gatherings, the activity overviews and search descriptions. Board games and riichi mahjong are included at every gathering. Blood on the Clocktower is added on Only Blood in the Clocktower dates. Use the full series name for the event and the game name when explaining play.
- Standardise the event handoff across Home, Gatherings and the Clocktower overview. Show date, time, venue, directions and the relevant registration action in the same order. On Gatherings, use one facts block for photo and text cards, whether upcoming or archived. Keep the curated descriptions for what makes each gathering distinct and put terms where attendees make their decision.
- Give each activity overview one obvious path to attend. Board Games and Riichi Mahjong can share the calendar CTA and styling. On Clocktower, put one next-event block near the top and remove the second link to the same section. Check how dates from the event calendar and the Clocktower archive reach the right internal sign-up or external RSVP.

## 2. Make related pages and editions easy to recognise

- Keep the shared desktop and mobile menu data. Play History now sits with Collection under Board Games. The mobile drawer uses descriptive overview labels. Check the active group on every child route and update in-page return links alongside the menu.
- Use “Riichi Open” for series navigation and identify the edition where people see dates, standings, rules or registration status. The event page and search metadata now identify the 14 November tournament as Riichi Open I. It defaults to standings after loading and displays “Event complete”. Keep receipt recovery reachable for existing participants. Link Season 2 and Open II rules from the relevant public pages once approved.
- Bring related lookup screens closer together. Use the same search, result count, reset and retry conventions wherever the operation exists. Keep Collection’s game cards, Play History’s dated sessions and Clocktower’s spoiler-aware recaps suited to their content.

## 3. Apply shared presentation where tasks match

- Reuse the existing palette, fonts and spacing tokens. Share the repeated activity overview intro, primary action and resource-link styles, building on `ActivityOverviewFeature`. Keep each activity’s first-game example. Use the Board Games hook to introduce the puzzle and its feature to explain the duplicate-clue rule. Give the Riichi feature the turn-by-turn explanation and keep the joining guidance in one place.
- Align labels, focus, field errors, pending states and confirmations across Gatherings and Birthday Club. Review League and Open alongside them where controls serve the same purpose. Keep Birthday Club’s Mika artwork and form layout, and place the organiser-only calendar explanation beside the optional public greeting choice. Retain the calculator’s dense at-table controls and the event pages’ own accents.
- Give organiser modules the same heading, retry and feedback placement. Use the same module names in navigation, dashboard cards and headings. Apply the same visual hierarchy to equivalent save and publish actions, with separate wording for tournament certification.

## Page-by-page work

| Page | Change to make |
| --- | --- |
| [Home](../app/pages/index.vue) | Shorten the event explanation in the hero. Let the next-event panel provide logistics and send each activity card to its own overview. |
| [Gatherings](../app/pages/gatherings.vue) | Retain the early Upcoming and Past controls. Unify card facts, shorten repeated activity notes and keep event-specific sign-up and spend guidance with the action. |
| [Board Games](../app/pages/board-games.vue) | The intro sets expectations; the feature explains the Just One puzzle. Use the same calendar CTA as Riichi Mahjong, with Collection and Play History as secondary links. |
| [Riichi Mahjong](../app/pages/riichi-mahjong.vue) | Consolidate the invitation to watch or try a turn. Keep League, Calculator and Open together, and identify the Open edition at the next step. |
| [Only Blood in the Clocktower](../app/pages/only-blood-in-the-clocktower/index.vue) | Keep the next date and action together in one event panel. The duplicate date teaser and jump link are removed. Retain the event and game names and recaps link. |
| [Clocktower Recaps](../app/pages/only-blood-in-the-clocktower/recaps.vue) | Remove repeated eyebrow labels and the second Clear filters action. Preserve spoiler controls and shared session or game links. |
| [Collection](../app/pages/collection.vue) | Keep search first. Move the shelf update below the results area, put the no-play filter beside search, and add a retry action. Preserve virtual grid measurements. |
| [Play History](../app/pages/playlog.vue) | Put search reset beside search, shorten the reveal prompt and keep dated groups and the return link to the matched Collection game. Add direct retry if the data composable exposes a refetch action. |
| [Birthday Club](../app/pages/birthday-club.vue) | Keep the illustrated card. Use one confirmation heading and a short saved-preference line. |
| [Riichi League](../app/pages/riichi-league.vue) | Remove the duplicate Season table eyebrow. Review selected season dates, score entry availability and approved Season 2 guidance together. |
| [Riichi Calculator](../app/pages/riichi-calculator.vue) | Keep compact tile and han/fu entry. Clarify the circumstances heading as Tile bonuses and win details. Review focus and validation styles. |
| [Riichi Open](../app/pages/riichi-open/index.vue) | Identify the edition in the event details and metadata. Make the main action follow the event stage and check the initial load, explicit tab links, standings and receipt recovery together. |
| [Season 2 and Open II rules](../public/riichi-season-2-and-open-ii-rules.html) | Preserve the draft status until publication is approved. Bring the standalone page’s brand and navigation into line with the Riichi pages and point its League link at the canonical site. |
| [Organiser dashboard](../app/pages/admin/index.vue) | Align module labels with the organiser menu and keep direct links into tournament tasks. |
| [Organiser Birthday Club calendar](../app/pages/admin/birthday-club.vue) | Match module heading, loading, empty and retry treatment. Keep each greeting preference legible in the calendar and date list. |
| [Clocktower organiser](../app/pages/admin/only-blood-in-the-clocktower.vue) | Group New gathering, draft status and publish feedback around the task they affect. Keep a single prominent New gathering action visible at a time. |
| [Riichi Open organiser](../app/pages/admin/riichi-open.vue) | Align the heading with the organiser navigation. Keep next task, public standings and certification easy to locate. |
| [Visitor names](../app/pages/admin/visitors.vue) | Use the shared organiser heading and status styles. Keep the Kuala Lumpur date grouping and seven-day scope visible. |
| [Legacy Birthday Club calendar](../app/pages/birthday-club-calendar.vue) | Verify the old URL reaches the organiser calendar and the sign-in route retains that destination. |
| Missing-page fallback | Add public/404.html with Saujana styling and links to Home and Gatherings. Confirm the generated Pages artifact contains it. |

## Review coverage

Reviewed the current source and opened all 12 public app pages, the standalone rules draft, five organiser URLs, the legacy redirect and the missing-page fallback on the deployed site at 1440 px and 390 px. The pages fit both viewports. The mobile drawer marked the current Clocktower route and returned focus to Menu after Escape. The Clocktower next-event shortcut cleared the sticky header and pointed to the matching Gathering. The Recaps page showed its empty state, and the legacy calendar redirected to the organiser calendar sign-in.

The signed-in organiser modules were reviewed from source. Booking, score entry, receipt recovery, publishing and other write flows remain for fixture-based verification. Automated checks and a new static export have not been run.

## Verification before release

1. Verify every public route and the shared organiser shell at desktop, phone and just around the navigation breakpoint. Check keyboard navigation, visible focus, drawer dismissal, larger text, reduced motion and sticky-header anchor offsets.
2. Walk Home → each activity → Gatherings → relevant sign-up. Cover populated, empty and unavailable calendars, date rollover in Kuala Lumpur, upcoming and past deep links, and external RSVP. Compare the event facts shown on all three entry points for the same date.
3. Walk Collection → game detail → Play History → Collection and Clocktower overview → Recaps → shared game link. Check loading, empty results, retry, reset, pagination and focus return. Verify Birthday Club validation and both greeting choices with test data.
4. Walk League season switching and score entry, Calculator’s two modes, and Open registration, standings and receipt recovery with fixture data. Use a signed-in test organiser to check all five organiser modules, including the Clocktower draft-to-publish and Riichi Open certification flows.
5. Run `npm test` and the generated-site SEO verification after implementation. Check public canonical URLs, organiser `noindex` and the legacy redirect. Keep local review traffic out of the visitor counts.
