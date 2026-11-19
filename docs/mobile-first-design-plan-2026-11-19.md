# Saujana mobile design plan

19 November 2026 · Baseline `57c0ebb`

Design and review the phone layout first. A visitor should quickly find the next gathering, browse a game or start scoring a hand. Keep Saujana’s warm paper, deep green and Playfair headings. Give the original Home collage a clear place in the opening sequence and let the site’s artwork, typography and careful spacing carry the boutique feel. [Boutique refinement plan](boutique-refinement-plan-2026-11-19.md)

## Current mobile experience

I reviewed the generated preview in touch emulation at 320 × 568, 390 × 750 and 430 × 850 CSS px. It covered all 13 public pages, organiser sign-in and the missing-page fallback. Home, Gatherings and Clocktower used a sample event with a long title. Other external requests were blocked. The reviewed pages stayed within the viewport. The preview did not exercise native phone keyboards, screen readers or signed-in organiser flows.

| What I saw | Design priority |
| --- | --- |
| Home’s event details button began at 613 px on the 320 × 568 preview. At 390 px it began at 479 px, with the original collage starting at 548 px. | Shorten the welcome and event stack, especially on short screens. Keep the complete date, time and venue close to the action, and bring the collage into view earlier. |
| In Gatherings, Directions had a 20 px tall link box at 390 px. The first event’s sign-up area started at 529 px. | Give Directions a larger tap area and group it with the venue. Keep the sign-up action and the applicable minimum spend together near the event facts. |
| Collection’s search appeared at about 206 px at 390 px. The Just One feature occupied 189 px before the covers, which began around 588 px. The first game names fell below the 750 px viewport. | Keep search high and give the first results more room. Turn Just One into a compact suggestion and align the controls, feedback and grid. |
| The drawer opens with Gatherings first and lists all destinations. At 390 × 750, Birthday Club sits below the first screen. The Calculator shows mode and player count early, but the tile picker starts near the bottom. | Keep the drawer easy to scan and scroll. In the Calculator, reduce space around supporting instructions and check that the result panel leaves room for the next tile or input. |
| The Birthday Club day selector’s placeholder truncates at 390 px. The Riichi Open unavailable state repeats the interruption in multiple stacked regions. | Give selectors space for clear labels and values. Present event availability in one clear status area with the relevant recovery action. |

## Work in this order

1. **Make the shared phone layout feel intentional.** Use one page gutter across the header and main content, with a documented narrower option for dense tools. Use compact headings on tasks and more room for artwork on welcome pages. Keep body type at least 16 px and recurring controls and essential metadata at least 14 px. Aim for 44 × 44 CSS px for important tap targets, including menu, dialog close, filters and standalone Directions links. Keep visible focus and active-page cues. Check that the drawer closes cleanly, returns focus to Menu and can scroll on a short phone.
2. **Make attending a gathering the easiest path.** On Home, give the next event details the strongest action when a date is available and keep the calendar easy to reach. Keep the existing collage in the opening sequence. On Gatherings, use a date and title block followed by venue, directions, sign-up terms and action. Open the name form in place and keep labels, validation and confirmation near their controls. Apply the same date and action hierarchy to Clocktower, including empty and unavailable states.
3. **Bring games and scores into view sooner.** Compact the Collection suggestion, keep search and filters together, and put the first covers and names near the top. Check that opening and closing a game returns you to the same item. Align Play History and Recaps with the same approach to archive controls. In Calculator, keep entry mode, player count and the active entry control high. Check a completed payment on short portrait and landscape screens. Let League and Open tables scroll within their own regions when their data cannot fit.
4. **Finish forms, reading pages and organiser views.** Give long rules and recaps an easy reading measure and accessible section jumps. Keep consent, payment and score entry easy to review with the keyboard open. Apply the shared mobile patterns to the remaining routes below and inspect each with content representative of its busiest state.
5. **Review each affected journey on a phone before release.** Compare before and after at the same viewport and with the same fixtures. Record images and any real-device findings alongside the implementation changes. Keep a desktop pass to catch changes to image framing, tables and navigation.

