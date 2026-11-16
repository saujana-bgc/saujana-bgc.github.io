# Riichi League Season 2 Elo and Riichi Open II seeding

Pilot operating rules · 15 November 2026

Run **Riichi League Season 2** for three months using four-player Elo with **K=24**. Everyone starts at **1,500**, and players earn a rank after **eight rated hanchans across four dates**. Use the frozen Season 2 standings to build pots for **Riichi Open II**'s first qualifier. All entrants have the same registration rules and starting points. Open II results determine qualification and any final tie-break.

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
| Season close | Publish the three-month season dates and deadlines before play begins. Results are due by **11:59 pm Malaysia time on the third calendar day after play**. Corrections close at **11:59 pm on the seventh calendar day after the season ends**. Freeze the standings after resolving corrections filed on time. The highest-rated eligible player wins the season. Players with exactly equal ratings share their place. |

Use a stable league player ID. During Open registration, have an organiser confirm a player's identity if their entry name differs from their league name. The current league form assigns a table number when a result is saved, so submission order can differ from play order. [Current league score entry](../pages/riichi-league.vue#L165)

### Shared gameplay rules

Use the **World Riichi Championship (WRC) Rules 2025**, **WRC Penalties 2025** and the **29 June 2025 Official Rules Clarification** as adopted by Riichi Open I. Use ordinary fives in every suit and follow Open I's choice to play without optional WRC variants. Both events calculate an official hanchan score from final table points, placement uma and tournament-point penalties. Keep table points, unclaimed riichi sticks, shared uma where applicable, and penalties in the result record. [Open I rules and official references](../public/riichi-open/rules.md#L5) · [Open I tournament scoring](../public/riichi-open/rules.md#L69)

### Rated game completion

A rated hanchan uses Open I's **75-minute limit**. If it is still in progress at the time signal, finish the current hand and record the result. A hand reset by chombo must still be replayed. A verified timed finish counts in full for Elo and eligibility.

If play stops for a withdrawal, venue closure or other disruption, the organiser may resume the game within the season with the same four players, a recoverable game state and the remaining clock time. Void the result if those conditions cannot be met or the game cannot reach an official finish. A void game contributes neither Elo nor eligibility. A resumed game counts on its original session date, with the submission deadline measured from completion. [Open I time limits](../public/riichi-open/rules.md#L218) · [Open I chombo procedure](../public/riichi-open/rules.md#L319)

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

Borrow UEFA's ranking-based pots. UEFA uses a multi-season coefficient for seeding. Open II uses Season 2's final Elo standings. Revisit rating carryover after the pilot. [UEFA club coefficients](https://www.uefa.com/nationalassociations/uefarankings/club/) · [UEFA league-phase draw rules](https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-16-Draw-system-league-phase-Online)

1. Freeze the Season 2 standings before the Open II draw. Confirm the playing roster, including any announced substitutes.
2. Order the roster by eligible league rank. Randomise the order of unranked and provisional entrants after all ranked players. If an exact rating tie crosses a pot boundary, resolve it by a recorded random draw.
3. For 16 players, publish four **league seed pots** of four. For a field that fills a different number of four-player tables, keep four pots and set each pot's size to the number of tables.
4. Draw one player from each pot to every table. Draw initial East, South, West and North separately.

If the roster changes before seating is published, rebuild the pots and run the draw again if needed. Publication locks the draw. After publication and before Qualifier 1 starts, an announced substitute takes the vacated table seat and starting wind. Organiser substitutes play the qualifiers and are ineligible for the final. [Open I substitutes and seating](../public/riichi-open/rules.md#L47)

Example draw with nine ranked entrants out of 16

| Pot | Entrants |
| --- | --- |
| 1 | Seeds 1–4 |
| 2 | Seeds 5–8 |
| 3 | Seed 9 and three unranked entrants |
| 4 | Four unranked entrants |

With four tables of four, a fully random draw has about a **14%** chance of placing four particular top-ranked entrants at separate tables. A pot draw guarantees that spread when all four are in Pot 1. A strong visitor may still make a table tougher. All eligible entrants can reach the final through their Open results.

### Qualifier 2 and the final

Open II runs **two qualifiers and one top-four final**. Each round uses the 75-minute rule. After Qualifier 1, certify the scores and apply Open I's qualification tie-breakers. For a 16-player field, divide ranks into four bands of four (1–4, 5–8, 9–12 and 13–16). Draw Qualifier 2 so every table has **one player from each score band and one from each Qualifier 1 table**. Draw the starting winds after forming the groups. This gives players six distinct qualifying opponents when the same 16 play both rounds. For another supported field size, use Open I's second-round snake assignment. [Open I snake assignment and ties](../public/riichi-open/rules.md#L29)

Add the two qualifying hanchan scores before penalties, then deduct all qualifying penalties once. Apply Open I's tie-breakers to determine the top four eligible players and their qualification rank. Randomise the final seats. Finalists start at 30,000 each and their final score determines the result. Resolve exact final-score ties in qualification order. [Open I qualification rules](../public/riichi-open/rules.md#L104) · [Open I final tie-break](../public/riichi-open/rules.md#L137)

Before opening registration, rehearse the opening draw, the no-repeat second-round assignment and round certification with a full sample field. The current admin flow prepares Open I's snake tables, so the rehearsal needs to cover how the new assignments are recorded and published. [Current admin round workflow](../pages/admin/riichi-open.vue#L33)

## Review after the pilot

- Count how many players qualified for a league rank and how many ranked players were in the confirmed Open field.
- Check whether eligible players kept playing late in the season and how much the standings changed in the final weeks.
- Check the spread of ranked players across the opening tables and count repeat opponents across qualifiers.
- Use the results to revisit the eligibility threshold, the K-factor, and whether Elo should carry into the next three-month season.
