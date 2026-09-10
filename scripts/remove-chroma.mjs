import sharp from "sharp";

const [input, output] = process.argv.slice(2);

if (!input || !output) {
  console.error("usage: node scripts/remove-chroma.mjs input.png output.png");
  process.exit(2);
}

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (low, high, value) => {
  const t = clamp01((value - low) / (high - low));
  return t * t * (3 - 2 * t);
};

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixelCount = info.width * info.height;
const background = new Uint8Array(pixelCount);
const queue = new Uint32Array(pixelCount);
let queueStart = 0;
let queueEnd = 0;

const isChroma = (index) => {
  const offset = index * info.channels;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return green > 72 && green - Math.max(red, blue) > 9;
};

const enqueue = (index) => {
  if (background[index] || !isChroma(index)) return;
  background[index] = 1;
  queue[queueEnd++] = index;
};

for (let x = 0; x < info.width; x += 1) {
  enqueue(x);
  enqueue((info.height - 1) * info.width + x);
}
for (let y = 0; y < info.height; y += 1) {
  enqueue(y * info.width);
  enqueue(y * info.width + info.width - 1);
}

while (queueStart < queueEnd) {
  const index = queue[queueStart++];
  const x = index % info.width;
  const y = Math.floor(index / info.width);
  if (x > 0) enqueue(index - 1);
  if (x + 1 < info.width) enqueue(index + 1);
  if (y > 0) enqueue(index - info.width);
  if (y + 1 < info.height) enqueue(index + info.width);
}

for (let offset = 0; offset < data.length; offset += info.channels) {
  const index = offset / info.channels;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const originalAlpha = data[offset + 3];
  const nonGreenPeak = Math.max(red, blue);
  const greenDominance = green - nonGreenPeak;

  if (background[index]) {
    data[offset + 3] = 0;
    continue;
  }

  // Key any isolated chroma remnants, then neutralize spill on retained pixels.
  // Flood filling first keeps naturally green clothing intact because it is not
  // connected to the chroma plate at the image boundary.
  const dominanceKey = smoothstep(12, 70, greenDominance);
  const brightnessKey = smoothstep(95, 205, green);
  const keyStrength = dominanceKey * brightnessKey;
  const retained = 1 - keyStrength;

  data[offset + 3] = Math.round(originalAlpha * retained);

  // Remove green spill from retained edge pixels before compositing. The real
  // teal clothing is blue-balanced, while chroma contamination is strongly
  // green-dominant, so this keeps wardrobe color intact.
  const spillStrength = smoothstep(1, 22, greenDominance);
  if (spillStrength > 0.01 && retained > 0.01) {
    const neutralGreen = Math.min(green, nonGreenPeak);
    data[offset + 1] = Math.round(green * (1 - spillStrength) + neutralGreen * spillStrength);
  }
}

await sharp(data, { raw: info })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(output);