## Route coverage

| Pages | What to refine on phones |
| --- | --- |
| Home, Gatherings, Clocktower overview | Keep event facts and their next action easy to scan. Keep original artwork and check long titles, long venues and unavailable dates. |
| Board Games and Riichi Mahjong | Keep the activity artwork, one welcoming example and the next action in a clear sequence. Use well spaced destination links that remain easy to recognise at 320 px. |
| Collection, Play History and Clocktower Recaps | Start with useful controls and results. Keep cover crops consistent, dates legible, filters and reset close together, and photos and spoilers easy to open and close. |
| Riichi Calculator and League | Preserve comfortable tile and score controls, make the active mode clear and keep the result readable. Check long names, negative scores and table scrolling. |
| Riichi Open | Keep event state and the appropriate action prominent. Check completed standings and the active reservation flow separately. Bring cost, hold expiry, receipt selection and confirmation into a clear order. Test a long receipt filename and returning to a saved reservation. |
| Riichi Rules | Keep the section picker easy to find. Check direct links under the sticky header and let wide scoring examples scroll locally. |
| Birthday Club | Give month and day labels and values room to fit. Keep the greeting choice and its privacy explanation together. Make saving, validation and confirmation clear. |
| Organiser sign-in, dashboard and modules | Review sign-in and authenticator entry, the Birthday Club list, Clocktower draft editor, Open scoring and receipt review, and Visitor names. Use fixture accounts and data to check actions in crowded views. |
| 404 and legacy routes | Keep the 404 illustration, Home and Gatherings actions visible and usable on a short screen. Verify the birthday calendar redirect and old Riichi Rules fragments. |

## Release checks

- **Visual.** Capture the first screen and the main task on every public route at 390 px. Spot check 320 × 568, 360 px, 430 px, landscape and tablet widths, then check the desktop navigation breakpoint. At 320 × 568, aim to show the Home event details action in full with the representative fixture. At 390 × 750, show Collection’s first row of cover art and game titles and the Calculator’s first usable input. Confirm the Home collage still enters the opening viewport on a typical phone and retains its aspect ratio.
- **Touch and accessibility.** Use Safari on iPhone and Chrome on Android for the menu, event sign-up, Calculator and Open receipt flows. Check the browser bars, safe areas, native keyboard, scrolling and focus return. Check 200% zoom or increased text size, keyboard focus, VoiceOver or TalkBack announcements, reduced motion and WCAG 2.2 AA contrast. Verify that wide tables and guide examples scroll inside their own regions with a visible indication that more content is available.
- **Content and recovery.** Use representative long names, event titles, venue names, receipt filenames and scores. Cover populated, loading, empty, failed and recovered states. Walk through gathering sign-up, Birthday Club consent, score entry and confirmation, and Riichi Open’s full, held and receipt states with fixtures. Check that retries retain the relevant draft or browsing position.
- **Performance and regression.** Compare mobile Home image bytes and layout shift with the same profile and fixtures before and after. Keep responsive image sources and dimensions and defer images below the opening viewport. Run the existing responsive check for generated routes, then add focused journey assertions only where the current overflow check cannot catch a regression. [Responsive check](../scripts/verify-responsive.mjs)

## Implementation record · 19 November 2026

- Tightened Home on short phones and gave the next gathering panel less vertical padding. With the long event title fixture at 320 × 568, its details action now fits from 487 to 531 px. It previously started at 613 px.
- Made the Collection suggestion compact on phones, aligned it with the filters and results, and moved the first covers up. At 390 × 750, the first game title now fits from 638 to 684 px. It previously began at 762 px.
- Increased the Directions hit area in Gatherings and stacked Birthday Club’s month and day selectors at narrow widths so the selected values have room.
- The test suite passed all 149 tests. Type checking, static generation, SEO and responsive checks passed. The responsive check covered 20 routes, the custom 404 and its missing-route fallback at 320, 390, 512, 720, 768, 1024 and 1440 CSS px.
- The plan’s visual, keyboard and transaction checks on physical phones and with screen readers still need direct device review. Organiser transaction states also need fixture data.
