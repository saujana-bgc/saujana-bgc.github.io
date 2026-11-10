# Nuxt UI rollout

Nuxt UI already powers the Clocktower organiser’s player and character suggestions. Use it across the site for controls, forms, navigation and feedback. Keep the Saujana colours, Playfair headings, event artwork and layouts that make each section recognisable.

## Foundation

- Define the component defaults in `app.config.ts` and map Nuxt UI’s semantic colours, surfaces, borders and radius to the existing tokens in `assets/css/main.css`. Use Saujana green for primary actions and local theme overrides for Clocktower and Riichi Open. Use the existing local fonts. Keep automatic colour mode, font loading and Tailwind Preflight disabled during the migration. [Nuxt UI theming](https://ui.nuxt.com/docs/getting-started/theme/components)
- Standardise action hierarchy, control sizes, focus indicators, form labels, validation and loading, empty and error states. Start with `UButton`, `UInput`, `USelect`, `UFormField`, `UAlert`, `UBadge`, `USkeleton` and `UEmpty`. Use `UApp` when introducing shared toast or overlay providers. Keep field errors next to their fields and use toasts for brief confirmations. [Nuxt UI components](https://ui.nuxt.com/docs/components/app)
- Capture baseline screenshots at 390 px and desktop and record the gzip sizes of shared CSS and initial route JavaScript for Home, Gatherings, Clocktower and the organiser. Compare after each phase. Check whether component detection reduces shared CSS before enabling it, and include any dynamically rendered components in the check. [Nuxt UI component detection](https://ui.nuxt.com/docs/releases/v4.1.0)

## Rollout order

| Phase | Pages and components | Ready when |
| --- | --- | --- |
| 1. Shared shell and simple pages | Move the public header and mobile menu to `UNavigationMenu` and `USlideover`. Convert Home and Birthday Club actions, the Birthday Club form and the shared WhatsApp action. Use `UButton` and `UCard` for the organiser landing page. | All links are reachable by keyboard and mobile navigation returns focus to its trigger. Birthday submission still collects day and month and presents the same public greeting choice. |
| 2. Browse and read | Use shared search, filters and feedback on Collection, Play History and public Clocktower. Migrate the Collection detail overlay to `UModal` with its current content. Use shared controls for the Clocktower archive and keep its reveal controls inside each game. | Search counts, loading and no results states, stable recap links, spoilers, sharing and signup handoff all work. The public archive still reads like a series of gatherings. |
| 3. Organiser tools | Convert the shared sign-in and nav, then Birthday Club and Clocktower editors. Use `UForm` and `UFormField` where the existing validation can carry over, with `UButton`, `UBadge`, `UAlert` and `UModal` for status and confirmations. Keep the old Birthday Club calendar URL redirecting to its organiser page. | Sign-in and sign-out work, busy actions cannot double-submit, and errors focus the right field. Clocktower preserves roster copy, keyboard entry, draft recovery, preview, save and publish. Birthday Club keeps its existing consent and moderation behaviour. |
| 4. Gatherings and Riichi League | Migrate signup controls, date and season filters, alerts and score entry in separate changes. Evaluate `UInputMenu` for name suggestions and `UTable` for desktop standings, with the current mobile card presentation as a separate layout. | Deep links, registration and arrival time rules, editable and read-only attendance states, score validation and narrow-screen results match current behaviour. |
| 5. Riichi Calculator and Riichi Open | Migrate the calculator’s ordinary controls and tutorial dialog around the custom tile entry interface. Move tournament tabs, standings, registration, receipt upload and admin controls in separate changes outside the live event window. | Calculator keyboard entry, group editing, undo and score results still work. Tournament reservation, expiry, receipt retry, payment status and certified standings pass through each existing state on desktop and mobile. |

## Review each change before moving on

1. Open the affected routes on the static export, including direct URLs, anchors and query links. Run the existing CI checks, `npm test` and `npm run generate`, which includes SEO verification.
2. Walk through keyboard navigation, focus return from overlays and the main mobile flow. Check loading, empty and failed requests with sample data. Use local or staging data for organiser saves and public submissions.
3. Compare initial assets and screenshots with the baseline. Investigate unexpected shared bundle growth or layout changes before adopting the same component elsewhere. Remove replaced styles and handlers as each page moves over.
