# Saujana brand voice rollout

19 November 2026 · Implementation and editorial reference based on the current site and beginner guide

## Implementation status

The initial voice rollout is complete. The Home collage and first-visit welcome remain in place; edited pages now share the same practical invitations, recovery language and vocabulary. Established copy that already fits the voice was kept. The drafts below are reference patterns for future changes, not a list of outstanding edits.

| Pass | Completed work |
| --- | --- |
| **1. Trust and recovery** | Kept gathering sign-up wording tied to the saved list state, made Birthday Club success confirm the saved privacy choice, and replaced raw Riichi Open service errors with clear recovery steps for visitors and organisers. |
| **2. Welcome and discovery** | Aligned the Board Games and Riichi Mahjong calls to action, refined each activity’s introduction, and kept the existing Home hero collage and first-visit invitation. |
| **3. Browsing and practical tools** | Clarified the Collection empty state, used “No plays logged” in Play History, and kept game and scoring terms direct. |
| **4. Shared copy and assets** | Kept the footer and Home welcome consistent, simplified Clocktower recap copy, removed named tip attributions from the beginner guide, and aligned its furiten guidance with current Riichi Rules. Updated the displayed PDF size to 9.1 MB. |
| **5. Future copy** | Added activity-specific tone and copy patterns to `CODEX.md` for future page and event edits. |

Use Mika as the internal voice reference. Public copy speaks as Saujana. Use “we” for what the community can do and “you” for what a visitor can try. Let warmth come through in a concrete offer, such as watching a round first or asking someone to help with a first hand.

Keep the strongest lines already in use. “Find a gathering” gives visitors a clear next step. “What should we call you?” makes the name field feel personal. “Checking the calendar…” tells people what is happening. Continue to focus edits on gaps between pages and moments where a visitor needs to know exactly what happened. [Home](../pages/index.vue) · [Gatherings](../pages/gatherings.vue) · [Birthday Club](../pages/birthday-club.vue)

## Editorial rules

- Write in natural British English and sentence case. Use contractions where they sound natural. Keep established names such as Saujana Board Game Community, Board Games, Riichi Mahjong, Blood on the Clocktower, Only Blood in the Clocktower and Birthday Club. Use the game name when talking about play and the series name when naming the event.
- Give each introduction one specific invitation or reassurance. Keep the tone relaxed for Board Games, thoughtful for Riichi, gently mischievous for Clocktower and affectionate for Birthday Club. Place the humour in introductions and stories. Use plain language for consent, deadlines, errors, scoring and rules.
- Name the action a control performs. Use **Find a gathering**, **Sign up**, **Clear search**, **Reset filters** and **Try again** where those actions fit. Use a question or more conversational language in the help text if it makes the next step easier.
- Use “sign up” for the action and “sign-up” for the entry or list. Use “gathering” for a community meetup and “tournament” for Riichi Open. Use “place” when the tournament is holding or confirming a place. Use “No plays logged” when the record is empty.
- Keep the narrator invisible in visible text, alt text, accessible names, search snippets, downloadable guides and artwork with embedded text. Give informative images descriptions of what they show.
- Preserve dates, venues, prices, deadlines, eligibility, privacy choices, rules, scores and anything quoted from an approved source. Use familiar English alongside established game terms when a brief gloss helps. Keep link destinations, rule anchors and control names used by keyboard or focus handling in mind when editing. [Site voice notes](../CODEX.md)

## Rollout order

| Pass | Review and changes |
| --- | --- |
| **1. Trust and recovery** | Checked Gathering sign-up success and retry language against its saved state. Updated the Birthday Club confirmation for each privacy choice and replaced raw Riichi Open errors with visitor-friendly recovery text. [Gatherings](../pages/gatherings.vue) · [Birthday Club](../pages/birthday-club.vue) · [Riichi Open](../pages/riichi-open/index.vue) |
| **2. Welcome and discovery** | Kept the Home collage and first-visit help. Aligned Board Games and Riichi calls to action, retained the Just One puzzle, and gave each activity a fitting opening. [Home](../pages/index.vue) · [Activity cards](../utils/communityPillars.ts) · [Board Games](../pages/board-games.vue) · [Riichi Mahjong](../pages/riichi-mahjong.vue) · [Clocktower](../pages/only-blood-in-the-clocktower/index.vue) |
| **3. Browsing and practical tools** | Tightened empty states in Collection, Play History and Recaps while keeping search, score and game terms direct. Existing League, Calculator and rules copy was reviewed and retained where it already served the player clearly. [Collection](../pages/collection.vue) · [Play History](../pages/playlog.vue) · [Recaps](../pages/only-blood-in-the-clocktower/recaps.vue) · [League](../pages/riichi-league.vue) · [Calculator](../pages/riichi-calculator.vue) · [Rules](../public/riichi-open/rules.md) |
| **4. Shared copy and assets** | Kept loading announcements and page metadata factual, aligned the public welcome and footer, removed named narrator attributions from the beginner guide, and corrected its furiten wording. Tournament organiser errors now use clear recovery messages. [Public layout](../layouts/default.vue) · [404](../public/404.html) · [Search metadata](../utils/siteSeo.ts) · [Beginner guide](../public/guides/riichi-beginner-guide.pdf) · [Organiser layout](../layouts/admin.vue) |
| **5. Make future copy easy to review** | Added the approved voice patterns to `CODEX.md`. Event editors can name the activity, say what a visitor can try, then give verified logistics. Check stored event descriptions and recaps against their published facts before editing. [Site voice notes](../CODEX.md) · [Gathering descriptions](../utils/gatheringDescriptions.js) |

