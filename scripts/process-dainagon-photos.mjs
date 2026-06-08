import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const inboxDir = path.join(root, 'private', 'dainagon-inbox');
const galleryDir = path.join(root, 'public', 'assets', 'prelude-cache');
const manifestPath = path.join(root, 'src', 'data', 'dainagonPhotos.json');
const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tif', '.tiff']);

async function ensureDirs() {
  await fs.mkdir(inboxDir, { recursive: true });
  await fs.mkdir(galleryDir, { recursive: true });
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
}

async function readManifest() {
  try {
    return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    return [];
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  await ensureDirs();
  const manifest = await readManifest();
  const knownHashes = new Set(manifest.map((item) => item.hash));
  const entries = await fs.readdir(inboxDir, { withFileTypes: true });
  let converted = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const inputPath = path.join(inboxDir, entry.name);
    const ext = path.extname(entry.name).toLowerCase();
    if (!supported.has(ext)) continue;

    const source = await fs.readFile(inputPath);
    const hash = sha256(source).slice(0, 16);
    const outputName = `${hash}.webp`;
    const outputPath = path.join(galleryDir, outputName);

    if (knownHashes.has(hash)) {
      await fs.unlink(inputPath);
      skipped++;
      continue;
    }

    const image = sharp(source, { animated: false }).rotate();
    const metadata = await image.metadata();
    const output = await image
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();

    await fs.writeFile(outputPath, output);
    const outputMeta = await sharp(output).metadata();
    manifest.push({
      src: `/assets/prelude-cache/${outputName}`,
      width: outputMeta.width || metadata.width || 0,
      height: outputMeta.height || metadata.height || 0,
      size: output.length,
      hash,
    });
    knownHashes.add(hash);
    await fs.unlink(inputPath);
    converted++;
  }

  manifest.sort((a, b) => a.src.localeCompare(b.src));
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Dainagon photos: ${converted} converted, ${skipped} duplicates removed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
