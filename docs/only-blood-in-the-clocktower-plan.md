# Only Blood in the Clocktower

Build a home for Saujana’s Blood on the Clocktower nights. A player should be able to relive a moment from their last game, see what’s coming next and know how to join. The game log supports that experience and gives the organiser a reliable record of each table.

## Review of the first plan

| Idea | Assessment | Decision |
| --- | --- | --- |
| Predictable dates and a clear RSVP | Gives interested players a concrete way to return. Depends on the host being able to confirm dates early. | Put the next confirmed meetup first. Try a monthly slot if the venue and host can sustain it. |
| A quick welcome for first-timers | Addresses uncertainty about rules, experience and what to expect. The experience at the table has to match the invitation. | Include a short first-timer note and set aside time for an introduction at suitable sessions. |
| Mika’s recap and photos | The clearest reason to visit after a game. A long write-up for every table would be hard to keep up. | Feature one short recap per meetup. Keep per-game recaps and photos optional. |
| Copy the previous roster | Players never see it, but it makes prompt logging practical when several games happen in one evening. | Move into the first release. |
| Script and outcome stats | Useful context once several games are logged. Early percentages can swing sharply and offer little reason to return on their own. | Keep group stats available below the recap and next date. |
| Polls, badges and rankings | A script choice can give players a say. Streaks and rankings can favour people who attend often and create extra work. | Try an occasional script poll in the existing community channel after launch. Leave rankings and streaks out of the release. |

These are priorities to test with Saujana’s group. The site can make it easier to come back. The schedule, table culture and Storyteller experience still determine whether players want to.

## The meetup rhythm

