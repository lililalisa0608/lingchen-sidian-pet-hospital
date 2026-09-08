# Design QA

## Source visual truth

- Location reveal feedback: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-93aa6172-cf5f-498b-ba45-bd9c4f80dd65.png` (3420 × 1976 px).
- Qin Zhao scale and scene feedback: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-639562bd-bfd3-4943-a177-193010dcbd04.png` (3420 × 1960 px).
- The user's written feedback is authoritative for the requested state changes: location-only entry copy, Qin interrogation outside the clinic, visually balanced character heights, dark scene transitions, restored SFX, and a non-procedural BGM loop.

## Implementation evidence

- Location reveal: `qa/implementation-location-1440x832.png` (1440 × 832 px).
- Qin dialogue at the consultation-room door: `qa/implementation-qin-dialogue-1440x832.png` (1440 × 832 px).
- Qin topic hub: `qa/implementation-qin-topics-1440x832.png` (1440 × 832 px).
- Desktop cover: `qa/implementation-cover-desktop.png` (1440 × 900 px).
- Mobile cover: `qa/implementation-cover-mobile.png` (390 × 844 px).
- Balanced portrait references: `qa/xu-dialogue-balance-reference-1440x832.png`, `qa/jiang-height-tier-1440x832.png`, and `qa/qin-height-tier-1440x832.png`.
- Combined comparison artifacts: `qa/comparison-location.png` and `qa/comparison-qin.png`.
- Desktop comparison viewport: 1440 × 832 CSS px, device scale factor 1. The source captures were normalized to 1440 × 832 with a cover crop before side-by-side comparison.
- Mobile validation viewport: 390 × 844 CSS px, device scale factor 1; measured page scroll width was exactly 390 px with no horizontal overflow.

## State and interactions tested

- Cover → phone call → three response options → location reveal.
- Exterior arrival → waiting-area witness overview → consultation-room corridor.
- All four Qin topics, evidence receipt, and enabled completion state.
- Corridor entry prompt → clinic search.
- Required evidence search, completed-hotspot removal, and enabled leave button.
- Leaving the clinic returns to the waiting area before the “who first?” discussion.
- Evidence and settings controls remained available from the opening phone scene onward.
- Production build completed successfully.
- Browser console checked after the end-to-end run; no application errors were present.

## Full-view comparison evidence

- The location reveal now retains the established exterior composition but replaces the repeated game title with the actual place name, `南桥路宠物医院`, and a single `进入` action.
- The Qin comparison shows a corridor background, removing the false implication that the interrogation happens inside the searched room.
- The cover and location reveal now use different background images and different information roles.
- Scene swaps use a dark fallback and brightness fade; the former pale frame exposure is absent.

## Focused region comparison evidence

- Title region: hierarchy is reduced to time → place → action, with no duplicated mystery-title copy.
- Portrait region: the three cutouts retain their character-specific head scale and use a restrained height hierarchy—Xu Zhiheng highest, Jiang Yue slightly lower, Qin Zhao slightly lower again. Every cutout remains fully behind the dialogue box.
- Lower dialogue region: portraits are occluded by the dialogue panel rather than showing a hard cut edge on top of it.
- Investigation region: discovered required hotspots disappear entirely, while optional undiscovered hotspots remain available.

## Comparison history

- Earlier P1: Qin interrogation used the clinic interior before the player entered the scene. Fixed by moving the hub and all topic dialogue to the consultation-room corridor. Post-fix evidence: `qa/implementation-qin-dialogue-1440x832.png`.
- Earlier P1: clinic search ended into witness discussion without leaving the room. Fixed by adding a return-to-waiting transition before the discussion. Verified in the browser at the `医院等候区 05:06` state.
- Earlier P2: scene changes exposed a bright fallback and appeared as white flashes. Fixed with image preloading, a dark stage fallback, and a dark brightness fade. Verified across exterior, waiting area, corridor, clinic, and return transitions.
- Earlier P2: Qin portrait was visibly oversized. Fixed first by reducing the portrait geometry, then refined after user review into a subtle Xu Zhiheng → Jiang Yue → Qin Zhao height hierarchy without enlarging their heads. Post-fix evidence: `qa/qin-height-tier-1440x832.png`, `qa/jiang-height-tier-1440x832.png`, and `qa/xu-dialogue-balance-reference-1440x832.png`.
- Earlier P2: sound cues were functionally present but too quiet; the evidence cue also applied the volume scalar twice. Fixed by correcting gain staging and restoring audible phone, door, and evidence cues.

## Required fidelity surfaces

- Fonts and typography: passed. Existing serif display and sans-serif UI hierarchy are preserved; new location copy fits without wrapping at desktop and mobile widths.
- Spacing and layout rhythm: passed. Location entry, dialogue box, topic cards, HUD, and portrait placement remain aligned to the established system.
- Colors and visual tokens: passed. Existing paper/green UI tokens are unchanged; transitions now use the scene's dark palette instead of a light fallback.
- Image quality and asset fidelity: passed. Supplied full-resolution background and character assets are retained; no new raster scaling artifact or cutout halo is visible at tested sizes.
- Copy and content: passed. Opening uses selected option 1; location and scene-entry copy are direct; spatial sequence is coherent.

## Findings

- No remaining actionable P0, P1, or P2 findings in the tested flow.

## Follow-up polish

- P3: If the final release needs different musical intensity by chapter, add a second licensed loop for the later confrontation rather than pitch-shifting or synthesizing the current track.

## Final result

final result: passed
