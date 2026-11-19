# Saujana boutique refinement plan

19 November 2026 · Baseline: `6e8d432`

Make Saujana feel like a small, well cared for games club. Use confident typography, well chosen images, generous space around stories and a clear, compact layout where people come to do something. The welcome should feel personal and open to everyone.

## What to build on

The site already has warm paper, deep green, self-hosted Playfair Display, a recognisable wordmark and illustrations with character. The recent cohesion work clarified parent links, aligned gathering dates and made Collection recover in place. Keep those improvements and the original Home collage. This direction supersedes the earlier suggestion to consider replacing the collage. [Earlier boutique plan](boutique-visual-design-plan.md) · [Cohesion review](site-cohesion-review-and-plan-2026-11-19.md)

The local static preview covered all 13 public pages and organiser sign-in at 390 and 1440 CSS px. External requests were blocked for the baseline review. A second pass used a sample event on Home, Gatherings and Clocktower. Signed-in organiser pages were reviewed from source. Three details explain where the next pass can make the biggest difference:

- **The artwork and the practical details compete for space on Home.** With a sample event at 390 px, the collage started about 590 px down the page. It already has a strong desktop position beside the invitation. Tighten the mobile spacing around the welcome and next event so more of the collage comes into view, with the gathering action still easy to reach. [Home](../app/pages/index.vue)
- **Browsing pages have weak alignment between the controls and the content.** At 1440 px, Collection’s 720 px toolbar sits above a 1,160 px feature and cover grid. Its retry state can span the full 390 px viewport even though the controls sit inside 20 px gutters. Give the toolbar, feedback and content a common left edge. [Collection](../app/pages/collection.vue) · [Play History](../app/pages/playlog.vue) · [Clocktower Recaps](../app/pages/only-blood-in-the-clocktower/recaps.vue)
- **Secondary actions still look different in comparable states.** The preview showed a bright green Collection retry, an outline on Home and a muted fill on Gatherings. The common error style is already available. Define a matching recovery button and place it beside the relevant message. [Shared styles](../app/assets/css/main.css) · [UI config](../app.config.ts)

## Visual direction

| Element | Direction |
| --- | --- |
| Colour | Use warm paper for the page, near-white for interactive surfaces and deep green for the most important action in each area. Use brass for a fine divider or a tournament detail. Use wine sparingly in Clocktower. Keep success, warning and failure identifiable by text as well as colour. |
| Typography | Keep Playfair for titles and selected editorial headings. Use the current sans serif for instructions, scores and forms. Keep ordinary copy at 16 px or larger and essential metadata and recurring controls at 14 px or larger. Use tabular figures for times, dates, standings and payments. |
| Layout | Use the current reading, standard and wide widths. Align each page family to a deliberate grid. Give welcome pages room for images and stories, give tool pages short headers and put the next action beside the content it applies to. |
| Surfaces and controls | Leave ordinary text on the paper surface. Use a fine border for related information or inputs and reserve noticeable elevation for dialogs and drawers. Define solid primary, outline secondary and underlined text actions with visible focus and predictable touch targets. |
| Imagery | Keep the original Home collage and its responsive sources. Use existing activity illustrations and permission-cleared gathering photos where they tell a specific story. Keep cover art square and tournament posters portrait. Reserve image space so late loading leaves the page steady. |
| Voice | Keep invitations brief, warm and easy to act on. Let each activity have its own character in introductions and recaps. Keep labels, consent, rules and payment states literal. [Site voice guidance](../CODEX.md) |

## Implementation order

1. **Prototype the range.** Work on Home, Gatherings, Collection and Riichi Calculator at 390 and 1440 px. Agree on three page treatments through the actual screens: a welcome with artwork, a task with immediate controls and a readable reference or archive. On Home, tune the spacing around the original collage and next gathering. On Gatherings, test a quiet date column and a single place for logistics and the RSVP. On Collection, place search, filters, summary and feedback on the grid’s leading edge. On Calculator, keep entry controls high and give the calculated payment the strongest emphasis.
2. **Extract shared patterns from the pilot.** Extend the current CSS tokens and Nuxt UI variants for headers, buttons, fields, inline feedback and tables. Map primary green to the Saujana palette and give secondary and retry actions one treatment. Check each currently implicit primary button before changing its default. Align the wordmark, navigation and footer with the main grid. Carry the same focus and current-page cues into the mobile drawer.
3. **Polish every public page.** Apply the chosen treatments using the route table below. Compare adjacent pages as a single visit, especially Home to Gatherings, Board Games to Collection to Play History, and the Riichi overview into each tool. Apply the same care to populated, loading, empty and unavailable states.
4. **Finish organiser pages and fallbacks.** Extend the shared typography, fields and feedback to organiser screens with denser spacing. Review fixtures for sign-in, draft work, receipt review and round certification. Carry the wordmark and action hierarchy into the 404 and any standalone fallback content.
5. **Review the finished site.** Compare before and after at phone and desktop widths, complete the acceptance checks below and record approved patterns in the site guidance so future pages can reuse them.

