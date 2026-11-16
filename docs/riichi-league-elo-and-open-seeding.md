# Riichi League Season 2 Elo and Riichi Open II seeding

Pilot operating rules · Revised 16 November 2026

Run **Riichi League Season 2** from **December 2026 through 28 February 2027** using four-player Elo with **K=24**. Everyone starts at **1,500**, and players earn a rank after **eight rated hanchans across four dates**. Use the frozen Season 2 standings to build pots for **Riichi Open II**'s first qualifier in **March 2027**. Players can enter and win Open II without a league rank. Open II has **four qualifiers and a top-four final**, with a **90-minute clock** for every round. Open II results determine who advances and any final tie-break.

## What would change

Season 1 already covered three months, from 1 August to 31 October 2026. It supports three- and four-player games and counts each player's best result per day, up to their best eight days. That suits drop-in play because a later loss cannot reduce a player's season total. Elo counts each rated result and adjusts for the strength of the players at the table. [League standings logic](../pages/riichi-league.vue#L603) · [Season 1 configuration](../supabase/migrations_archive/20261002010000_create_riichi_league_data.sql#L221)

Riichi Open I used a random draw for the first qualifier, a snake assignment based on the first qualifier's results for the second, and a final for the top four. The final started at equal scores. The proposed league seeding starts with the first qualifier at Open II. [Riichi Open I tournament rules](../public/riichi-open/rules.md#1-tournament-format-event-rules)

## Riichi League Season 2

| Decision | Proposed rule |
| --- | --- |
| Starting rating | Every player starts Season 2 at **1,500**. Ratings and eligibility are based entirely on Season 2 games. Season 1 provides historical data for evaluating the format. |
| Gameplay rules | Season 2 rated games and Riichi Open II use the Riichi Open I gameplay rules, including four-player East–South hanchans, **30,000 starting points** and **no red fives**. |
| Rated games | Publish which four-player hanchans are rated before play. Count every verified completion. Keep casual tables available, including three-player games. |
| Rank eligibility | Show players as provisional until they complete **at least eight rated hanchans across at least four different dates** in the season. |
| Results and corrections | Give each hanchan a session and round number when it starts. Have the four players confirm the full result. An organiser approves corrections, then the ratings are replayed in round order. |
| Season close | Publish the December opening session date before play begins. The season ends on **28 February 2027**. Results are due by **11:59 pm Malaysia time on the third calendar day after play**. For games completed on 28 February, that is 3 March. Corrections close at **11:59 pm Malaysia time on 7 March 2027**, seven calendar days after the season ends. Freeze the standings after resolving corrections filed on time. The highest-rated eligible player wins the season. Players with exactly equal ratings share their place. |

Use a stable league player ID. During Open registration, have an organiser confirm a player's identity if their entry name differs from their league name. The current league form assigns a table number when a result is saved, so submission order can differ from play order. [Current league score entry](../pages/riichi-league.vue#L165)

The Season 2 standings on the Riichi League page will show each player's Elo, counted rated games and number of different playing dates. Players report missing or incorrect results to the league organiser with the date, session and round number, and the score they believe should be recorded.

The corrections window covers results submitted on time, including results missing from the standings. The organiser checks the original submission. If nobody at the table submitted the result by the three-day deadline, the game does not count towards Elo or rank eligibility.

### Shared gameplay rules

Use the **World Riichi Championship (WRC) Rules 2025**, **WRC Penalties 2025** and the **29 June 2025 Official Rules Clarification** as adopted by Riichi Open I. Use ordinary fives in every suit and follow Open I's choice to play without optional WRC variants. Both events calculate an official hanchan score from final table points, placement uma and tournament-point penalties. Keep table points, unclaimed riichi sticks, shared uma where applicable, and penalties in the result record. [Open I rules and official references](../public/riichi-open/rules.md#L5) · [Open I tournament scoring](../public/riichi-open/rules.md#L69)

### Rated game completion

Season 2 league games have **no time limit**. Rated games run to their normal conclusion under WRC gameplay rules. Apply the WRC replay procedure if chombo resets a hand.

Before each session, the organiser announces the latest rated start based on the venue closing time and the time a hanchan typically takes. The cutoff applies to new rated games. Tables already playing can continue to a normal finish while the venue is open.

If play stops for a withdrawal, venue closure or other disruption, the organiser may resume the game within the season with the same four players and a recoverable game state. Void the result if those conditions cannot be met or the game cannot reach an official finish. A void game contributes neither Elo nor eligibility. A resumed game counts on its original session date, with the submission deadline measured from completion. [Open I chombo procedure](../public/riichi-open/rules.md#L319)

### How Elo is calculated

Compare each player's **official hanchan score after tournament-point penalties** with each opponent's. Calculate it as `(final table points − 30,000) / 1,000 + placement uma − tournament-point penalties`. Determine placement uma from table points and split it equally among tied players before applying penalties. For example, a score of +12.4 becomes −17.6 after a 30-point chombo penalty. [Open I scoring and shared uma](../public/riichi-open/rules.md#L69) · [Open I chombo penalty](../public/riichi-open/rules.md#L264)

A higher official score earns 1, a tie earns 0.5, and a lower score earns 0. Calculate the expected result for each opponent as `1 / (1 + 10^((opponent rating − player rating) / 400))`. Subtract the expected result from the actual result, average the three differences, then multiply by **24**. Use the pre-game ratings for all four players, apply the adjustments together, and round only for display. Games played while provisional affect ratings from the first game.

At an equally rated table with four distinct official scores, first through fourth change by **+12, +4, −4 and −12 Elo**. Equal official scores count as ties regardless of starting wind.

### What the Season 1 archive shows

The archived import covers the first nine weeks. It contains **70 four-player hanchans and 34 players** in those games. Season 1 used 25,000 starting points and red fives, so the replay reflects play under those rules. [Season 1 gameplay rules](../pages/riichi-league.vue#L329)

| Minimum four-player hanchans | Minimum dates | Players who would have earned a rank |
| --- | --- | --- |
| 6 | 4 | 10 |
| 8 | 4 | 9 |
| 12 | 4 | 8 |

At the eight-game threshold, the nine eligible players had a median of **23 hanchans and 20 distinct opponents**. The threshold establishes participation. A rating from eight hanchans can still vary substantially, and the ranked share of the Open field depends on who registers. [Archived Season 1 match records](../supabase/migrations_archive/20261002010000_create_riichi_league_data.sql#L275)

Replaying the archive with K=16, 24 and 32 gave the same final order for the nine eligible players. At K=32, reversing the assumed order within each date swapped ranks 2 and 3 and moved one eligible player's rating by 8.45 points. Only two of the week-six top four were still in the top four after week nine. The replay used archived table numbers as a proxy for play order and compared raw table points. A check on weeks seven to nine found that none of these K-factors predicted pairwise finishes better than even odds in this small sample. **K=24 is a pilot choice for smaller swings.**

## Riichi Open II draw

Open II is scheduled for **March 2027**, after the final Season 2 standings are frozen. Publish the event date before registration.

Borrow UEFA's ranking-based pots. UEFA uses a multi-season coefficient for seeding. Open II uses Season 2's final Elo standings. Revisit rating carryover after the pilot. [UEFA club coefficients](https://www.uefa.com/nationalassociations/uefarankings/club/) · [UEFA league-phase draw rules](https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-16-Draw-system-league-phase-Online)

1. Freeze the Season 2 standings before the event. Publish a check-in cutoff **30 minutes before the scheduled start of Qualifier 1**. On the day, close check-in and confirm which players and announced reserves are present before drawing any tables. Use the frozen rankings of the people actually playing.
2. Order the roster by eligible league rank. Randomise the order of unranked and provisional entrants after all ranked players. If an exact rating tie crosses a pot boundary, resolve it by a recorded random draw.
3. For 16 players, publish four **league seed pots** of four. For a field that fills a different number of four-player tables, keep four pots and set each pot's size to the number of tables.
4. Draw one player from each pot to every opening table. Draw starting East, South, West and North separately at each table in each round, using the same random method throughout the event.

If the roster changes before seating is published, rebuild the pots and run the draw again if needed. Publication locks the draw.

### Check-in and no-shows

Hold seats for confirmed entrants who check in on time. Release unclaimed seats at the cutoff. Offer them first to checked-in players on the waitlist in signup order, then to on-site organiser reserves in the announced order. A player who misses the cutoff loses their reserved seat.

If there are too few players to fill the last table, run the largest field that fills tables of four and has at least four final-eligible entrants. Keep on-time confirmed entrants in order of confirmation, then draw from the waitlist and organiser reserves in their published order. For example, if 15 people are available after check-in and there is no fourth person for the last table, seat 12. Publish this fallback and the applicable registration and refund terms before taking entries. If fewer than four final-eligible entrants can be seated, postpone the tournament.

If a confirmed entrant checks in on time and cannot be seated under this fallback, refund any entry fee they paid in full.

### Refunds and rescheduling

- The registration organiser contacts confirmed on-time entrants who cannot be seated to arrange their full refund. Players can follow up through the registration contact with their entry name and payment reference.
- If the event is postponed or the remaining qualifiers move to another day, carry entries over. A player who cannot attend the new date may withdraw through the registration organiser and get a full refund. Certified rounds stay on record. Withdrawn entrants are ineligible for the final.
- Aim to issue each refund within seven calendar days of confirming eligibility and receiving any payment details needed to return it. Contact the player privately if extra details are needed.

### Withdrawals and reserves

- Before or between qualifiers, an announced reserve takes the withdrawn player's place in the remaining table assignments and joins that round's starting-wind draw. Certified results stay with the players who earned them. Record the reserve's games under the reserve's own name. A withdrawn entrant and an organiser reserve are ineligible for the final.
- If no reserve is available after play has started, hold the next qualifier while the organiser looks for a replacement. If the field cannot fill four-player tables within the event's venue window, suspend play and reschedule the remaining qualifiers. Keep all certified round results. Confirm finalists after all four qualifying rounds are certified.
- If a finalist withdraws before the final starts, offer the place to the next available eligible player in the certified qualifying standings. Apply the same qualification tie-breakers if two players are tied for the replacement place. The replacement's qualification rank applies to any final tie-break. Complete the final roster before drawing its starting winds.
- If someone withdraws during a game, stop play at that table, keep the game state and call the head referee. The referee rules on how play can resume and which result, if any, can be certified. Record the ruling with the round results.

The reserve procedure preserves the published table rotation. Verify opponent variety against the actual participants when there is a replacement. [Open I substitutes and seating](../public/riichi-open/rules.md#L47)

Example draw with nine ranked entrants out of 16

| Pot | Entrants |
| --- | --- |
| 1 | Seeds 1–4 |
| 2 | Seeds 5–8 |
| 3 | Seed 9 and three unranked entrants |
| 4 | Four unranked entrants |

With four tables of four, a fully random draw has about a **14%** chance of placing four particular top-ranked entrants at separate tables. A pot draw guarantees that spread when all four are in Pot 1. A strong visitor may still make a table tougher. All eligible entrants can reach the final through their Open results.

### Four qualifiers and the final

Build all four qualifying rounds from the event-day roster. Qualifier 1 uses the league seed pots. The rotation below gives each player **12 different opponents** when the same 16 play all four qualifiers. Publish the four rounds together before play. For a different field size, build and publish a rotation that minimises repeat opponents across the four games.

For the 16-player rotation, number the opening tables 1 to 4 and randomly assign slots 1 to 4 within each table. A player's slot becomes their Qualifier 2 table number. For Qualifiers 3 and 4, use the row for their opening table and the number in the position of their slot. For example, a player from opening table 2 in slot 3 plays at tables 3, 4 and 3 in Qualifiers 2, 3 and 4 respectively. Draw starting winds separately.

| Opening table | Qualifier 3 table by slot 1 to 4 | Qualifier 4 table by slot 1 to 4 |
| --- | --- | --- |
| 1 | 1, 2, 3, 4 | 1, 3, 4, 2 |
| 2 | 2, 1, 4, 3 | 2, 4, 3, 1 |
| 3 | 3, 4, 1, 2 | 3, 1, 2, 4 |
| 4 | 4, 3, 2, 1 | 4, 2, 1, 3 |

Generate candidate rotations after check-in. Discard rotations that put three or more of the four highest checked-in league seeds together at a later table. Compare how many of those seeds each other player faces across all four rounds. Choose randomly among candidates with the smallest gap between the highest and lowest counts. Use the available checked-in ranked players for this check if there are fewer than four.

### Saujana time rule

Open II uses WRC 2025 gameplay with a **shared 90-minute clock** for each qualifier and the final. Keep the clock visible at all tables and give a 15-minute warning. For this cutoff, a hand begins when the first tiles are taken from the wall to deal the hand. When the signal sounds, finish the hand if dealing has already begun. If the signal sounds between hands, finish scoring the previous hand and end the game. A chombo that resets the hand in progress still requires that hand to be replayed. The head referee decides any dispute about whether a hand had begun. A game can finish naturally before the signal. [Open I timing precedent](../public/riichi-open/rules.md#L218)

Allow time after each clock window to finish hands, check scores and change tables.

### Qualification and final scoring

Add the **four** qualifying hanchan scores before penalties, then deduct all qualifying penalties once. Apply Open I's tie-breakers across all four qualifiers to determine the four eligible finalists and their qualification rank. Randomise the final seats. Finalists start at 30,000 table points each and their final score determines the result. Resolve exact final-score ties in qualification order. [Open I qualification tie-breakers](../public/riichi-open/rules.md#L112) · [Open I final tie-break](../public/riichi-open/rules.md#L137)

### Example event schedule

This sample schedule starts play at **11:00 am Malaysia time**. The first qualifier is followed by a 45-minute meal break. Allow 25 minutes after each later qualifier for finishing hands, checking scores and changing tables. Later start times are targets. If play runs late, keep the 90-minute clock for each round and move the later starts. Awards follow verification of the final result. Confirm the venue and publish the actual schedule before registration.

Ask entrants to stay until the finalists and any standbys are announced, around **7:00 pm** on this schedule. Everyone except finalists and standbys can leave after the announcement. Tell standbys when their commitment ends. Finalists should plan for awards around **8:50 pm**, with room for delays.

| Time | Session |
| --- | --- |
| 10:00 am | Check-in opens |
| 10:30 am | Check-in closes, then draw and briefing |
| 11:00 am–12:30 pm | Qualifier 1 clock |
| 12:30–1:15 pm | Meal break and score checks |
| 1:15–2:45 pm | Qualifier 2 clock |
| 3:10–4:40 pm | Qualifier 3 clock |
| 5:05–6:35 pm | Qualifier 4 clock |
| 6:35–7:00 pm | Verify qualification scores and announce finalists |
| 7:00–8:30 pm | Final clock |
| About 8:50 pm | Awards |

Before registration, rehearse the 90-minute clock, the four-round rotation, and certification through the final with a sample field. Record the last completed hand and score verification time. Include a no-show at check-in, a withdrawal after Qualifier 1 with and without a reserve, and a finalist withdrawal with tied candidates for the replacement seat. Verify that the reserve appears under their own name, certified scores survive a suspension, Qualifiers 3 and 4 are published, and the final cut and replacement order use all four rounds and the same tie-breakers. The current admin flow locks the roster during play and goes from Qualifier 2 to the final. [Current admin roster and round workflow](../pages/admin/riichi-open.vue#L25)

## Review after the pilot

- Count how many players qualified for a league rank and how many ranked players were in the confirmed Open field.
- Check whether eligible players kept playing late in the season and how much the standings changed in the final weeks.
- Check the spread of ranked players across the opening tables and count repeat opponents across qualifiers.
- Use the results to revisit the eligibility threshold, the K-factor, and whether Elo should carry into the next three-month season.
