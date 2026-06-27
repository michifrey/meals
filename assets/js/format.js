// Hilfsfunktionen zum Formatieren von Mengen.

// Rundet eine Menge "schön" (auf max. 2 sinnvolle Nachkommastellen).
export function roundAmount(n) {
  if (n == null || isNaN(n)) return null;
  if (n === 0) return 0;
  const rounded = Math.round(n * 100) / 100;
  return rounded;
}

// Formatiert eine Menge inkl. Einheit für die Anzeige.
export function formatAmount(amount, unit) {
  const a = roundAmount(amount);
  if (a == null) return unit || "";
  // Brüche für gängige Werte hübscher darstellen
  const fractions = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" };
  let str;
  const whole = Math.floor(a);
  const frac = Math.round((a - whole) * 100) / 100;
  if (fractions[frac]) {
    str = (whole ? whole + " " : "") + fractions[frac];
  } else {
    str = String(a).replace(".", ",");
  }
  return unit ? `${str} ${unit}` : str;
}

// Skaliert die Zutaten eines Rezepts auf eine neue Portionszahl.
export function scaleIngredients(ingredients, baseServings, targetServings) {
  const factor = baseServings && targetServings ? targetServings / baseServings : 1;
  return ingredients.map((i) => ({
    ...i,
    amount: i.amount == null ? null : i.amount * factor,
  }));
}
