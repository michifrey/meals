// View: Neues Rezept anlegen oder per URL importieren.
// Ergebnis ist eine fertige JSON-Datei, die in recipes/ committet wird.

import { escapeHtml, toast } from "../app.js";
import { slugify } from "../store.js";
import { importFromUrl } from "../import.js";

export function renderNewRecipe({ view }) {
  view.innerHTML = `
    <h1 class="page-title">Neues Rezept</h1>
    <div class="tabs">
      <button class="active" data-tab="url">🔗 Per URL importieren</button>
      <button data-tab="form">✏️ Manuell anlegen</button>
    </div>
    <div id="tab-content"></div>
  `;

  const content = view.querySelector("#tab-content");
  const tabs = view.querySelectorAll(".tabs button");
  tabs.forEach((b) =>
    b.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.toggle("active", x === b));
      b.dataset.tab === "url" ? renderUrlTab(content) : renderFormTab(content);
    })
  );

  renderUrlTab(content);
}

// ---------- URL-Import ----------
function renderUrlTab(content) {
  content.innerHTML = `
    <div class="notice">
      Versucht, das Rezept von einer Webseite zu laden (Schema.org / JSON-LD).
      Da GitHub Pages keine eigene Server-Seite hat, läuft der Abruf über einen
      öffentlichen CORS-Proxy und klappt <strong>nicht bei jeder Seite</strong>.
      Prüfe das Ergebnis und passe es bei Bedarf im Formular an.
    </div>
    <div class="field-row">
      <div class="field" style="grid-column:1 / -1">
        <label for="import-url">Rezept-URL</label>
        <div style="display:flex;gap:8px">
          <input id="import-url" type="url" placeholder="https://…" />
          <button class="btn" id="import-btn">Importieren</button>
        </div>
      </div>
    </div>
    <div id="import-status"></div>
    <div id="import-form"></div>
  `;

  const btn = content.querySelector("#import-btn");
  const input = content.querySelector("#import-url");
  const status = content.querySelector("#import-status");

  async function run() {
    const url = input.value.trim();
    if (!url) return;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Lade…`;
    status.innerHTML = "";
    try {
      const recipe = await importFromUrl(url);
      status.innerHTML = `<div class="notice notice--info">✅ Rezept gefunden! Prüfe die Daten und exportiere unten.</div>`;
      renderFormTab(content.querySelector("#import-form"), recipe, true);
    } catch (err) {
      console.error(err);
      status.innerHTML = `<div class="notice">⚠️ Import fehlgeschlagen: ${escapeHtml(err.message)}<br>
        Du kannst das Rezept stattdessen manuell anlegen (Tab oben).</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Importieren";
    }
  }

  btn.addEventListener("click", run);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
}

