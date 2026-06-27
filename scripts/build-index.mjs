#!/usr/bin/env node
// Baut recipes/index.json aus allen recipes/*.json Einzeldateien.
// Wird in CI (GitHub Action) und lokal genutzt: `node scripts/build-index.mjs`

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const recipesDir = join(root, "recipes");
const indexPath = join(recipesDir, "index.json");

const files = (await readdir(recipesDir))
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort();

const recipes = [];
for (const file of files) {
  try {
    const raw = await readFile(join(recipesDir, file), "utf8");
    const data = JSON.parse(raw);
    if (!data.id) data.id = file.replace(/\.json$/, "");
    recipes.push(data);
  } catch (err) {
    console.error(`⚠️  ${file} übersprungen: ${err.message}`);
    process.exitCode = 1;
  }
}

recipes.sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));

await writeFile(indexPath, JSON.stringify(recipes, null, 2) + "\n");
console.log(`✅ ${recipes.length} Rezept(e) in recipes/index.json geschrieben.`);
