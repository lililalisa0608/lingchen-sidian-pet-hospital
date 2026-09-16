# Design QA

## Source visual truth

- Duplicate/ghosted dialogue portrait report: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-9cc31311-044f-46db-92d7-069c7e6ec578.png` (3420 × 1982 px).
- Blurry witness portrait report: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-6c06aa55-b2f1-4a19-ab42-4bc12c0f73df.png` (3420 × 1964 px).
- Blurry topic-screen portrait report: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-4030a768-c6f1-4e1d-a5be-2bcd5f09eaed.png` (3420 × 1998 px).
- Xu Zhiheng right-side seam report: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-c5ed67d7-ec2d-45be-b121-5d37b58234ff.png` (3420 × 1976 px).
- The user's written report is authoritative for the black flash when opening a witness conversation.

## Implementation evidence

- Tang Ning dialogue: `qa/implementation-tang-dialogue-final.jpg` (1280 × 720 px).
- Su Qing dialogue: `qa/implementation-su-dialogue-final.jpg` (1280 × 720 px).
- Lin Xia dialogue: `qa/implementation-lin-dialogue-final.jpg` (1280 × 720 px).
- Su Qing topic hub: `qa/implementation-su-topic-final.jpg` (1280 × 720 px).
- Mobile Lin Xia dialogue: `qa/implementation-mobile-lin-dialogue-final.jpg` (393 × 852 CSS px inside the QA host viewport).
- Mobile Su Qing topic hub: `qa/implementation-mobile-su-topic-final.jpg` (393 × 852 CSS px inside the QA host viewport).
- Side-by-side source/implementation comparison: `qa/comparison-su-topic-final.jpg`.
- Xu Zhiheng seam cleanup: `qa/implementation-xu-line-fixed.jpg` (1280 × 720 px).
- Desktop viewport: 1280 × 720 CSS px, device scale factor 1.
- Mobile content viewport: 393 × 852 CSS px, device scale factor 1.

## States and interactions tested

- Neutral and restrained alternate expressions for Tang Ning, Su Qing, and Lin Xia.
- Dialogue portrait rendering for all three witnesses.
- Witness topic hub rendering with central half-body portrait and bottom fade.
- Mobile dialogue and topic layouts at 393 × 852.
- Witness selection transition path, including the direct waiting-background handoff.
- Production build.

## Full-view comparison evidence

- Dialogue uses exactly one high-resolution frame at a time; the previous base-plus-overlay composite is absent.
- All three witness portraits use independent half-body assets and maintain a restrained height hierarchy instead of identical sizing.
- Topic hubs retain the established Qin Zhao composition: central half-body portrait, visible face, topic cards around the subject, and a softened lower crop.
- Opening a witness no longer applies the dark scene-transition animation to the already-mounted waiting-room background.

## Focused region comparison evidence

- Face and hair edges remain sharp at desktop and mobile sizes, with no double face, white outline, green chroma fringe, or radial-mask ghost.
- The dialogue panel covers the lower portrait naturally; no hard cut edge is exposed above the panel.
- Expression changes replace the complete bitmap and do not stack a second portrait layer.
- Identity labels and relationship metadata remain readable on the topic screen.

## Iteration history

- P1: Two portrait bitmaps were composited for expression changes. Fixed by selecting one complete frame per line.
- P1: Source witness cutouts were only about 365–415 px wide and were being enlarged beyond 190 vh. Fixed with new roughly 1K-wide half-body sources and WebP delivery.
- P2: The first chroma-key pass left a green edge around fine hair. Fixed with boundary-connected chroma removal plus stronger spill neutralization, then rechecked on all three witnesses.
- P2: Witness selection invoked the dark scene-transition animation even though the background did not change. Fixed by using the existing waiting-room scene directly.
- P2: Low-alpha pixels from the neighbouring sprite cell survived the original component cleanup and became a dotted contour to Xu Zhiheng's right after the frame was mirrored and enlarged. Fixed by retaining the main opaque component plus only its four-pixel antialiased fringe; all disconnected translucent residue is now removed from all three Xu frames.

