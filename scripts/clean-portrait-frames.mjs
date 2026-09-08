import sharp from "sharp";

const files = process.argv.slice(2);

for (const file of files) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const size = width * height;
  const labels = new Int32Array(size);
  const queue = new Int32Array(size);
  const sizes = [0];
  let label = 0;

  for (let start = 0; start < size; start += 1) {
    if (labels[start] || data[start * channels + 3] < 96) continue;
    label += 1;
    let head = 0;
    let tail = 0;
    let count = 0;
    queue[tail++] = start;
    labels[start] = label;

    while (head < tail) {
      const point = queue[head++];
      count += 1;
      const x = point % width;
      const y = Math.floor(point / width);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (labels[next] || data[next * channels + 3] < 96) continue;
          labels[next] = label;
          queue[tail++] = next;
        }
      }
    }
    sizes[label] = count;
  }

  const largest = sizes.reduce((best, count, index) => count > sizes[best] ? index : best, 0);
  for (let point = 0; point < size; point += 1) {
    if (labels[point] && labels[point] !== largest) data[point * channels + 3] = 0;
  }

  if (file.includes("jiang-yue-expression-1")) {
    for (let y = 0; y < height; y += 1) {
      if (data[(y * width) * channels + 3] < 96) continue;
      let gapStart = -1;
      let gapLength = 0;
      for (let x = 0; x < 72; x += 1) {
        const alpha = data[(y * width + x) * channels + 3];
        if (alpha < 96) {
          if (gapStart < 0) gapStart = x;
          gapLength += 1;
          if (gapLength >= 3) break;
        } else {
          gapStart = -1;
          gapLength = 0;
        }
      }
      if (gapLength < 3 || gapStart < 0) continue;
      for (let x = 0; x < gapStart + gapLength; x += 1) {
        data[(y * width + x) * channels + 3] = 0;
      }
    }
  }

  await sharp(data, { raw: info }).png().toFile(`${file}.clean.png`);
  await sharp(`${file}.clean.png`).toFile(file);
  const components = sizes.slice(1).sort((a, b) => b - a).slice(0, 5);
  console.log(`${file}: components ${components.join(", ")}; kept ${sizes[largest]}px`);
}
