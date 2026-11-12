# Saujana page cohesion review

The public pages share a wordmark, warm palette, serif titles and consistent navigation. Most page titles align at the same height on desktop and phone widths. Home’s split hero and the calculator’s compact header fit their different purposes. Clocktower and Riichi Open I can keep their own artwork and accents within that shared frame.

## Implemented follow-up

- Collection and Play History now put search directly below the title. Collection keeps one play-history status above the grid rather than repeating it on each card.
- Gatherings puts Upcoming and Past before the first-visit guide. The Home visit steps and sign-up success message no longer repeat the same arrival instruction.
- Desktop and mobile navigation now render from the same destination list. The mobile drawer marks the current destination. WhatsApp contact now lives in the shared footer, with contextual links retained where they help with arrival, privacy or registration.
- Birthday Club uses shorter invitation copy and one clear success heading. The Clocktower archive no longer repeats its heading in a descriptive sentence.
- The calculator’s nested disclosure label is distinct from its section heading. Riichi League no longer repeats the best-days count in its season summary.
- Organiser modules use the shared layout’s main landmark instead of adding nested main landmarks.

## Highest priority

1. **Put the page’s main task directly below its title.** Collection leads with shelf information before search. Play History puts a Clocktower link before search and removes the field while history is loading. Gatherings places the first-visit guide above Upcoming and Past. Bring search and date selection forward, and place the supporting links and guidance beside the decisions they help with.
2. **Make contact predictable.** On desktop, WhatsApp floats on six public pages, sits at the end of Collection and Play History, and is absent on the calculator. Put general contact in the shared footer. Keep direct contact where it helps someone find the venue, report a concern or resolve a registration.
3. **Use one set of menu destinations.** The desktop and mobile menus now expose the same destinations, but their labels and routes are written in separate places. Share the destinations, keep the desktop dropdowns and open mobile groups, and visibly mark the current link in the mobile drawer. Use one labelled primary navigation landmark in each view. [Public layout](../layouts/default.vue)
4. **Keep one status per task.** Collection repeats play-history availability in the intro, the recommendation button and individual cards. Riichi Open I can repeat a closed-registration explanation in its heading and form panel. Put the status next to its action, with a recovery step where available. Keep separate notices when they concern separate tasks, such as Clocktower’s next event and recap archive.

## Public pages

| Page | Cohesion review |
| --- | --- |
| [Home](../pages/index.vue) | The main invitation and next-event handoff give the page a clear purpose. The intro to **Your first gathering** and the **Say hello** step both tell visitors to ask for Saujana and mention their first visit. Put that instruction in the step and keep arrival reassurance and contact in the intro. |
| [Gatherings](../pages/gatherings.vue) | Put Upcoming and Past immediately after the intro. Event cards with and without images present the same facts in different markup. Give both a common order for name, date, time, venue, directions and sign-up. The attendee summary now shows the count once. Keep the spend amount where people sign up or enter spend. |
| [Collection](../pages/collection.vue) | Lead with search, result count and clear action. Keep play-history status above the grid and keep the invitation to attend in the game detail. Preserve the virtual grid’s row measurements if the cards become shorter. |
| [Play History](../pages/playlog.vue) | Match Collection’s search placement, result count and empty-result treatment. Put the Clocktower link after the results. Keep the history grouped by date and the overall statistics below pagination. |
| [Clocktower](../pages/only-blood-in-the-clocktower.vue) | Its art, first-game guide and spoiler controls suit the page. Use the same event-fact order as Gatherings and trim the repeated eyebrow and recap descriptions. Keep the archive’s filters next to its heading. |
| [Birthday Club](../pages/birthday-club.vue) | The narrow form suits a single task. Shorten the invitation and give successful submission one clear heading. Use the same field-error and button treatment as Gatherings while keeping the privacy explanation beside the optional greeting choice. |
| [Riichi League](../pages/riichi-league.vue) | Keep the season selector and standings close together. Explain which daily results count beside the standings and remove the duplicate figure from the season summary. Keep the new-player link secondary to standings and score entry. |
| [Riichi Calculator](../pages/riichi-calculator.vue) | Its compact entry and payment layout are appropriate for scoring at the table. Keep that density and align the button labels, focus and validation treatment with League. Clarify the overlapping **Special circumstances** and **Special win circumstances** labels. |
| [Riichi Open I](../pages/riichi-open/index.vue) | Keep the event artwork, schedule and status. Give Registration and Standings the strongest navigation emphasis, with schedule and rules as secondary actions. Consolidate repeated date, format and closed-registration copy while keeping fee, expiry and receipt instructions at the point of action. |

## Organiser pages

| Page | Cohesion review |
| --- | --- |
| [Dashboard](../pages/admin/index.vue) | The module links and Riichi task shortcuts serve different needs. Keep both, and use the same module names in the dashboard, organiser menu and page titles. |
| [Birthday Club calendar](../pages/admin/birthday-club.vue) | The calendar is appropriately quieter than the editing screens. Match its heading, retry and empty-state presentation to the shared organiser layout. |
| [Clocktower organiser](../pages/admin/only-blood-in-the-clocktower.vue) | Keep the task-focused gathering editor. Match the label and visual priority of save, publish and draft states to Riichi Open wherever the action has the same meaning. |
| [Riichi Open I organiser](../pages/admin/riichi-open.vue) | Keep the event-stage and certification controls prominent. Align the page title with the organiser menu and use consistent placement for retry, pending and save status. |
| [Birthday Club calendar redirect](../pages/birthday-club-calendar.vue) | The legacy URL redirects to the current organiser calendar. Use the current destination in menus and dashboard links. |

The organiser shell already supplies a main landmark. The Birthday Club calendar and Clocktower organiser each add another inside it. Keep one main landmark and give each module its own heading. [Organiser layout](../layouts/admin.vue)

## Review coverage

Opened all nine public routes in the local browser at desktop and phone widths. Checked title alignment, page width, header and contact placement, and the order of early controls. Opened the four organiser routes at their shared sign-in screen and confirmed the legacy calendar redirect. Reviewed the signed-in organiser templates from source. Transactional flows and signed-in rendering were outside this review.