## Required fidelity surfaces

- Portrait scale and relative height: passed.
- Single-layer expression switching: passed.
- Image sharpness and edge cleanup: passed.
- Desktop topic composition: passed.
- Mobile dialogue and topic composition: passed.
- Background continuity on witness entry: passed.
- Production build: passed.

## Findings

- No remaining actionable P0, P1, or P2 findings in the tested portrait flow.

## Final result

final result: passed

---

## Standard-dialogue cross-examination pass — 2026-09-16

### Source visual truth

- The user's current direction supersedes the previous custom confrontation panel: the cross-examination must use the established normal dialogue box, with previous/next statement controls and separate 追问／质疑 actions.
- The previously approved PC and mobile Tang Ning portrait geometry remains the portrait baseline.

### Rendered evidence

- Headless Chrome captures inspected at 1280 × 720 and 393 × 852 CSS px for both the entry title and statement 3 of the active cross-examination.
- Desktop: the standard bottom dialogue composition remains intact; Tang Ning uses the existing right-side portrait scale; navigation and actions stay on one line without covering the statement.
- Mobile: the approved portrait position and size remain intact; the dialogue box fits the viewport; navigation remains legible; both actions are 48 px high and the page does not scroll.
- Entry title: `CROSS-EXAMINATION / 证言质疑` remains centered and readable in both viewports, with the hospital background visibly retained beneath the short transition.

### Interaction evidence

- Automated headless flow verified statement 3 → next → previous, then challenged statement 3 with 《隔离间录像》 and reached the video reveal dialogue.
- Automated headless flow also verified that the entry title automatically advances to the normal dialogue cross-examination within the expected timeout.
- Code inspection confirms that both 《使用过的治疗用品》 and 《隔离间录像》 are accepted on statement 3; the former preserves the follow-up proof step and the latter proceeds directly to the video reveal.

### Audio and implementation checks

- Story BGM mix was doubled relative to the old value, cross-examination uses a dedicated higher-energy CC0 track, door noise/thud were raised, and the routine next-line cue was reduced.
- The new BGM is present in the production asset manifest and final `dist` output.
- Production build and JavaScript syntax check passed.

### Final result

final result: passed

---

## Audio reliability, BGM audition, and loading pass — 2026-09-16

### User-reported regressions

- PC and mobile both played BGM but not dialogue advance, door, investigation, evidence, or cross-examination entry effects.
- Background scenes took too long to appear.
- The selected cross-examination track did not fit; the player needed to hear alternatives directly.
- Equivalent entry and completion actions used inconsistent verbs.

### Implemented correction

- Replaced the separate Web Audio synthesis path with six deterministic WAV assets played through the same HTML Audio mechanism already proven by BGM playback.
- Added four sound-effect test buttons and four selectable, persistent cross-examination BGM audition cards to Settings.
- Converted the ten deployed background scenes from 20+ MB of PNG files to 3.3 MB of visually inspected quality-82 JPEG files. Cover and phone are prioritized; remaining backgrounds, portraits, and evidence now preload sequentially instead of competing in one burst.
- Standardized entry actions to “进入＋地点／环节”, investigation completion to “完成调查”, and inquiry completion to “完成询问”.

### Rendered and interaction evidence

- Headless Chrome captures inspected at 1280 × 720 and 393 × 852 CSS px. The enlarged Settings modal remains readable and scrollable; PC uses a two-column track grid and mobile uses a single-column grid.
- Automated browser flow intercepted actual media play calls and verified all four test effects plus all four BGM candidates.
- Representative optimized backgrounds were inspected at original pixel dimensions; no actionable JPEG artifacts, crop changes, hotspot-coordinate changes, or portrait-layout changes were found.
- All generated WAV files pass macOS audio-container inspection; all BGM candidates pass Ogg duration and stream inspection.

