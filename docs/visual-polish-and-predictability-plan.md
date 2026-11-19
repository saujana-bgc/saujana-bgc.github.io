# Visual polish and predictable interactions

Keep Saujana’s warm paper, green accents, Playfair headings and community photography. Make recurring layouts feel related through consistent alignment, spacing and controls. Give people a clear next step and a reliable way to tell what happened after they act.

People with OCD have varied needs. Consistent presentation may make the site easier to use for some visitors. The design goal is to reduce avoidable uncertainty and visual distraction, with feedback from people who choose to share their experience.

This plan builds on the [Zen design plan](zen-design-plan.md) and the [responsive text review](responsive-text-wrapping-plan.md). It focuses on shared visual rules and how the site handles changes, errors and completion. The starting points below come from a source review.

## 1. Set the shared visual rules

- Use the public header and Home’s content width as the alignment reference. Define three layout widths for reading, standard pages and wide data. Align headings, toolbars and card edges to the same gutters within a page. Let ordinary copy and titles wrap naturally, including when cards have different amounts of text.
- Give the existing spacing scale named roles for field groups, cards and sections. Retain the shared card and control radii. Use plain sections for supporting copy, bordered surfaces for distinct objects and stronger elevation for overlays. Keep photo crops consistent within each card family, with room for event art to retain its character.
- Standardise the visual hierarchy for primary, secondary and destructive actions, tabs, selected filters, focus and status. Use readable labels and visible states that work without colour. Keep familiar controls and their feedback in the same location across equivalent pages.
- Put shared layout and type rules in [main.css](../app/assets/css/main.css) and shared Nuxt UI variants in [app.config.ts](../app.config.ts). Try the rules on Home, Gatherings and Birthday Club before extracting shared components or changing global defaults.

## 2. Pilot Home, Gatherings and Birthday Club

| Page | Changes to prototype |
| --- | --- |
| Home and navigation | Align the intro, next gathering panel and activity cards. Make the next gathering easy to scan on a phone. Use one prominent action per decision area and a consistent current page marker in the desktop menu and mobile drawer. |
| Gatherings | Keep the event name, facts, applicable terms and action together through sign-up. Put one useful status beside the form or edited row. Distinguish “Saving…”, “You’re on the sign-up list” and a failed save. Preserve entered values on failure and show a direct retry or correction. |
| Birthday Club | Use the same label, help and error placement as Gatherings. Keep the greeting choice beside its explanation. After a successful save, show what was saved and the greeting preference so people can verify both at a glance. |

Keep loading and error messages near the content they describe. Reserve enough space to limit layout jumps. Announce meaningful status changes once with assistive technology and keep successful outcomes visible long enough to read. Where an operation’s result is unknown, explain that clearly and offer an appropriate status or recovery action before asking for another submission. Use confirmation when an action has a significant consequence, such as deleting a sign-up.

Prefer static placeholders and brief interaction feedback. Audit shimmer, content reveals and explicit smooth scrolling in Gatherings, Play History and Riichi Open. Respect the system reduced motion setting in both CSS and JavaScript. Keep important changes, such as a deadline expiring, visible in text without announcing every timer tick.

## Rollout applied — 19 November 2026

- Added shared page, wide, reading and card-stack widths, page gutters, section spacing and success, pending and error status styles. Applied them across Home, Gatherings, Birthday Club, browsing pages, play and registration flows, game guides, event pages and organiser modules.
- Standardised status panels, control corners, Collection filters and cards, and several loading, empty and retry states while retaining compact, domain-specific scoring controls.
- Fixed Home’s empty calendar message on phones so its text and link can use the full card width.
- Made explicit smooth-scroll actions follow the reduced-motion preference. The shared CSS also disables smooth page scrolling and reduces animation and transition duration for visitors who request reduced motion.
- Added the shared visual rules to `CODEX.md` so future pages use the same layout, wrapping, action, focus and status patterns.

## 3. Roll out by task

1. **Browse and revisit.** Apply consistent search, result count, clear and retry placement to Collection, Play History and Clocktower Recaps. Verify that closing a game detail or photo returns focus and preserves the browsing position. Keep spoiler controls explicit. Check Collection’s virtual grid sizing if cards change height.
2. **Play and register.** Apply the same control and status hierarchy to Riichi League, Calculator and Open. Keep scoring controls compact and figures aligned. Let Open’s server state determine the wording for a held place, a submitted receipt and a confirmed registration. Keep each meaningful next action and the registration reference easy to find.
3. **Close the gaps.** Carry the spacing and typography rules into Board Games, Riichi Mahjong, Clocktower overview, rules pages and the 404. Finish with the organiser layout and its modules. Apply the same feedback placement to saving and publishing while keeping their consequences distinct. Check the sign-in screen and the legacy birthday calendar redirect.

## Release checks and future pages

- Compare the same states before and after at 390 and 1440 CSS pixels. Check 320 px, tablet widths and actual 200% browser zoom for wrapping, alignment, readable controls and local table scrolling. Run the existing `npm run verify:responsive` check on the generated site.
- Verify keyboard order, visible focus that clears the sticky header, focus return from dialogs, reduced motion and screen reader status announcements. Check WCAG 2.2 AA contrast targets, including 4.5:1 for normal text and 3:1 for large text. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Use local or staging data to walk successful and failed sign-up, receipt review and recovery. A visitor should be able to tell what happened, what remains and where to go next without refreshing or submitting again to find out.
- Invite interested visitors, including people with lived experience of OCD, to try finding the next gathering, signing up and recovering from an error. Ask where the layout or feedback felt unclear. Participation and disclosure are optional.
- After the pilot, capture the agreed layout and interaction patterns in `CODEX.md`. For each new page, start from the closest existing pattern and review its populated, loading, empty and error states where applicable. Include the route in the static preview so the existing responsive check discovers it.

## Implementation and verification record — 19 November 2026

- Generated the static site and passed `npm run verify:responsive` across 20 generated routes and the custom/missing-path 404 at 320, 390, 512, 720, 768, 1024 and 1440 CSS pixels. Passed `npm run verify:seo`, `npm run typecheck` and `npm test` (147 tests).
- Completed Firefox responsive spot checks for five public routes at 320 and 1440 CSS pixels. In the local browser, also checked 19 routes at a 708–723 CSS-pixel viewport: none had document-level horizontal overflow. This narrow viewport check is a useful proxy for zoom reflow, but it does not establish behavior under native 200% browser zoom.
- Keyboard review at the narrow viewport confirmed the home skip link, navigation and action order have visible focus. Opening a Collection game detail and closing it with its button or Escape returned focus to the opening card and preserved the scroll position. The inspected public routes exposed one main landmark and one H1 each. Accessibility snapshots showed names for the home navigation and actions, the Collection search and game-detail controls, and status or polite live regions for the inspected loading/count feedback.
- A real screen-reader pass is still needed to confirm announcement timing and usefulness. Full native 200% browser zoom, end-to-end sign-up/payment recovery against disposable staging data, and voluntary visitor feedback remain outstanding. No real sign-up or payment data was submitted.