// ---------- Manuelles Formular ----------
function renderFormTab(content, data = null, embedded = false) {
  const r = data || {
    name: "", description: "", image: "", emoji: "🍽️",
    category: [], tags: [], servings: 4, prepTime: "", cookTime: "",
    ingredients: [{ amount: "", unit: "", name: "" }], steps: [""], source: "",
  };

  content.innerHTML = `
    ${embedded ? "" : `<div class="notice notice--info">
      Lege das Rezept an und klicke auf <strong>JSON erzeugen</strong>.
      Lade die Datei herunter (oder kopiere den Text) und committe sie nach
      <code>recipes/</code> im Repo – die Seite baut den Index automatisch neu.
    </div>`}
    <form id="recipe-form">
      <div class="field-row">
        <div class="field"><label>Name *</label><input name="name" type="text" required value="${escapeHtml(r.name)}" /></div>
        <div class="field"><label>Emoji (Fallback ohne Bild)</label><input name="emoji" type="text" maxlength="4" value="${escapeHtml(r.emoji)}" /></div>
      </div>
      <div class="field"><label>Beschreibung</label><textarea name="description">${escapeHtml(r.description)}</textarea></div>
      <div class="field"><label>Bild-URL</label><input name="image" type="url" value="${escapeHtml(r.image)}" /></div>
      <div class="field-row">
        <div class="field"><label>Kategorien (Komma-getrennt)</label><input name="category" type="text" value="${escapeHtml(r.category.join(", "))}" placeholder="Hauptgericht, Vegetarisch" /></div>
        <div class="field"><label>Tags (Komma-getrennt)</label><input name="tags" type="text" value="${escapeHtml(r.tags.join(", "))}" placeholder="schnell, italienisch" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Portionen</label><input name="servings" type="number" min="1" value="${escapeHtml(r.servings)}" /></div>
        <div class="field"><label>Vorbereitungszeit</label><input name="prepTime" type="text" value="${escapeHtml(r.prepTime)}" placeholder="15 min" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Kochzeit</label><input name="cookTime" type="text" value="${escapeHtml(r.cookTime)}" placeholder="30 min" /></div>
        <div class="field"><label>Quelle (URL)</label><input name="source" type="url" value="${escapeHtml(r.source)}" /></div>
      </div>

      <div class="field">
        <label>Zutaten</label>
        <div id="ingredients-rows"></div>
        <button type="button" class="btn btn--ghost btn--sm" id="add-ing">＋ Zutat</button>
      </div>

      <div class="field">
        <label>Zubereitungsschritte</label>
        <div id="steps-rows"></div>
        <button type="button" class="btn btn--ghost btn--sm" id="add-step">＋ Schritt</button>
      </div>

      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="submit" class="btn">⬇️ JSON erzeugen</button>
      </div>
    </form>
    <div id="json-output" style="margin-top:20px"></div>
  `;

  const ingRows = content.querySelector("#ingredients-rows");
  const stepRows = content.querySelector("#steps-rows");

  const ingRow = (i = { amount: "", unit: "", name: "" }) => {
    const div = document.createElement("div");
    div.className = "dyn-row ingredient";
    div.innerHTML = `
      <input type="number" step="any" placeholder="Menge" class="ing-amount" value="${escapeHtml(i.amount ?? "")}" />
      <input type="text" placeholder="Einheit" class="ing-unit" value="${escapeHtml(i.unit ?? "")}" />
      <input type="text" placeholder="Zutat" class="ing-name" value="${escapeHtml(i.name ?? "")}" />
      <button type="button" class="btn btn--danger btn--sm">✕</button>`;
    div.querySelector("button").addEventListener("click", () => div.remove());
    return div;
  };
  const stepRow = (text = "") => {
    const div = document.createElement("div");
    div.className = "dyn-row step";
    div.innerHTML = `
      <textarea class="step-text" placeholder="Schritt beschreiben…">${escapeHtml(text)}</textarea>
      <button type="button" class="btn btn--danger btn--sm">✕</button>`;
    div.querySelector("button").addEventListener("click", () => div.remove());
    return div;
  };

  (r.ingredients.length ? r.ingredients : [{}]).forEach((i) => ingRows.appendChild(ingRow(i)));
  (r.steps.length ? r.steps : [""]).forEach((s) => stepRows.appendChild(stepRow(typeof s === "string" ? s : s.text)));

  content.querySelector("#add-ing").addEventListener("click", () => ingRows.appendChild(ingRow()));
  content.querySelector("#add-step").addEventListener("click", () => stepRows.appendChild(stepRow()));

  content.querySelector("#recipe-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const get = (n) => form.elements[n].value.trim();
    const splitList = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);

    const ingredients = [...ingRows.querySelectorAll(".dyn-row")].map((row) => ({
      amount: row.querySelector(".ing-amount").value.trim() === "" ? null : Number(row.querySelector(".ing-amount").value),
      unit: row.querySelector(".ing-unit").value.trim(),
      name: row.querySelector(".ing-name").value.trim(),
    })).filter((i) => i.name);

    const steps = [...stepRows.querySelectorAll(".step-text")].map((t) => t.value.trim()).filter(Boolean);

    const name = get("name");
    if (!name) { toast("Name fehlt"); return; }

    const recipe = {
      id: slugify(name),
      name,
      description: get("description"),
      image: get("image"),
      emoji: get("emoji") || "🍽️",
      category: splitList(get("category")),
      tags: splitList(get("tags")),
      servings: Number(get("servings")) || 0,
      prepTime: get("prepTime"),
      cookTime: get("cookTime"),
      ingredients,
      steps,
      source: get("source"),
    };

    showJsonOutput(content.querySelector("#json-output"), recipe);
  });
}

function showJsonOutput(container, recipe) {
  const json = JSON.stringify(recipe, null, 2);
  const filename = `recipes/${recipe.id}.json`;
  container.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <strong>Datei: <code>${escapeHtml(filename)}</code></strong>
        <div style="display:flex;gap:8px">
          <button class="btn btn--muted btn--sm" id="copy-json">📋 Kopieren</button>
          <button class="btn btn--sm" id="download-json">⬇️ Datei herunterladen</button>
        </div>
      </div>
      <pre class="output-box" style="margin-top:12px">${escapeHtml(json)}</pre>
      <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0">
        Lege diese Datei unter <code>${escapeHtml(filename)}</code> im Repo an
        (z. B. über „Add file → Create new file“ auf GitHub) und committe sie.
        Nach dem automatischen Build erscheint das Rezept auf der Seite.
      </p>
    </div>
  `;
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });

  container.querySelector("#copy-json").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(json); toast("JSON kopiert"); }
    catch { toast("Kopieren nicht möglich"); }
  });
  container.querySelector("#download-json").addEventListener("click", () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipe.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
