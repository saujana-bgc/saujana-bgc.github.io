# Responsive text wrapping

## Existing pages

1. **Start with shared styles.** Review `.hero-title`, the introduction styles, and `.page-hint` in `assets/css/main.css`. Check fixed widths, `text-wrap`, `white-space`, forced line breaks, and the minimum size of flex and grid children. Record which rules serve a clear purpose and where they leave useful space empty.
2. **Review each route by layout.** Use `publicRoutes` in `utils/siteSeo.ts` as the public checklist. Include organiser pages, the birthday calendar, and the 404 page. Start with gatherings, the league, and Clocktower recaps, which combine long copy with cards, links, and dynamic names. Then cover the remaining routes, including dialogs, tables, and error states.
3. **Fix the source of each break.** Let short callouts and ordinary copy use the space provided by their parent. Give long articles and rules guides a deliberate reading width. Let flex and grid children shrink with `min-inline-size: 0` or `minmax(0, 1fr)` where needed. Use `overflow-wrap: anywhere` for unbroken content such as raw URLs or identifiers when it would otherwise overflow.
4. **Share rules once the patterns are clear.** Put recurring typography and layout rules in `assets/css/main.css` or reuse a shared component. Migrate one group of pages at a time so each change can be reviewed with real content.

## Check before publishing

- Review at 320, 390, 768, 1024, and 1440 CSS pixels. Include browser zoom at 200% and spot-check Safari or Firefox for pages that use optional wrapping styles.
- Check the longest real headings, links, attendee names, event titles, and form messages. Text should wrap naturally, remain visible, and avoid horizontal page scrolling. Wide data tables may scroll inside their own containers.
- Add a browser check to CI when rolling out the shared rules. Use generous content fixtures and assert that key blocks can use their intended width and that the document does not overflow. Avoid requiring exact line breaks, which vary with fonts and rendering engines.

## Completed audit — 19 November 2026

- Reviewed all 20 generated page routes, including organiser pages, the birthday calendar redirect, the Riichi Open rules route, and the custom 404 page. Existing prose widths are deliberate reading measures; no further shared CSS change was needed.
- Chromium checks all generated routes at 320, 390, 512, 720, 768, 1024, and 1440 CSS pixels. The 512 and 720 pixel widths also cover common desktop viewports at 200% zoom. The home respect note is checked against its available width and a longer copy fixture.
- Firefox spot checks cover the home, board games, riichi mahjong, and Clocktower pages at 320 and 1440 pixels.
- The `verify:responsive` check runs in CI after static generation. It discovers generated routes automatically, so newly prerendered pages join the check without editing a route list.
