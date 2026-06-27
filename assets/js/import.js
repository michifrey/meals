// Rezept-Import von einer URL über Schema.org / JSON-LD.
// GitHub Pages ist rein statisch -> Abruf über öffentliche CORS-Proxys.

import { slugify } from "./store.js";

// Mehrere Proxys als Fallback, falls einer ausfällt.
const PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

export async function importFromUrl(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Bitte eine vollständige URL mit https:// angeben.");

  let html = null;
  let lastErr = null;
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url), { headers: { Accept: "text/html" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
      if (html && html.length > 200) break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!html) throw new Error(`Seite nicht erreichbar (${lastErr?.message || "unbekannt"}).`);

  const recipe = parseRecipeFromHtml(html, url);
  if (!recipe) throw new Error("Auf der Seite wurde kein strukturiertes Rezept (JSON-LD) gefunden.");
  return recipe;
}

function parseRecipeFromHtml(html, sourceUrl) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];

  for (const script of scripts) {
    let data;
    try {
      data = JSON.parse(script.textContent.trim());
    } catch {
      continue;
    }
    const node = findRecipeNode(data);
    if (node) return mapJsonLdRecipe(node, sourceUrl);
  }
  return null;
}

// Sucht rekursiv nach einem Knoten vom @type "Recipe".
function findRecipeNode(data) {
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const type = item["@type"];
    const isRecipe = Array.isArray(type) ? type.includes("Recipe") : type === "Recipe";
    if (isRecipe) return item;
    if (item["@graph"]) {
      const found = findRecipeNode(item["@graph"]);
      if (found) return found;
    }
  }
  return null;
}

function mapJsonLdRecipe(node, sourceUrl) {
  const name = textOf(node.name) || "Importiertes Rezept";
  return {
    id: slugify(name),
    name,
    description: textOf(node.description),
    image: imageOf(node.image),
    emoji: "🍽️",
    category: listOf(node.recipeCategory),
    tags: listOf(node.keywords),
    servings: parseServings(node.recipeYield),
    prepTime: formatDuration(node.prepTime),
    cookTime: formatDuration(node.cookTime || node.totalTime),
    ingredients: listOf(node.recipeIngredient).map(parseIngredient),
    steps: parseInstructions(node.recipeInstructions),
    source: textOf(node.url) || sourceUrl,
  };
}

function textOf(v) {
  if (!v) return "";
  if (typeof v === "string") return decodeEntities(v.trim());
  if (Array.isArray(v)) return textOf(v[0]);
  if (typeof v === "object") return textOf(v.name || v.text || v["@value"]);
  return String(v);
}

function listOf(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(textOf).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [textOf(v)].filter(Boolean);
}

function imageOf(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return imageOf(v[0]);
  if (typeof v === "object") return v.url || v["@id"] || "";
  return "";
}

function parseServings(v) {
  if (!v) return 0;
  const s = Array.isArray(v) ? v[0] : v;
  const m = String(s).match(/\d+/);
  return m ? Number(m[0]) : 0;
}

// ISO-8601-Dauer (PT30M) -> lesbar.
function formatDuration(v) {
  if (!v) return "";
  const s = String(v);
  const m = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return s;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  if (!h && !min) return "";
  return [h ? `${h} h` : "", min ? `${min} min` : ""].filter(Boolean).join(" ");
}

function parseInstructions(v) {
  if (!v) return [];
  if (typeof v === "string") {
    return v.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(v)) {
    const steps = [];
    for (const item of v) {
      if (typeof item === "string") { steps.push(decodeEntities(item.trim())); }
      else if (item?.["@type"] === "HowToSection" && Array.isArray(item.itemListElement)) {
        steps.push(...parseInstructions(item.itemListElement));
      } else if (item?.text) {
        steps.push(decodeEntities(textOf(item.text)));
      } else if (item?.name) {
        steps.push(decodeEntities(textOf(item.name)));
      }
    }
    return steps.filter(Boolean);
  }
  return [];
}

// Versucht "400 g Mehl" in {amount, unit, name} zu zerlegen.
function parseIngredient(line) {
  const text = decodeEntities(String(line).trim());
  const m = text.match(/^([\d.,/¼½¾⅓⅔\s]+)?\s*([a-zA-ZäöüÄÖÜ.]+)?\s+(.*)$/);
  const units = ["g", "kg", "ml", "l", "el", "tl", "stk", "stück", "prise", "dose", "pck", "packung", "bund", "tasse", "cup", "tbsp", "tsp"];
  if (m && m[1]) {
    const amount = parseAmount(m[1]);
    const maybeUnit = (m[2] || "").toLowerCase().replace(".", "");
    if (units.includes(maybeUnit)) {
      return { amount, unit: m[2], name: m[3] };
    }
    return { amount, unit: "", name: ((m[2] || "") + " " + m[3]).trim() };
  }
  return { amount: null, unit: "", name: text };
}

function parseAmount(s) {
  s = s.trim().replace("¼", "0.25").replace("½", "0.5").replace("¾", "0.75").replace("⅓", "0.33").replace("⅔", "0.67");
  if (s.includes("/")) {
    const [a, b] = s.split("/").map((x) => Number(x.replace(",", ".")));
    if (a && b) return Math.round((a / b) * 100) / 100;
  }
  const n = Number(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

function decodeEntities(s) {
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}
