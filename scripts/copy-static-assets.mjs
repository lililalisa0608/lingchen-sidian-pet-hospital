import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(projectRoot, "assets");
const destination = resolve(projectRoot, "dist", "assets");

const requiredAssets = [
  "audio/clean-soul.m4a",
  "audio/courtroom-cross-examination.ogg",
  "audio/hope-cross-examination.ogg",
  "audio/jazzy-cross-examination.ogg",
  "audio/judgement-cross-examination.ogg",
  "audio/sfx/cross-examination-gavel.wav",
  "audio/sfx/dialogue-thump.wav",
  "audio/sfx/door-open-close.mp3",
  "audio/sfx/evidence-acquired.wav",
  "audio/sfx/investigation-found.wav",
  "audio/sfx/phone-ring.wav",
  "backgrounds/cover-clinic-interior-v1.jpg",
  "backgrounds/hospital-exterior-v2.jpg",
  "backgrounds/isolation-room-v1.jpg",
  "backgrounds/opening-phone-v2.jpg",
  "backgrounds/second-consultation-clean-v1.jpg",
  "backgrounds/second-consultation-corridor-v1.jpg",
  "backgrounds/second-consultation-evidence-v4.jpg",
  "backgrounds/title-transition-v3.jpg",
  "backgrounds/waiting-area-cast-v2.jpg",
  "backgrounds/waiting-area-clean-v1.jpg",
  "backgrounds/waiting-area-investigation-v1.jpg",
  "characters/jiang-yue-expression-0-v1.png",
  "characters/jiang-yue-expression-1-v1.png",
  "characters/jiang-yue-expression-2-v1.png",
  "characters/jiang-yue-expressions-v1.png",
  "characters/qin-zhao-expressions-v1.png",
  "characters/lin-xia-card-v1.png",
  "characters/lin-xia-dialogue-neutral-v5.webp",
  "characters/lin-xia-dialogue-troubled-v5.webp",
  "characters/lin-xia-troubled-v2.png",
  "characters/su-qing-card-v1.png",
  "characters/su-qing-dialogue-guarded-v4.webp",
  "characters/su-qing-dialogue-neutral-v4.webp",
  "characters/su-qing-guarded-v2.png",
  "characters/tang-ning-card-v1.png",
  "characters/tang-ning-dialogue-anxious-v4.webp",
  "characters/tang-ning-dialogue-neutral-v4.webp",
  "characters/tang-ning-anxious-v2.png",
  "characters/xu-zhiheng-expression-0-v1.png",
  "characters/xu-zhiheng-expression-1-v1.png",
  "characters/xu-zhiheng-expression-2-v1.png",
  "characters/xu-zhiheng-expressions-v1.png",
  "evidence/hair-v2.webp",
  "evidence/communication-0342-v1.png",
  "evidence/complete-livestream-v1.jpg",
  "evidence/injury-v2.webp",
  "evidence/isolation-blank-card-v1.png",
  "evidence/isolation-floorplan-v1.png",
  "evidence/isolation-supplies-v1.png",
  "evidence/isolation-video-v1.png",
  "evidence/observation-reaction-v1.jpg",
  "evidence/rack-scene-v3.webp",
  "evidence/reports-v3.webp",
];

for (const directory of ["audio", "backgrounds", "characters", "evidence"]) {
  await rm(resolve(destination, directory), { recursive: true, force: true });
}

for (const relativePath of requiredAssets) {
  const outputPath = resolve(destination, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(resolve(source, relativePath), outputPath);
}