### Final result

final result: passed

---

## Sentence-by-sentence testimony confrontation pass — 2026-09-14

### Source visual truth

- Existing testimony-list state supplied by the user: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-7d930442-3d5d-43e6-a39a-cc83363db106.png` (3420 × 1972 px).
- Isolation-room text/image mismatch supplied by the user: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-c0b03393-45e2-49e4-b79c-230c395726d3.png` (3420 × 1962 px).
- The user's written direction is authoritative for the redesign: show one statement at a time, switch backward/forward, and let the player choose either 追问 or 质疑 on the current statement, with a distinct interface and BGM.

### Implementation evidence

- Browser-rendered PC capture: in-app browser session at `http://localhost:4173/?qa-testimony=1`, 1280 × 720 CSS px, device scale factor 1.
- Browser-rendered mobile capture: same state at 393 × 852 CSS px, device scale factor 1.
- The in-app browser capture API does not expose a persistent filesystem path; both rendered captures were opened and visually inspected in-session before the temporary QA entry was removed.
- State: Tang Ning testimony, statement 1 initially selected; statement 2 pressed; statement 3 challenged with 《使用过的治疗用品》.

### Full-view comparison evidence

- The former four-row management panel is gone. Both viewports expose one current statement, explicit previous/next controls, current/total numbering, progress marks, and two separate actions.
- PC keeps the established hospital background, paper card, restrained green palette, and calibrated Tang Ning portrait while giving the confrontation its own composition and low-saturation red challenge action.
- Mobile preserves the portrait scale hierarchy, keeps Tang Ning's face above the statement card, and provides two 50 px-high action controls without page scrolling or viewport overflow.
- The isolation narration now says “几个空笼位”, matching the several visible empty cages.

### Focused region comparison evidence

- Typography: display serif remains limited to the confrontation title and statement; labels/counters use compact sans/monospace hierarchy and remain legible at both viewports.
- Spacing/layout: the PC statement card and arrows stay left of Tang Ning; the mobile card, 42 px arrow rails, progress marks, instruction, and action row remain separated with no overlap.
- Colors/tokens: paper, deep green, and muted blue-green stay consistent with the game; muted brick red is reserved for the destructive-sounding “质疑” action and maintains white-text contrast.
- Image quality: the existing high-resolution anxious Tang Ning frame is reused without stretching or changing the approved PC/mobile portrait geometry.
- Copy/content: current sentence, `STATEMENT NN`, current/total count, “尚未追问/已追问”, and the two action labels all correspond to actual interactive state.
- Icons: all visible controls use the installed Phosphor icon family; no placeholder icon or custom SVG was introduced.

### Interactions and audio checked

- Previous/next buttons loop through the four statements.
- ArrowRight keyboard navigation moved from statement 1 through statements 2 and 3.
- Pressing statement 2 entered its dialogue and returned with “已追问” preserved.
- Challenging statement 3 opened the evidence selector; choosing 《使用过的治疗用品》 entered the correct contradiction dialogue.
- The testimony track is included in the production asset manifest; entering testimony selects it without restarting it after every press, and the second-round ending restores the story track.
- Browser console warnings/errors: none.

### Comparison history

- P1: the original list exposed all four statements and coupled statement selection with immediate pressing, so there was no deliberate sentence-by-sentence confrontation. Fixed with a single-statement carousel and separate 追问/质疑 actions; post-fix captures show the complete new interaction model on PC and mobile.
- P2: the first mobile pass placed the title divider across Tang Ning's face and let his hair approach the HUD controls. Fixed by removing the mobile divider and lowering/shifting the portrait; the post-fix 393 × 852 capture shows a clear face, unobstructed controls, and intact card hierarchy.

### Findings

- No remaining actionable P0, P1, or P2 findings in the tested testimony flow.
- P3 follow-up: a future chapter can add a brief one-time “证言开始” transition, but it is not needed for the current interaction to read clearly.

