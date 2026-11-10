# Only Blood in the Clocktower redesign plan

Reviewed 10 November 2026. This plan covers the public Clocktower page, the organiser editor, and the handoff to the existing Gatherings signup. The [original feature plan](only-blood-in-the-clocktower-plan.md) records the content and operating model.

## What the review found

I checked the local Nuxt app at desktop width and at 390 × 844, followed the next-gathering link to the correct signup on Gatherings, and used a read-only local fixture for populated archive and organiser states. The regular local run returned an archive loading error, so the populated views below use sample data. Saving, publishing and uploads remain staging acceptance checks.

| Priority | Finding | Effect |
| --- | --- | --- |
| P0 | The next date appears below a 460 px minimum-height desktop hero. The hero and event card send visitors to the same gathering under different labels. The primary hero action also changes as data loads. | Joining requires scanning two separate sections for one decision. The first thing the visitor can do changes after the initial render. |
| P0 | A sample shared game opened with spoilers closed, as intended, but scrolled directly to the game disclosure while keyboard focus stayed at the page. A missing session and game link silently landed at the top. | A recipient may miss the date and gathering context, or have no way to tell why the shared item is missing. |
| P0 | A sample two-game editor with 12 players each was about 6,500 px tall at 390 px wide. Both game panels opened by default. Editing a saved gathering left focus on its Edit button with the picker expanded. | An organiser can open the right record and still have to hunt for the editor. Checking an outcome or moving between games takes repeated scrolling. |
| P1 | The tower illustration gives the public page a distinct identity. After the hero, the event, onboarding and archive use similarly weighted bordered panels. On a phone, the share button can force a short venue heading onto two lines. | Practical event details and the latest story compete for attention. Older gatherings are hard to scan by date and script. |
| P1 | A 12-player reveal fills several phone screens with individual seat cards. On desktop, opening a game in a grid makes it span the full row and moves the other games. Script filtering works, but the change in result count has no announcement. | Revealing one game breaks the browsing rhythm. People using assistive technology get little feedback when the list changes. |
| P1 | The admin preview uses separate markup from the public page. Photos can be approved and marked as covers, but the editor has no separate spoiler flag. Approved public names are mentioned in the preview and have no editable field in this editor. | An organiser cannot reliably check the exact public presentation or distinguish permission to publish a photo from permission to show it before the reveal. |
| P1 | Save feedback is split between a top-of-page error and a bottom action bar. Publish validation focuses the first incomplete field, but the error itself is remote from that field. Photo upload has one shared busy state and no per-file progress or retry. | A host working on a phone may know that something failed without knowing which entry or upload needs attention. |

[Public page](../pages/only-blood-in-the-clocktower.vue) · [Organiser editor](../pages/admin/only-blood-in-the-clocktower.vue) · [Admin layout](../layouts/admin.vue) · [Gatherings signup](../pages/gatherings.vue)

## Visual direction

Use an illustrated invitation for the public page and a compact working desk for the organiser. Keep the existing moon and tower as the signature image. Use plum-black and warm brass around the masthead, parchment for reading, and wine for the main action on light surfaces. Save the display serif for titles, dates and story headings. Use the site's sans-serif for controls, metadata and rosters. Give the public masthead a dedicated crop on narrow screens so the tower can remain recognisable without sitting behind small text or buttons.

Use spacing and type before adding borders. Give the next gathering a prominent date and a single clear action. Make the latest retelling the only large editorial feature below it. Use quiet dividers for the archive and revealed roster. On the admin side, carry the theme through a small tower mark, section headings and status chips. Keep inputs, validation and focus treatments on light, high-contrast surfaces. Use plain text and an icon for statuses such as Draft, Published, Upload failed and Spoilers.

### Visual review after the first pass

The first pass gives the mobile landing page a clear reading order. At 390 × 844, the title, next date, venue and action fit in the first screen with the sample venue. The image and secondary links still share the same space. The populated archive and organiser views in this review used sample data. The desktop measurements use a 1280 × 720 viewport.

