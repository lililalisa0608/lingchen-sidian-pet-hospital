import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(projectRoot, "assets");
const destination = resolve(projectRoot, "dist", "assets");

const requiredAssets = [
  "audio/clean-soul.m4a",
  "backgrounds/cover-clinic-interior-v1.png",
  "backgrounds/hospital-exterior-v2.png",
  "backgrounds/opening-phone-v2.png",
  "backgrounds/second-consultation-corridor-v1.png",
  "backgrounds/second-consultation-evidence-v4.png",
  "backgrounds/title-transition-v3.png",
  "backgrounds/waiting-area-cast-v2.png",
  "backgrounds/waiting-area-clean-v1.png",
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
  "evidence/injury-v2.webp",
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