### Final result

final result: passed

---

## Playable script 02 implementation pass

### Added surfaces

- Isolation-room 16:9 investigation with four required hotspots and four new evidence reveals.
- Lin Xia second-round inquiry using the approved witness topic template.
- Tang Ning testimony navigation, per-statement questioning, evidence presentation, wrong-answer recovery, inference choice, and the 03:42—03:46 timeline conclusion.
- Updated report evidence and the new 03:42 communication record, bringing the evidence book to nine items.

### Browser verification

- Desktop viewport: 1280 × 720 CSS px. Completed the full playable flow from cover through the second-round ending.
- Mobile viewport: 393 × 852 CSS px. Repeated the full flow and verified the horizontally panned isolation scene at both left/center and right-side targets.
- Desktop and mobile both verified: four isolation hotspots, leave gating, all four second-round Lin topics, all four testimony statements, evidence selector, wrong inference returning to the same question, two-stage contradiction evidence, and final chapter transition.
- Mobile-specific checks passed for the 985px-wide interaction canvas inside the 393px scroller, saved horizontal position, topic grid, vertically scrollable testimony statements, and vertically scrollable nine-item evidence selector.
- Browser console warnings/errors: none.
- Production build and static-asset copy: passed.

### Findings

- No remaining actionable P0 or P1 findings.
- Mobile report-update toast was moved below the HUD so it no longer obscures the testimony heading.

### Final result

final result: passed

---

## Mobile Tang Ning scale and protagonist balance pass

### Finding

- At 393 × 852, Tang Ning's face remained about one visual tier smaller than Jiang Yue's and the asymmetric transparent source canvas made him read left of the right-side dialogue baseline.
- Xu Zhiheng's mobile portrait read slightly too massive beside the rest of the cast because both his head and dark-jacket shoulder silhouette were enlarged together.

### Implemented correction

- Enlarged Tang Ning's mobile dialogue frame proportionally, lowered its bottom anchor so the crown stays between Xu Zhiheng and Jiang Yue, and compensated the right anchor for the source-canvas face offset.
- Reduced Xu Zhiheng's mobile frame slightly while preserving his position as the tallest character and keeping his face within the established same-viewport tolerance.
- Desktop dialogue, both Tang Ning expressions, and the inquiry layout remain unchanged.

### Verification

- Same-viewport mobile captures: `qa/qa-mobile-xu-adjusted.png`, `qa/qa-mobile-jiang-current.png`, `qa/qa-mobile-tang-adjusted.png`, and `qa/qa-mobile-tang-adjusted-anxious.png`.
- Desktop neutral/alternate dialogue and desktop/mobile inquiry screens were rechecked with the same active CSS and source assets.
- The portrait aspect ratios, transparency, dialogue-panel overlap, expression alignment, and crown-height order all pass.
- Production build and whitespace checks pass.

### Final result

final result: passed

---

## Scene-wide dialogue advance pass

### Finding

- Dialogue progression previously depended on clicking the dialogue panel, which made the otherwise open stage feel non-interactive and was especially awkward on mobile.
- A full-stage tap target needed to coexist with mobile swiping and with HUD, modal, choice, and hotspot interactions without accidental progression.

### Implemented correction

- Added an independent pointer gesture to the game stage while dialogue is active: a primary-button tap on the non-interactive scene advances exactly one line.
- Movement beyond 12 px is treated as a drag/swipe and does not advance dialogue.
- Dialogue, HUD, modal, choice, form, link, and button surfaces are excluded from the stage gesture; their existing interactions remain unchanged.
- Kept dialogue-panel clicking and the explicit advance control, and changed the visible desktop/mobile hint to “点击画面继续”.
- Added the pointer cursor to the stage only while dialogue is active on pointer-based devices.

### QA evidence

