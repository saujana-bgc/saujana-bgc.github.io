# Activity landing pages

Give visitors a starting point for each of Saujana’s three activities. Each page should explain what happens at a gathering, help someone decide whether to come, and point them to the next step. Use the existing Gatherings calendar for dates, venues and sign-ups.

## 1. Build the Riichi Mahjong page

Create `pages/riichi-mahjong.vue` at `/riichi-mahjong/`. Use the shared page title styles and keep the first action visible near the top on phones.

- Introduce riichi as Japanese mahjong. Explain that a newcomer can watch a hand and ask for a walkthrough. Keep scoring terminology in the tools and guides where it is needed.
- Make **Find a riichi gathering** the primary action. Link it to the existing `/gatherings/?game=riichi` view. Keep that view’s link to all gatherings available when no riichi date is listed.
- Group **Riichi League**, **Riichi Calculator** and **Riichi Open I** under a section for people who already play. Describe each destination briefly. Use the tournament’s existing route so its current status and results stay in one place.
- Reuse the existing riichi illustration from the homepage where it fits.

## 2. Build the Board Games page

Create `pages/board-games.vue` at `/board-games/` with the same title, introduction and action hierarchy.

- Explain what happens at a gathering, how games are chosen and what someone can expect if they come alone or have never played before.
- Lead with **Find a gathering** and link to `/gatherings/`. The calendar currently has a riichi filter. Use the shared calendar for board games until event data can reliably identify which gatherings offer them.
- Link to **Collection** for browsing games and **Play History** for seeing what the community has played. Keep the catalogue and history on their existing pages.
- Reuse the homepage’s board game artwork or a crop of the same asset.

## 3. Connect all three pages to navigation

- Add **Board Games overview** and **Riichi Mahjong overview** as the first entries in their respective menus in `layouts/default.vue`. The shared menu list feeds desktop and mobile. Include the new routes in the logic that marks their parent menus active.
- In **What We Play**, use `utils/communityPillars.ts` and `pages/index.vue` to give each activity one clear link to its landing page. Keep the homepage’s general **Find a gathering** action.
- Use `/only-blood-in-the-clocktower/` as the Clocktower landing page. It already introduces the game, shows the next gathering, and provides first-game guidance and recaps. Preserve its existing URL, sign-up links and direct recap links.
- Add a contextual link to the relevant overview from Collection, Play History and the riichi tools wherever a visitor arriving directly would benefit from it. Keep each tool’s primary action prominent.

## 4. Verify the release

- Register both new routes in `utils/siteSeo.ts` with distinct titles and descriptions. Nuxt uses this registry for static generation, and the sitemap uses it for canonical URLs.
- Run the static build and the existing SEO verification. Check that both pages are generated, allow indexing and appear in the sitemap at their trailing-slash URLs.
- At desktop and phone widths, follow all three activity links from the homepage and menus. Check active menu states, keyboard focus, heading layout and the path to a gathering.
- Check the riichi calendar link with and without upcoming dates. Confirm that Collection, Play History, the riichi tools and Clocktower’s direct recap links still open.

Implement Riichi Mahjong first, then apply the same layout to Board Games. Publish the two pages with their homepage and menu links once both entry points are ready.