1. **Before the meetup.** Confirm the next date as early as practical and share the actual signup link. Say whether the table is suitable for first-timers, what the session costs if applicable, and what to expect on arrival. Use a predictable slot if it works for the group. Announce featured scripts when the Storyteller has confirmed them.
2. **At the table.** Give new players a short introduction and a chance to ask questions privately. Let them find their own strategies. After the reveal, ask one optional question such as “What did you believe right up until the end?” A moment from either team can become the recap. [Including new players](https://bloodontheclocktower.com/blogs/news/including-new-players), [Storyteller advice](https://wiki.bloodontheclocktower.com/Storyteller_Advice)
3. **After the meetup.** Aim to publish one short highlight within two days. Give the write-up a trial budget of 10–15 minutes. Share the spoiler-safe meetup link once in the channel the players already use, with the next confirmed date or an invitation to follow announcements. The admin should be able to copy that link and a short sharing blurb. If photos or a write-up aren’t ready, publish the basic log first and add them later.
4. **Over time.** Keep beginner-friendly games in the rotation and occasionally feature a different script or guest Storyteller. If people ask for a say in the lineup, offer two scripts the host can actually run and report back which one was chosen.

## Public page

Use `/only-blood-in-the-clocktower` as the proposed URL and page title. Refer to the game itself as **Blood on the Clocktower**. Link the archive from the existing playlog and gatherings pages so people can find it through the site.

1. **Next game night.** Show the confirmed date and local time, venue, suitability for first-timers and the real signup action. Link to the matching Gatherings signup or the host’s booking page. If signup is closed or the event is full, reflect what the signup source confirms. If no date is set, show **Follow session announcements** with a link to the organiser’s chosen channel. Surface the same next action below each recap.
2. **Mika’s retelling.** Feature the latest meetup with a spoiler-free teaser and an optional approved cover photo. Inside the reveal, Mika recounts one memorable moment in a paragraph written by the organiser. A simple prompt is what the town believed, what changed and what people talked about afterwards. Use the name or quote of a player only with their approval. A basic meetup entry still works on weeks when there’s no recap.
3. **First time at the clocktower?** Briefly explain how the evening works, whether anyone needs to learn the rules beforehand, and how to ask the Storyteller for help. Keep practical details tied to the upcoming meetup. Use the official guide as optional reading. [Explaining the rules to new players](https://bloodontheclocktower.com/blogs/news/explaining-the-rules-to-new-players)
4. **Past sessions and stats.** Group individual games under each meetup. Show the date, script, player count and approved spoiler-free cover photo. Filter past games by script and year. Give meetups and games stable links using query parameters on the prerendered route, so new entries have working links as soon as they’re published. Use **Reveal the result** for winners, characters, alignments, deaths and spoiler-heavy captions, images or recaps. Show approved display names or neutral seat labels. Keep results stats in their own view. Start with games logged, scripts played and Good vs Evil results overall and by script, with counts beside win rates. Include only published games with a known Good or Evil result in the win-rate denominator.

## Admin workflow

Add `/admin/only-blood-in-the-clocktower` to the existing admin dashboard and navigation. Use the same organiser sign-in. Start with a list of meetups and games by date and status, a prominent **Log a game** button, and a way to select the next confirmed meetup and its signup destination.

1. **Set up the game.** Create or select a meetup, then choose the script and optional Storyteller. Use a table or game number when several games happen at one meetup. **Log another game** keeps the meetup and suggests the same Storyteller. **Copy previous roster** is a separate action that copies only players and seat order from the selected game. The organiser can remove or add players and fill in the new characters, alignments, deaths and result.
2. **Enter the roster.** Type a name to search returning Clocktower players, ignoring case. Select a match or add a new player inline. Use a stable player ID, allow different people to share a display name, and prevent adding the same player record twice to one game. Keep the picker separate from other community programmes.
3. **Assign characters.** Filter character suggestions to the selected script. New games use Trouble Brewing, Bad Moon Rising or Sects & Violets. Keep previously saved scripts on existing games. Track Travellers separately when needed and record Fabled as game modifiers. Record actual characters and alignments. Allow optional end-of-game changes and confirm any assignments affected when an organiser switches scripts. [Official script guide](https://bloodontheclocktower.com/pages/script-and-wiki), [Character types](https://wiki.bloodontheclocktower.com/Character_Types), [Alignment and character states](https://wiki.bloodontheclocktower.com/States)
4. **Record the outcome and deaths.** Pick Good wins, Evil wins, no result or unknown. Add an optional note on how the game ended. Tick who died at any point, with a separate optional final status for resurrections and similar cases. Let the organiser mark the death record as complete, including when nobody died. Support unknown characters, alignments and deaths when backfilling older games. [Life and death rules](https://wiki.bloodontheclocktower.com/States)
5. **Add photos and Mika’s retelling.** Support multiple phone uploads with thumbnails, upload progress and retry. Allow a cover photo, captions and alt text. Mark photos with spoilers and select the ones cleared for publication. Let the organiser add a short teaser and optional retelling, or feature a published game’s recap for the meetup.
6. **Save, preview and publish.** Save incomplete entries as drafts. Preview both the spoiler-free view and the reveal, then publish explicitly. Require a meetup date, script, roster and outcome choice, including `Unknown`, for a public game. Let admins publish corrections or unpublish a game. If a featured game is unpublished, fall back to the basic meetup entry. Keep entered values intact if a save fails.

## Data and access

Keep the existing Nuxt and GitHub Pages setup. Prerender the two page shells and fetch the changing archive data from Supabase after the page loads. Reuse the existing `layouts/admin.vue`, `useAdminAuth`, admin navigation and authenticated request pattern. Add the public route to `utils/siteSeo.ts` and the admin route to the prerender and admin route lists.

| Record | What it stores |
| --- | --- |
| Meetup | Date and local start time, venue, optional Gatherings event reference or external signup link, first-timer note, publication status, optional teaser and featured game or meetup recap. |
| Player | Stable ID, private name for autocomplete, optional approved public display name. |
| Script version | Script name and character list. Preserve the script recorded for a past game. |
| Game | Meetup ID, script version, optional Storyteller and game number, result, death record completeness, Mika recap and publication status. |
| Game player | Game and player IDs, optional seat order, actual character and alignment, optional final character and alignment, death flag and optional final life status. |
| Game photo | Game ID, private storage object key, caption, alt text, cover and spoiler flags, and publication approval. |

- For a meetup linked to Gatherings, use its date, venue and signup destination as the source of truth. Check that a shared signup link opens the intended event on the static site. Keep the existing signup system responsible for seats and registration status.
- Enforce organiser access in Supabase using the existing server-managed admin role. Use a database transaction for the game and roster so a failed save can’t publish a partial game. Use a stable draft ID so a retry doesn’t create a second game.
- Give the public page a read-only endpoint that returns approved fields for published meetups and their published games. Keep the autocomplete directory and drafts behind organiser access. Apply explicit database grants and row-level security to exposed data, and calculate public stats from the same published game set. [Securing the Supabase API](https://supabase.com/docs/guides/api/securing-your-api), [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Use a dedicated private Supabase Storage bucket. Limit image types and sizes, resize photos for the web and strip location metadata. Serve approved public photos through short-lived signed links, issued only while their games are published. Unpublishing stops the site from issuing new links, and any already-issued links can last until expiry. Allow removal of individual images. [Supabase Storage access](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Signed URL behaviour](https://supabase.com/docs/guides/storage/serving/downloads)
- Default to private player names and unpublished photos. An organiser can add an approved nickname and clear photos for public display. The public preview helps catch names or other identifying details in captions and the recap before publication.

## Build order

1. **Try the rhythm at the next meetup.** Use the existing signup and community channel to test a short recap and a specific invitation back. Note how long it takes and what players respond to. The website build can use those first real entries.
2. **Make logging easy.** Add meetup grouping, script and character selection, returning-player autocomplete, roster copying, draft editing and outcomes. Test on a phone with two games from one meetup.
3. **Ship the public page.** Launch with the next date and signup link, a shareable recap and archive, spoiler controls, approved photos and group stats. Include preview, corrections and unpublishing in admin.

The release is ready when the next signup works from the landing page and a shared recap, a first-timer can tell what to expect, and an organiser can publish two games with a reused roster and a recap from their phone. Check that new games use one of the three presets and that existing games with older scripts can still be edited. Check a death followed by resurrection and direct links on the static build. Confirm that drafts and private media stay inaccessible to guests and signed-in non-admins. Verify that corrections and unpublishing update the archive and stats and that the other admin modules still accept the existing sign-in.

## Measure whether people come back

- **Primary measure.** Track how many first-time players join either of the next two meetups. Count actual play once per person per meetup from the private rosters, even if someone plays twice that night. Count only cohorts with two subsequent meetups and sufficiently complete rosters. Label first-timers as **first recorded** when older rosters are incomplete. Keep the counts admin-only and review them manually at first.
- **Regular attendance.** Over each set of four meetups with complete rosters, count how many distinct players came to at least two, alongside how many played at all. This shows whether a regular group is forming alongside newcomers.
- **Check what might explain the result.** Ask players who come back what brought them back. Record whether the next date was announced and whether a recap went out within two days. Track full sessions and venue or schedule changes so a busy table or a calendar clash doesn’t get attributed to the page.
- **Review after four meetups.** Look at eligible cohorts and the actual counts alongside any earlier comparable records. Ask whether sharing the recap is sustainable and where first-timers get stuck. With a small group and several changes happening together, use the numbers to decide what to try next.

## Worth adding after launch

- **Day and night timeline.** Record executions, other deaths, resurrections and role changes in order for games where the group wants a fuller retelling.
- **Richer group stats.** Add character appearances or death stats once enough games have complete records. Use game counts and clear denominators. Consider a small seasonal roundup if players enjoy revisiting past games.