- Desktop: background tap advanced exactly one line; dialogue-panel tap advanced exactly one line; opening and closing Settings did not advance dialogue.
- Mobile viewport 393 × 852: background tap advanced exactly one line; a 185 px horizontal drag did not advance; dialogue-panel tap advanced exactly one line; the hint remained visible.
- Production build and whitespace checks passed.

### Final result

final result: passed

---

## Mobile witness layout parity pass

### Finding

- P1: Tang Ning, Su Qing, and Lin Xia still used three unrelated mobile dialogue boxes, so their visible head scale and vertical anchors diverged from Xu Zhiheng, Jiang Yue, and Qin Zhao even though desktop had been calibrated.
- P1: Their portrait-mode inquiry images used the same `contain` rule despite materially different transparent canvas margins, producing visibly different face sizes inside Qin Zhao's otherwise identical inquiry frame.

### Implemented correction

- Replaced the three ad-hoc mobile dialogue boxes with the protagonist group's right-side portrait template and calibrated only intrinsic-ratio width/height plus the bottom anchor needed for each source asset.
- Preserved the requested mobile crown-height order: Xu Zhiheng, Tang Ning, Jiang Yue, Lin Xia, then Qin Zhao and Su Qing at approximately the same height.
- Reused Qin Zhao's exact portrait-mode inquiry container, card grid, bottom fade, and finish-button geometry; only source-canvas compensation differs so the visible heads land at the same scale.
- Neutral and alternate frames retain identical geometry, so expression changes do not jump, stretch, or drift.

### Verification

- Same-viewport mobile comparison performed at 393 × 852 CSS px for Xu Zhiheng, Jiang Yue, Qin Zhao, Tang Ning, Su Qing, and Lin Xia.
- Tang Ning, Su Qing, and Lin Xia inquiry screens were compared directly with Qin Zhao's inquiry screen at the same viewport.
- Source aspect ratios remain intact; no `scaleY`, non-uniform transform, or raster stretching is used.
- Production build passed after removing the temporary portrait-QA route.

### Final result

final result: passed

---

## Tang Ning desktop alignment correction

### Source visual truth

- User-reported oversized and left-shifted Tang Ning dialogue portrait: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-f0adf22e-ffbc-4b94-bae4-91003ef53c3d.png`.
- Jiang Yue comparison reference: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-5d9bc626-fba7-4c70-bba7-d918fe49ca7b.png`.

### Implemented correction

- Reduced Tang Ning's desktop intrinsic-ratio box from 72 × 108 vh to 65.7 × 98.5 vh.
- Shifted the desktop right anchor inward by 8 vh so the visible portrait center aligns with Jiang Yue despite Tang Ning's asymmetric transparent source margins.
- Raised the lower anchor to -8.8 vh, keeping Tang Ning's crown only slightly above Jiang Yue without enlarging his head or shoulders.
- Mobile dialogue geometry remains on its existing portrait-specific mobile calibration.

### Verification

- Neutral Tang Ning and Jiang Yue were inspected sequentially at the same 1710 × 984 CSS viewport; visible portrait centers align and Tang Ning's body width is now slightly narrower.
- Tang Ning's anxious expression uses the same box and anchor and shows no jump or drift.
- Tang Ning mobile neutral/alternate dialogue and inquiry screens were rechecked at 393 × 852 CSS px.
- Image aspect ratio, transparency, lower dialogue overlap, inquiry layout, and expression switching remain intact.

### Final result

final result: passed

---

## Lin Xia right-edge repair

### Finding

- P1: Both Lin Xia dialogue frames ended at the source canvas inside her right sleeve and backpack, leaving a conspicuous vertical missing section on dialogue and inquiry screens.

### Implemented correction

- Reconstructed only the missing sleeve/backpack continuation in added transparent canvas space, then composited the untouched original portrait over it so the face, pose, proportions, expression art, and established layout remain unchanged.
- The neutral and troubled expressions share the same repaired body edge, preventing geometry shifts when the expression changes.
- Expanded Lin Xia's intrinsic-ratio frame width to account for the wider transparent canvas; visible head size and crown height remain on the previous calibrated baseline.