| Order | What I saw before this pass | Change applied |
| --- | --- | --- |
| 1 | The desktop masthead measured 537 px and pushed the date details below the fold. On the phone, the tower image sat behind the links. | Moved the date card into the masthead. Desktop uses paired title and date columns. The phone layout stacks the card below the title and gives the artwork a separate crop. The first-pass phone sample showed the date, time, venue and action together. |
| 2 | The archive starts with a full-width filter box. The latest gathering then uses a 320 px-tall cover above the headline on desktop. On mobile, the Share button sits beside the headline and reduces its reading width. | The latest story now has a two-column desktop card with the title and summary beside the image, then a one-column phone layout. Photos without accompanying text retain their own space. Remaining work includes moving filters to the older list and rendering older entries as date-led rows. |
| 3 | The welcome section, filters, session and game disclosures all have warm fills and visible outlines. In the admin editor, another set of similar borders surrounds the form, the active game and each seat. | The welcome section now uses a plain layout framed by thin rules. Remaining work includes using subtler separators for older archive entries and compact seat rows. The next event, featured recap and active game retain their visual emphasis. |
| 4 | The organiser heading wraps beside **New gathering** on a phone, and the navigation clips the long Clocktower label. The saved list stretches to nearly 1,000 px on desktop with a large gap between the title and Edit. The floating save controls cover the lower part of player rows. | The module navigation now reads **Clocktower**, the phone header stacks **New gathering**, and the saved-session list uses compact rows with date, venue and status. Remaining work includes visible seat numbers and more space around the save bar. |

Keep the existing Playfair title and italic treatment as the public page’s signature. Use the display face for the title, next date and story heading. Use the sans-serif for the organiser’s form headings, game labels and roster, where people need to read repeated information quickly. Review the featured story both with and without an approved photo, and use a long venue name and a two-game gathering for the next layout check.

## Public experience

### Join the next game

- On desktop, pair the title and illustration with the next-gathering card in one opening composition. On phones, stack a short title and introduction, then the event and its action, followed by the secondary links. At 390 × 844, the date, time, venue and primary action should be visible before the first scroll for an ordinary event. Use a long venue as a stress case.
- Keep the date, time and venue together. Show any confirmed cost, script and newcomer guidance where the source provides them. Put **Sign up for this gathering** on the existing signup path when signup is available, and **See gathering details** when it is the confirmed destination. Use one action in the opening composition. Repeat it after a shared recap where it serves a new entry point.
- Reserve a stable space for event loading. Give a calendar failure an inline **Try again** and a path to Gatherings. In the no-date state, show **See all gatherings** or **Follow session announcements** if the organiser has a confirmed channel. Use full or closed messaging when the registration source confirms it. Prefer an explicit link to the Gatherings event over date and venue matching when the organiser can select a source event. Keep the current matching behaviour available for older records during the transition.
- Make **Your first game** a short set of practical answers covering preparation, arrival and who can help. State event-specific instructions in the event card. Keep the official guide as optional reading. Add a Clocktower archive link on matching Gatherings cards so the handoff works both ways.

### Catch up on a gathering

- Move the latest gathering into a dedicated feature ahead of older entries. Use a spoiler-safe title or teaser, date, venue, scripts and game count, with a single **Open gathering** action. Show an approved spoiler-safe cover when available. Use a small date and script treatment for a text-only feature. Avoid duplicating the featured entry in the unfiltered list, while including it in relevant filter results.
- Display older gatherings in date order with a clear heading, venue, script names and game count. Keep Year and Script as labelled native selects. Add a result count announced after changes, **Clear filters**, and a distinct no-match state. Treat the loaded-empty and failed-to-load states separately and keep filters when retrying.
- Give a gathering its own focused view within the existing route, with a **Back to archive** action. Put game headings in stable rows. Use explicit **Reveal retelling** and **Reveal game result** controls, and render revealed players as a compact seat list with the outcome first. Keep the seat label, character and death indicator legible without relying on colour. Keep sharing available from the spoiler-safe view.
- Preserve the existing `?session=` and `?game=` links. A game link should show its gathering context, identify the game, and keep spoilers closed. Move focus to the destination heading after a shared link resolves. If a game disappears, show the gathering with a short explanation. If the gathering is missing, show an explanation and **Browse past gatherings**. Keep copied links and social previews spoiler-safe. Provide a selectable URL if native sharing and clipboard copying fail.

