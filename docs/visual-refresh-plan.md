# Saujana visual refresh plan

Make the homepage feel like an invitation to a Saujana gathering. In the first five seconds, a newcomer should see who plays, understand that they can come on their own, and know where to find the next date.

The site already has a recognisable wordmark, warm paper and green, and locally hosted Playfair Display. The homepage collage adds a second logo and headline, and divides candid gathering photos into three small panels. The next-gathering section has little visual weight beside the hero. Give the strongest photograph and the next event more room to work.

## 1. Prototype the homepage at phone and desktop widths

- **Lead with one candid gathering photo.** Start with `first-gathering-cafe.webp`, which shows Saujana players talking over a table of cards and tokens. Compare it with the original, full-resolution frame from the top-right of the current collage if it’s available. Choose the frame with the strongest interaction between players and room to crop without losing faces. Try a broad crop on desktop and a tighter crop on phones. Keep the photo free of embedded copy and choose a separate image for the first-visit section.
- **Give the invitation room.** On desktop, give the photo roughly 60% of the hero with the headline and actions alongside. On a phone, place the short invitation and primary action first, followed immediately by the photo. Reduce the gap below the wordmark so that both the action and the gathering scene appear at 390 × 844. Keep `Find a gathering` as the filled button. Treat `What to expect` as a quiet link to the first-visit guide.
- **Try “Come play with Saujana” with one line of reassurance.** Pair it with “Join us for board games, riichi mahjong or Blood on the Clocktower. Coming on your own? We’ll help you get started.” The photo and copy should establish what visiting feels like before a reader reaches the event listings.
- **Make the next gathering feel like part of the invitation.** Place a compact pale-green panel immediately beneath the hero. Give the event name, date, time, venue and event link a clear reading order. The hero button opens the full calendar and the panel opens the named event. Design the loading, unannounced and unavailable states at the same time, with a calendar link and enough reserved space to avoid pushing content down.
- **Give the rest of the homepage a visual rhythm.** Follow the next event with the first-visit guide and its three practical steps, then the illustrated “What we play” cards. Crop those illustrations to a consistent frame and lead each card with one clear destination. Finish with the community values, the private reporting link and the photo recaps link. Use paper, a soft sage section and an evergreen footer to vary the page without enclosing every section in a card.

## 2. Carry the design into Gatherings and shared navigation

- Refine the shared header and footer around the existing wordmark and matching alignment. Make the current route visible and make the small-screen menu easy to spot with a visible “Menu” label.
- Use Playfair for headings and the existing sans-serif for instructions, controls and event facts. Keep paper `#F7F5EF` and evergreen `#354C3E` as the main colours. Use soft sage `#E9EDE5` for a few large surfaces and gold `#8A6A3E` sparingly. Reuse the same action, focus and spacing styles across Home and Gatherings.
- In Gatherings, keep Upcoming and Past near the title. Give listings with and without photos the same order for the event name, date, time, venue, directions and sign-up. Keep sign-up requirements beside the action. Use thinner dividers and tighter summaries for past events.
- Once those two pages work together, carry the spacing, interactive states and typography into Collection, Play History and Birthday Club. Keep the calculator and standings compact. Use the shared shell to connect Clocktower and Riichi Open to Saujana while preserving their own event artwork and accents.

## 3. Test the first impression before rolling it out

- Compare the current and proposed homepage on a phone and desktop. Show each version to visitors unfamiliar with Saujana for five seconds, then ask what the group does, whether they could come alone, and what they’d tap next. Ask them to find the next event’s time and venue without help. Record their first click and any hesitation.
- Check Home and Gatherings at 320 and 390 px, tablet and desktop widths, and at 200% text zoom. Verify photo crops, contrast, keyboard focus, menu dismissal, reduced motion and the event deep link. Exercise populated, loading, empty and unavailable calendars.
- The hero image in the source tree is about 1 MB. Serve responsive variants with explicit dimensions and aim for at most 150 KB for the mobile crop and 300 KB for desktop, subject to reviewing image quality. Load only the hero eagerly. Compare the static production build before and after on a throttled mobile connection, including layout shift and when the main photo appears.

Start with the hero and next-event panel in [Home](../pages/index.vue). Establish their type and spacing in that prototype before applying them to [Gatherings](../pages/gatherings.vue), the [public layout](../layouts/default.vue) and [shared styles](../assets/css/main.css). The [Zen design plan](zen-design-plan.md) covers the broader task and content cleanup.