### Post-fix evidence

- Desktop neutral dialogue: `qa/implementation-dialogue-lin-right-edge-final.png`.
- Desktop troubled dialogue: `qa/implementation-dialogue-lin-troubled-right-edge-final.png`.
- Mobile portrait dialogue: `qa/implementation-mobile-dialogue-lin-right-edge-final.png`.
- Desktop inquiry screen: `qa/implementation-topic-lin-right-edge-final.png`.

### Final result

final result: passed

---

## Published witness-portrait asset verification

### Finding and fix

- P0: All six new witness dialogue-frame WebP files were referenced by `game-data.js` but absent from the static deployment copy manifest. Local development rendered them from the source tree, while the published build returned no portrait asset for Tang Ning, Su Qing, or Lin Xia on both dialogue and inquiry screens.
- Fix: added both semantic frames for all three witnesses to `scripts/copy-static-assets.mjs` and rebuilt the static deployment.

### Verification

- The production build now contains `tang-ning-dialogue-neutral-v4.webp`, `tang-ning-dialogue-anxious-v4.webp`, `su-qing-dialogue-neutral-v4.webp`, `su-qing-dialogue-guarded-v4.webp`, `lin-xia-dialogue-neutral-v4.webp`, and `lin-xia-dialogue-troubled-v4.webp` under `dist/assets/characters/`.
- Portrait CSS, scale, crop, topic layout, expression switching, typography, colors, and copy are unchanged from the previously passed visual comparison.
- The corrected package is ready for public deployment verification.

### Final result

final result: passed

---

## Tang Ning scale correction

### Source visual truth

- User-reported Tang Ning dialogue layout: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-d8617265-84a0-4502-829d-3f22732d2cdf.png`.
- Same-viewport protagonist references: `qa/qa-dialogue-xu-ref.jpg` and `qa/qa-dialogue-jiang-ref.jpg`.

### Comparison history

- P1: Tang Ning's previous 52 vh × 78 vh frame left his head and shoulders visibly smaller than the protagonist group while his crown sat too close to Xu Zhiheng's height.
- Fix: enlarged the intrinsic-ratio frame to 72 vh × 108 vh and lowered its anchor to -18 vh. This increases apparent head and shoulder scale without stretching the asset, while keeping Tang Ning's crown below Xu Zhiheng and just above Jiang Yue.
- Mobile fix: recalibrated the same frame to 62 dvh × 93 dvh with a -2 dvh lower anchor so the portrait remains proportional and the face stays unobstructed in portrait orientation.

### Post-fix evidence

- Desktop implementation: `qa/implementation-dialogue-tang-size-final.png` (1280 × 720 px, CSS viewport 1280 × 720, device scale factor 1).
- Mobile implementation: `qa/implementation-mobile-dialogue-tang-size-final.jpg` (393 × 852 content iframe inside the 1280 × 720 capture host, device scale factor 1).
- Combined same-viewport comparison: `qa/comparison-tang-height-size-final.jpg`.
- Full-view comparison confirms the requested crown order: Xu Zhiheng, Tang Ning, Jiang Yue.
- Focused portrait comparison confirms a materially larger Tang Ning head and shoulder scale, preserved aspect ratio, clean transparency, and no hard lower crop above the dialogue panel.

### Required fidelity surfaces

- Fonts and typography: unchanged and passed.
- Spacing and layout rhythm: portrait scale and vertical anchor passed.
- Colors and visual tokens: unchanged and passed.
- Image quality and asset fidelity: sharpness, aspect ratio, transparency, and crop passed.
- Copy and content: unchanged and passed.

### Findings

- No remaining actionable P0, P1, or P2 findings in the corrected Tang Ning dialogue portrait.

### Final result

final result: passed

---

## Witness template-replication pass

### Source visual truth

- Witness topic screens before replication: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-824ef6ed-c196-4103-ab95-89631852b96c.png`, `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-cd037cbd-6209-4203-a0d7-f03af6b5d53b.png`, and `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-09ac81e1-bfdf-44c3-a0a2-7c90ae9cdf3d.png`.
- Qin Zhao topic-screen target: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-6a7913b7-972b-44d0-8f1c-7c1022721ac5.png`.
- Witness dialogue screens before replication: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-d8617265-84a0-4502-829d-3f22732d2cdf.png`, `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-7ec09566-4dfa-4d8f-9741-4d49a192c193.png`, and `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-8da28a40-1018-4cee-ad8d-9b5de7f53e9e.png`.
- Qin Zhao dialogue target: `/var/folders/js/200hxcrs2nbcv8sx79j7l_740000gn/T/codex-clipboard-1ab36b4f-52dc-4cce-8f93-e6caea2bd775.png`.