## Organiser experience

### Find a gathering and log a game

- Replace the large admin masthead with a compact **Clocktower organiser** heading and **New gathering**. Make the gathering list visible on arrival. Group it by upcoming, drafts and published history, with dates, venues and game counts. On desktop, use a list and editor side by side when there is room. On phones, open a dedicated editor view and restore the list position on return. Move focus to the editor title when opening a record.
- Let organisers open **Details**, **Games**, and **Story and preview** in any order. In Games, show each game's script, seat count and completion status. Open one game at a time by default. Keep **Add game** and **Add game with same players** beside this list. The existing roster copy correctly reused all 12 sample names and cleared character assignments. Preserve that behaviour along with the copied seat order and the cleared outcome, death and notes fields.
- Use compact seat rows with persistent seat numbers and an accessible character picker scoped to the script. On phones, show a one-line summary for completed seats and expand the seat being edited. Keep quick add, paste names and keyboard movement between characters. Use stable row keys so removal preserves adjacent input and focus. When changing scripts would clear assignments, identify the affected seats and preserve the current work if the organiser cancels. Support custom scripts and older records with unknown fields.

### Review and publish

- Keep a small action bar with draft or publish state, local recovery status, and context-appropriate actions. Reserve space so it never covers an input or its error. For an existing published gathering, label the action **Update public gathering**. Keep **Unpublish** with the publication controls in the review view. Show server save progress separately from recovery on this device.
- Show publish requirements in a short checklist with links to missing fields. Open the affected section and place its error at the field when a check fails. Surface connection errors near the action and preserve all entered values. Test recovery after reload and make a failed save distinguishable from a successful save followed by a failed list refresh.
- Reuse the public gathering and game presentation in the admin preview. Give the organiser explicit **Spoilers hidden** and **Spoilers revealed** preview states. When media and names are in scope, add separate photo approval and spoiler controls, one cover per gathering, meaningful alt text, and a clearly labelled public display name field alongside the private name. Keep unapproved photos private and handle older approved photos without automatically promoting them to visible covers. Show per-file upload state and let an organiser retry one failed file.

## Implementation order

| Phase | Ship | Acceptance check |
| --- | --- | --- |
| 1. Invitation and recovery | Compact public masthead and next-event card, clear signup copy, loading and error states, stable shared-link targets and stale-link recovery. Verify why the archive failed in the regular local run before release. | A newcomer can explain where and when the next game is and open the correct signup from a phone. A valid shared link opens at its labelled target with spoilers closed. A stale link explains what happened. |
| 2. Organiser workflow | Gathering list, one active game, compact seat entry, section-level validation and a safe-area-aware action bar. Reuse the existing draft recovery and roster copy. | A host can open a draft, log two 12-player games using one roster, enter both outcomes, recover a draft after reload and find the first invalid field without searching the page. Check long names, a custom script, a failed save and keyboard focus. |
| 3. Archive and publishing polish | Latest story feature, scan-friendly archive, accessible filtering, shared public preview and the photo and display-name controls. Split photo metadata changes from layout work if existing records require migration. | A returning player can find a game by script and year, reveal just that game, and share it with spoilers closed. Compare organiser preview and public output using approved and private names, missing and expired photos, and spoiler-marked media. |

Verify the static build and direct URLs at 320, 390, 768 and 1280 px. Test keyboard-only entry and archive browsing, screen-reader announcements, browser zoom, long venue and script names, and phone keyboard overlap. Target 44 px primary touch controls and at least 4.5:1 contrast for normal text. Check a no-date week, an archive with no recaps, and a sample archive spanning several years. Run the signup and publishing acceptance checks against a staging or disposable local fixture before release.
