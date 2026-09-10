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