## Draft copy by context

| Where | Draft to try |
| --- | --- |
| **Home** | “Come play a few games with us. Coming on your own? You’re welcome to watch a round first, and we can help you find a table.” Keep **Find a gathering** as the main action and retain the activity mix where visitors need it. |
| **Board Games** | “Ocean. Blue. Big. What word would you guess? In *Just One*, matching clues disappear, so it pays to think a little differently.” Explain the rule once on the overview. |
| **Riichi Mahjong** | “You draw a tile. Does it fit your hand, or is it one to discard? Come watch a hand, or try a turn with someone beside you to help.” |
| **Clocktower** | “The town is full of stories. Who do you trust?” Follow it with the game name, next gathering and what a new player can expect. |
| **Birthday Club** | “If you’d like us to remember your birthday, share your name, month and day.” Put the public greeting choice and who can see the information beside the checkbox, using the actual privacy behaviour. |
| **Collection** | “No games match ‘{{ search }}’. Try a shorter title, or clear your search to see the whole collection.” Use **Reset filters** if category or sort settings also need clearing. |
| **Calculator** | “Choose the tile that completed your hand.” Keep terms such as **Ron**, **Tsumo** and **Honba** where they make the control clear. |
| **404** | “We couldn’t find that page. The link may be out of date.” Give the visitor **Back to home** and **Find a gathering**. |

## Draft copy for changing states

| State | Draft to try |
| --- | --- |
| **Calendar loading** | “Checking the calendar…” |
| **Calendar loaded with no upcoming dates** | “We haven’t announced the next gathering yet. Have a question? Message us on WhatsApp.” |
| **Calendar request failed** | “We couldn’t load the calendar just now.” Offer **Try again** where the page can retry. |
| **Gathering sign-up saved** | “You’re on the sign-up list, {{ name }}.” |
| **Gathering sign-up failed and the form kept its details** | “We couldn’t save your sign-up. Your details are still here, so you can try again.” |
| **Birthday saved** | “Thanks, {{ name }}. We’ve saved your birthday.” Confirm whether public greetings are on or off if the saved preference is available. |
| **Tournament place temporarily held** | “We’ll hold your place until {{ local time }}. Pay {{ fee }} and upload your receipt before then.” Use the actual deadline and payment amount. |
| **Receipt received, review pending** | “We’ve received your receipt. The organiser will check your payment. We’ll confirm your place once it’s verified.” |
| **Receipt received after the hold expired** | “Your hold expired before we received your receipt. The organiser will review your payment and check whether a place is available.” Keep recovery options and any instructions for people who have already paid beside this message. |
| **Receipt needs a clearer image** | “We couldn’t read your receipt clearly.” Follow with the available action, such as **Message the organiser**. |
| **Tournament place verified** | “Your place is confirmed. See you at {{ venue }}.” Show the venue and time from the event record. |

## Before publishing

- Walk Home → Gatherings → Sign up with a newcomer, and ask a regular to find a League result or check a hand. Check they can explain what happens next. Review the Clocktower and Birthday Club journeys for tone suited to each activity.
- Compare copy with real application states or fixtures. Cover calendar loading, empty and failure, duplicate or failed form saves, both greeting preferences, the registration hold, receipt recovery, verification and expired or closed registration. Check that every proposed action exists and that no message promises a place, a payment outcome or a public greeting the site cannot establish.
- Read the rendered copy on a phone with long event names and names with accents. Check that button names, links, errors and status announcements make sense in isolation. Compare metadata and share previews with the page title and current event edition.
- Search the public source and extract text from downloadable guides. Review visible artwork and poster text for narrator attributions. Compare any edited payment terms, consent wording, rules or archived facts with their source before approving the copy.
