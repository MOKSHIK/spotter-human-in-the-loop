import path from "path";
import fs from "fs";
import { imageSize } from "image-size";
import { db } from "./db";

const IMAGES_DIR = path.join(__dirname, "..", "data", "PNGImages");

function run(sql: string, params: any[] = []) {
  return new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

async function seedImages() {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error("PNGImages folder not found at:", IMAGES_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.toLowerCase().endsWith(".png"));
  console.log("Found images:", files.length);

  for (const filename of files) {
    const fullPath = path.join(IMAGES_DIR, filename);
    const fileBuffer = fs.readFileSync(fullPath);
    const dim = imageSize(fileBuffer);

    const width = dim.width ?? 0;
    const height = dim.height ?? 0;

    if (!width || !height) {
      console.warn("Skipping (no dimensions):", filename);
      continue;
    }

    await run(
      `INSERT OR IGNORE INTO images (filename, width, height, state)
       VALUES (?, ?, ?, 'Unlabeled')`,
      [filename, width, height]
    );
  }

  console.log("Image seeding complete.");
  process.exit(0);
}

seedImages().catch((err) => {
  console.error(err);
  process.exit(1);
});