### First comparison findings

- P1: The three witness topic screens used custom 118–124 vh portrait scaling and an extra central identity block, so they did not share Qin Zhao's visual template.
- P1: Witness dialogue portraits used a custom 84 vh-wide, 94–98 vh-high scheme that placed them too high and too far left relative to the protagonist-group baseline.

### Implemented corrections

- All witness topic screens now inherit Qin Zhao's exact `.topic-person` geometry, topic-card positions, connectors, bottom fade, and finish-button treatment. The extra central identity block was removed.
- Witness dialogue portraits now reuse the protagonist group's right-side anchoring and intrinsic-aspect portrait boxes. Their crown heights were calibrated against same-viewport captures of Xu Zhiheng, Jiang Yue, and Qin Zhao.
- The intended height order is preserved: Tang Ning sits between Xu Zhiheng and Jiang Yue; Lin Xia sits between Jiang Yue and Qin Zhao; Su Qing is approximately Qin Zhao's height.
- Alternate expressions use the same box and anchor as the neutral frame, preventing scale jumps, ghosting, and outline drift.

### Post-fix implementation evidence

- Final topic screens: `qa/implementation-topic-tang-template-final.jpg`, `qa/implementation-topic-su-template-final.jpg`, and `qa/implementation-topic-lin-template-final.jpg`.
- Final dialogue screens: `qa/implementation-dialogue-tang-template-final.jpg`, `qa/implementation-dialogue-su-template-final.jpg`, and `qa/implementation-dialogue-lin-template-final.jpg`.
- Alternate-expression checks: `qa/implementation-dialogue-tang-alt-replica.jpg`, `qa/implementation-dialogue-su-alt-replica.jpg`, and `qa/implementation-dialogue-lin-alt-replica.jpg`.
- Same-viewport protagonist references: `qa/qa-dialogue-xu-ref.jpg`, `qa/qa-dialogue-jiang-ref.jpg`, and `qa/qa-dialogue-qin-ref.jpg`.
- Mobile checks: `qa/implementation-mobile-dialogue-tang-replica.jpg`, `qa/implementation-mobile-dialogue-su-replica.jpg`, `qa/implementation-mobile-dialogue-lin-replica.jpg`, and `qa/implementation-mobile-topic-su-replica.jpg`.
- Topic-template comparison: `qa/comparison-topic-template-final.jpg`.
- Dialogue height comparison: `qa/comparison-dialogue-height-final.jpg`.
- Desktop viewport: 1280 × 720 CSS px, device scale factor 1.
- Mobile content viewport: 393 × 852 CSS px.

### Required fidelity surfaces

- Qin Zhao topic-template replication: passed.
- Protagonist dialogue-layout replication: passed.
- Requested relative-height hierarchy: passed.
- Alternate-expression geometry: passed.
- Desktop and mobile portrait visibility: passed.
- Production build: passed.

### Final result

final result: passed
