# Riichi Open I — Instagram portrait graphic plan

Revised 27 October 2026 after the layout review. Deliverable: one event announcement graphic, 1080 × 1350 px (4:5), a phone-size reading preview and an editable composition.

## Direction

A warm ivory invitation with the exact event name **“Riichi Open I”** as a large, single-line headline, and Mika as the main illustration on the right. “Riichi Mahjong tournament” is a separate descriptive subtitle, not part of the event name. Keep the hierarchy: event name → date and time → venue → fee and capacity → registration.

Colours follow the website: ivory `#F7F5EF`, matcha `#354C3E`, bronze `#8A6A3E`, dark text `#393D35`, and a pale warm-neutral panel `#EFEEE7`. Playfair Display for the event title; Segoe UI for practical details. Reserve 64 px outer margins for all essential content.

## Assets and logo protection

- Original logo: `C:/Projects/others/saujana-bgc-tools/assets/images/transparent.png`.
- Identical existing production copy: `C:/Projects/saujanabgc/riichi-open/output/ig-event-graphic/assets/saujana-logo.png`.
- Mika: `C:/Projects/saujanabgc/riichi-open/output/ig-event-graphic/assets/mika-one-man.png`.
- Previous composition reference: `C:/Projects/saujanabgc/riichi-open/output/ig-event-graphic/riichi-open-i-one-man-v5.png`.

The logo copies have identical SHA-256 hashes: `98afa0c4511d6aa92891b57599e14b191ba3239fc4d5cf13d076cc8320b5ebc3`.

Place the original logo as a separate locked image layer, centred at the top. Its source is 768 × 512 px; at 260 px wide it is approximately 173 px tall. Position it at y64–237, leaving a clear gap before the headline. Retain the complete mark and lettering. Preserve its colours, transparency and aspect ratio. No cropping, redrawing, recolouring, stretching, glow, shadow, outline or AI reconstruction. Keep clear space around it and keep Mika and ornaments outside that space. The small logo lettering is secondary to recognisable, faithful branding; do not alter it to increase readability. Compose the original logo directly from its image file.

Reuse Mika holding the one-man tile and pointing toward the title. Preserve her olive hair, cream flower, floral kimono, hands and tile. Maintain a clear silhouette and keep the tile visible. No new illustration is required for this plan.

## Composition

| Area | Content and treatment |
| --- | --- |
| Header, y64–237 | Complete original logo, 260 × approximately 173 px, centred horizontally. No additional ornaments. |
| Headline, approximately y270–395 | “Riichi Open I” on one centred line, approximately 112 px. Measure the complete phrase before placement. |
| Subtitle, approximately y410–460 | “Riichi Mahjong tournament”, centred, 38–40 px. |
| Left date panel, y500–710 | Approximately 455 px wide. Three deliberate lines: “SATURDAY”, “14 November”, “2026 · 2:30 pm”. The year does not compete for room on the large date line. |
| Left venue, approximately y740–840 | “Boardroom Bandit” and “Ara Damansara” on two lines, 42 px and 38 px respectively. |
| Left fee and capacity, approximately y870–980 | “RM10 entry” at 48 px and “16 places” at 36–38 px, on separate lines. |
| Left format, approximately y1010–1100 | “2 East–South qualifiers” and “Top 4 final”, 36 px, with comfortable line spacing. |
| Mika, approximately x566 / y480 | Approximately 432 × 648 px, preserving the original full figure and one-man tile. A pale arch may sit behind her. Her silhouette stays clear of the information column and footer. |
| Footer, y1160–1286 | Full-width green registration band. Use “Register online” and the real website address. No QR in the primary Instagram graphic. |

Essential supporting copy stays at least 36 px on the master: approximately 13 px at a 390 px preview width. The headline is approximately 112 px; date 52 px; time 40–42 px; venue 38–42 px; fee 48 px; registration heading 44 px. The long website address may use 34–36 px within the full-width footer. Use actual font measurements and reject text collisions; these coordinates are layout budgets, not permission to squeeze text. Reduce copy or decoration before reducing the essential text sizes.

## On-graphic copy

```text
Riichi Open I
Riichi Mahjong tournament

SATURDAY
14 November
2026 · 2:30 pm

Boardroom Bandit
Ara Damansara

RM10 entry
16 places

2 East–South qualifiers
Top 4 final

Register online
saujana-bgc.github.io/riichi-open
```

The caption carries the winner’s prize, four-player format, WRC rules and payment process. Do not invent a prize type or value, a registration deadline, teaching claims or payment-confirmation promises. Keep the headline text exactly “Riichi Open I”, including the Roman numeral I.

## Registration action

The registration destination is `https://saujana-bgc.github.io/riichi-open/`. Use the readable address on the graphic and in the caption. If the Instagram profile is confirmed to contain that link, the primary CTA may become “Register via the link in bio”. Until then, use the honest fallback “Register online”.

Remove the old demo QR from the primary Instagram composition. A separate QR version can be produced later for cross-screen sharing or print; it needs its own larger footer and a verified code for the real registration URL. Do not squeeze it into the primary graphic’s 126 px registration band.

## Suggested caption

Riichi Open I is coming to Boardroom Bandit, Ara Damansara, on Saturday, 14 November. Play starts at 2:30 pm.

RM10 entry, 16 places and a prize for the winner. This is a four-player Japanese Riichi Mahjong tournament. Play two East–South qualifying hanchans; the Top 4 advance to a final starting from equal scores. Gameplay follows WRC Rules 2025 with the official clarification.

Register at https://saujana-bgc.github.io/riichi-open/ and upload your payment receipt. The organiser will review your payment before confirming your place.

## Production checks

1. Confirm the logo is the original image layer with its full design, colours and proportions intact.
2. Check Mika’s face, hands and the one-man tile at full size.
3. Review the whole composition at approximately 390 px wide. The event name, date, time, venue, fee and registration action must be readable.
4. Check the headline is exactly “Riichi Open I”, and verify all practical event details against the registration page.
5. Confirm the real registration destination opens. Use a bio-link claim only if the profile has been updated.
6. Verify that no demo labels, demo QR or placeholder links remain.
7. Export an sRGB PNG and retain the editable composition with separate logo, Mika and text layers. Record the original logo file hash so the supplied artwork can be traced without ambiguity.

## Implemented output

The revised composition is saved in `output/riichi-open-instagram/`, including the full-size PNG, 390 px and 540 px previews, editable `render.cjs`, original assets and suggested caption. The final headline is exactly “Riichi Open I”. The original logo hash was verified during rendering. Both the full-size graphic and the 390 px preview were visually reviewed.