## Route coverage

| Page | Refinement |
| --- | --- |
| Home | Give the original collage a confident frame alongside the live invitation on wide screens. Tighten the phone layout around the welcome, next gathering and collage. Let the first-visit photo and activity previews carry the story below. |
| Gatherings | Give upcoming dates and their actions a consistent grid. Keep time, venue, directions and sign-up terms close together. Use quieter dated rows for recent gatherings, with details available on demand. |
| Board Games | Make the Just One example the illustrated centre of the page. Match the Collection and Play History links in visual weight and give each a short, useful description. |
| Collection | Put the controls and count on the same grid as the covers. Shorten the featured game treatment on mobile. Give box art consistent frames and game details a predictable place. Preserve virtual scrolling and dialog focus return. |
| Play History | Use a compact archive header, a readable date rhythm and a simple game list. Bring count, reset and feedback close to search. Keep links to related archives secondary. |
| Riichi Mahjong | Pair the existing illustration with one compact learning example. Give League, Calculator, Open and Rules a common tool directory treatment. |
| Riichi League | Bring the season selector and standings into one composition. Use clear row rules and aligned figures. Distinguish checking standings from adding a result. |
| Riichi Calculator | Keep mode and player count visible near the title. Standardise selected and focus states. Give the payment result precedence and check the result panel with the phone keyboard open. |
| Riichi Open | Use the portrait poster and restrained brass details for the tournament identity. Give the current edition and status a clear place. Put completed standings first when appropriate. Keep reservation, receipt review, confirmation and retry visually distinct. |
| Riichi Rules | Set the rules in a comfortable reading column. Use quiet section dividers, scannable scoring examples and a clear contents control. Preserve rule wording and deep links. |
| Only Blood in the Clocktower | Use wine for small accents. Treat the next gathering as a compact date and action block. Give the artwork and introduction room lower on the page and keep Recaps easy to find. |
| Clocktower Recaps | Use archive controls and feedback consistent with Play History. Present date, script and results in a predictable order. Give longer accounts a comfortable measure and preserve explicit spoiler controls. |
| Birthday Club | Give the existing illustration and form one balanced composition. Keep the consent choice, privacy explanation and saved feedback legible and close to their controls. |
| Organiser sign-in and dashboard | Make sign-in and authenticator steps easy to distinguish. Use a compact shared heading and give each dashboard module a clearly labelled entry. |
| Organiser Birthday Club, Clocktower, Riichi Open and Visitor names | Apply shared fields and feedback to the greeting list, draft editor, receipt and scoring tools, and dated visitor list. Match spacing to the density of the task. Keep save, publish and certify visually distinct at their respective points of action. |
| 404 and legacy routes | Use the existing 404 illustration with clear Home and Gatherings actions. Preserve the calendar redirect and old Riichi Rules fragments. Match any visible fallback content to the public layout. |

## Acceptance checks

- Compare every route at 390 and 1440 CSS px. Check 320 px, both sides of the navigation breakpoint and 200% browser zoom. On a 390 px phone, check that the next gathering action is easy to reach, the original collage starts within the opening viewport on Home, and Collection search and calculator entry remain near the top.
- Check WCAG 2.2 AA contrast, visible keyboard focus, focus return, screen reader announcements and reduced motion. Confirm that wide scores and results scroll within their own containers. Check sticky panels with the phone keyboard open.
- Use fixtures for populated, loading, empty and unavailable states. Cover a gathering sign-up, Birthday Club consent, a full tournament, receipt recovery, score entry and organiser draft, publish and certification actions. Check that retry preserves entered data or browsing state where recovery is supported.
- Compare Home’s transferred image bytes and layout shift with the baseline. Verify the custom 404 and legacy links. Run the existing tests, type check, static generation, SEO and responsive checks once the designs are implemented.

## Implementation record · 19 November 2026

- Tightened the Home layout on phones. In the generated local preview, the collage now begins around 441 px down the 390 px viewport, compared with around 590 px before, while the next gathering panel stays above it.
- Aligned Collection’s toolbar, filters, featured game and play-history recovery to the same wide content edge. Set its retry action to the outline style and added a shared treatment for buttons inside error feedback.
- The test suite passed all 149 tests. Type checking, static generation, the 13-page SEO check and the responsive check passed. The responsive check covered 20 routes, both 404 views and widths from 320 to 1440 CSS px. The generated build timestamp was restored after verification.
- The release checks for native browser zoom, screen-reader announcements and organiser transactions with fixture data still need those environments for direct review.
