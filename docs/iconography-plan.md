# Iconography review and rollout plan

A small set of icons suits the site’s utility controls. The first pass adds matching search cues in Collection and Play History and a map pin beside Directions in Gatherings and Clocktower. The photo-led landing pages, text navigation and illustrated Clocktower rosters already have clear visual cues. The first pass is implemented. A rendered comparison is still needed.

## Where icons would help

| Priority | Placement | Assessment |
| --- | --- | --- |
| Implemented | **Search** in Collection and Play History | Both search fields use a leading Lucide `search` icon, custom inset padding, and their existing accessible names and clear actions. [Collection](../app/pages/collection.vue) · [Play History](../app/pages/playlog.vue) |
| Implemented | **Directions** on Gatherings and Clocktower | Both pages use the same trailing `map-pin` beside the visible Directions label and keep the existing link behaviour. Review a long venue name with the link present at phone width. [Gatherings](../app/pages/gatherings.vue) · [Clocktower](../app/pages/only-blood-in-the-clocktower/index.vue) |
| During the same pass if the controls are touched | **Menu and Close** in the mobile navigation, and standalone dialog close buttons | The current symbols already communicate the actions. As a consistency update, use Lucide `menu` and `x` in place of the existing SVGs or `×` glyphs. Retain visible labels in the mobile drawer, accessible names on icon-only buttons, and existing focus return. [Public layout](../app/layouts/default.vue) · [Calculator guide](../app/components/riichi/RiichiCalculatorTutorialDialog.vue) · [Collection dialog](../app/pages/collection.vue) |
| Consider after the first pass | **Copy** and **Undo** in the calculator | `copy` and `undo-2` can distinguish the two actions in the result panel. The panel already fits several controls on a phone, so compare a completed score with an undo available and with the copy confirmation shown. Keep the labelled controls if icons make the row wrap or increase the panel’s height. [Riichi Calculator](../app/pages/riichi-calculator.vue) |
| Consider after the first pass | **Download organiser export** | A `download` icon can make the export easier to find in History and exports. Keep the label and apply the icon to the export action itself. [Riichi Open organiser](../app/pages/admin/riichi-open.vue) |

The Collection filter disclosure already has a chevron. Keep that cue and its selected-filter summary. Public navigation, event tabs, cards, and form choices already have visible labels or artwork to guide scanning. Keep the site’s social marks, Clocktower character art and mahjong tiles as their existing assets.

## Implementation and review

1. Add the search and Directions placements in a small first change. Use Nuxt UI’s `icon` prop on supported controls and `UIcon` beside plain link text. Use the Lucide collection already declared in `package.json`, with consistent sizing and `currentColor`. Let the text supply each labelled control’s accessible name and hide its accompanying icon from assistive technology.
2. Compare the existing and proposed versions at 320 px, 390 px, and desktop width. Check empty and populated search fields, keyboard focus, result counts, and a long venue name. Keep each added icon only where its placement helps identify the action and preserves text, spacing and tap targets.
3. Run the responsive check and inspect the GitHub Pages export on localhost from a fresh browser session. Confirm the icons render with external icon services blocked, including after client-side navigation. If an icon needs explicit bundling, include only the names the site uses. Compare the shared asset size with the baseline before expanding the rollout.
4. Review the calculator and organiser candidates separately once the first pass is accepted. The calculator needs a completed score and an undo state to judge the available space. The organiser export needs a populated view to judge how easily it can be found.
