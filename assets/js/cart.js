// Einkaufsliste – im Browser (localStorage) gespeichert.
// Items werden nach Name + Einheit zusammengefasst und Mengen addiert.

const KEY = "meals.cart.v1";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getCart() {
  return read();
}

export function cartCount() {
  return read().filter((i) => !i.checked).length;
}

function mergeKey(name, unit) {
  return name.trim().toLowerCase() + "|" + (unit || "").trim().toLowerCase();
}

// Fügt eine Liste von Zutaten hinzu, fasst gleiche zusammen.
export function addIngredients(ingredients, sourceName = "") {
  const items = read();
  const index = new Map(items.map((i) => [mergeKey(i.name, i.unit), i]));

  for (const ing of ingredients) {
    if (!ing.name || !ing.name.trim()) continue;
    const key = mergeKey(ing.name, ing.unit);
    const existing = index.get(key);
    if (existing && existing.amount != null && ing.amount != null) {
      existing.amount += Number(ing.amount);
      existing.checked = false;
    } else if (existing && existing.amount == null && ing.amount == null) {
      existing.checked = false; // schon vorhanden, nichts zu addieren
    } else {
      const item = {
        id: cryptoId(),
        name: ing.name.trim(),
        unit: ing.unit || "",
        amount: ing.amount == null ? null : Number(ing.amount),
        checked: false,
        source: sourceName,
      };
      items.push(item);
      index.set(key, item);
    }
  }
  write(items);
  return items;
}

export function addManualItem(name, amount, unit) {
  return addIngredients([{ name, amount: amount === "" ? null : Number(amount), unit }], "");
}

export function toggleItem(id) {
  const items = read();
  const it = items.find((i) => i.id === id);
  if (it) it.checked = !it.checked;
  write(items);
}

export function removeItem(id) {
  write(read().filter((i) => i.id !== id));
}

export function clearChecked() {
  write(read().filter((i) => !i.checked));
}

export function clearAll() {
  write([]);
}

function cryptoId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
