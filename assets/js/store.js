// Lädt die Rezepte aus dem automatisch generierten Index.
// recipes/index.json wird per GitHub Action aus den Einzeldateien gebaut.

let cache = null;

export async function loadRecipes() {
  if (cache) return cache;
  const res = await fetch("recipes/index.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`index.json: HTTP ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.recipes || []);
  cache = list.map(normalizeRecipe).sort((a, b) => a.name.localeCompare(b.name, "de"));
  return cache;
}

export function getRecipe(id) {
  return (cache || []).find((r) => r.id === id) || null;
}

// Vereinheitlicht ein Rezept-Objekt (tolerant gegenüber fehlenden Feldern).
export function normalizeRecipe(r) {
  return {
    id: r.id || slugify(r.name || "rezept"),
    name: r.name || "Unbenannt",
    description: r.description || "",
    image: r.image || "",
    emoji: r.emoji || "🍽️",
    category: toArray(r.category),
    tags: toArray(r.tags),
    servings: Number(r.servings) || 0,
    prepTime: r.prepTime || "",
    cookTime: r.cookTime || "",
    ingredients: (r.ingredients || []).map(normalizeIngredient),
    steps: (r.steps || []).map((s) => (typeof s === "string" ? s : s.text || "")),
    source: r.source || "",
  };
}

function normalizeIngredient(i) {
  if (typeof i === "string") return { amount: null, unit: "", name: i };
  return {
    amount: i.amount === "" || i.amount == null ? null : Number(i.amount),
    unit: i.unit || "",
    name: i.name || "",
  };
}

function toArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v];
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "rezept";
}
