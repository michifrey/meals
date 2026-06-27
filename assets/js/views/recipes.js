// Views: Rezeptliste + Rezeptdetail

import { escapeHtml, navigate, toast } from "../app.js";
import { getRecipe } from "../store.js";
import { formatAmount, scaleIngredients } from "../format.js";
import { addIngredients } from "../cart.js";
import { updateCartBadge } from "../app.js";

let listState = { q: "", tag: "" };

export function renderRecipeList({ view, recipes }) {
  const allTags = [...new Set(recipes.flatMap((r) => [...r.category, ...r.tags]))].sort((a, b) =>
    a.localeCompare(b, "de")
  );

  view.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Rezepte</h1>
        <p style="color:var(--muted);margin:0">${recipes.length} Rezept${recipes.length === 1 ? "" : "e"}</p>
      </div>
      <a class="btn" href="#/neu">＋ Neues Rezept</a>
    </div>
    <div class="toolbar">
      <input class="search" id="search" type="text" placeholder="🔍 Suche nach Name, Zutat oder Tag…" value="${escapeHtml(listState.q)}" />
    </div>
    ${allTags.length ? `<div class="chips" id="tag-chips" style="margin-bottom:20px">
      <span class="chip ${listState.tag === "" ? "active" : ""}" data-tag="">Alle</span>
      ${allTags.map((t) => `<span class="chip ${listState.tag === t ? "active" : ""}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join("")}
    </div>` : ""}
    <div id="grid"></div>
  `;

  const grid = view.querySelector("#grid");
  const search = view.querySelector("#search");

  function update() {
    const q = listState.q.trim().toLowerCase();
    const tag = listState.tag;
    const filtered = recipes.filter((r) => {
      const matchesTag = !tag || r.category.includes(tag) || r.tags.includes(tag);
      const haystack = [r.name, r.description, ...r.tags, ...r.category, ...r.ingredients.map((i) => i.name)]
        .join(" ").toLowerCase();
      const matchesQ = !q || haystack.includes(q);
      return matchesTag && matchesQ;
    });

    grid.innerHTML = filtered.length
      ? `<div class="recipe-grid">${filtered.map(cardHtml).join("")}</div>`
      : `<div class="empty-state"><div class="empty-state__icon">🍂</div><p>Keine Rezepte gefunden.</p></div>`;
  }

  search.addEventListener("input", () => { listState.q = search.value; update(); });
  view.querySelector("#tag-chips")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    listState.tag = chip.dataset.tag;
    view.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    update();
  });

  update();
}

function cardHtml(r) {
  const img = r.image
    ? `style="background-image:url('${escapeHtml(r.image)}')"`
    : "";
  const time = r.cookTime || r.prepTime;
  return `
    <a class="recipe-card" href="#/rezept/${encodeURIComponent(r.id)}">
      <div class="recipe-card__img" ${img}>${r.image ? "" : escapeHtml(r.emoji)}</div>
      <div class="recipe-card__body">
        <h3 class="recipe-card__title">${escapeHtml(r.name)}</h3>
        ${r.tags.length ? `<div class="chips">${r.tags.slice(0, 3).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        <div class="recipe-card__meta">
          ${r.servings ? `<span>🍽️ ${r.servings} Port.</span>` : ""}
          ${time ? `<span>⏱️ ${escapeHtml(time)}</span>` : ""}
        </div>
      </div>
    </a>`;
}

// ---------- Detailansicht ----------
export function renderRecipeDetail({ view, params }) {
  const id = decodeURIComponent(params[0] || "");
  const r = getRecipe(id);
  if (!r) {
    view.innerHTML = `<a class="back-link" href="#/rezepte">← Zurück</a>
      <div class="empty-state"><div class="empty-state__icon">🤷</div><p>Rezept nicht gefunden.</p></div>`;
    return;
  }

  let servings = r.servings || 1;

  view.innerHTML = `
    <a class="back-link" href="#/rezepte">← Alle Rezepte</a>
    <div class="detail-hero">
      <div class="detail-hero__img" ${r.image ? `style="background-image:url('${escapeHtml(r.image)}')"` : ""}>
        ${r.image ? "" : escapeHtml(r.emoji)}
      </div>
      <div>
        <h1 class="page-title">${escapeHtml(r.name)}</h1>
        ${r.description ? `<p style="color:var(--muted)">${escapeHtml(r.description)}</p>` : ""}
        <div class="detail-meta">
          ${r.servings ? `<span>🍽️ <strong>${r.servings}</strong> Portionen</span>` : ""}
          ${r.prepTime ? `<span>🔪 Vorber. <strong>${escapeHtml(r.prepTime)}</strong></span>` : ""}
          ${r.cookTime ? `<span>⏱️ Kochzeit <strong>${escapeHtml(r.cookTime)}</strong></span>` : ""}
        </div>
        ${r.tags.length || r.category.length ? `<div class="chips" style="margin:10px 0">
          ${[...r.category, ...r.tags].map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>` : ""}
        ${r.source ? `<p style="font-size:0.85rem"><a href="${escapeHtml(r.source)}" target="_blank" rel="noopener">🔗 Quelle</a></p>` : ""}
      </div>
    </div>

    <div class="detail-cols">
      <div class="card">
        <h2 style="margin-top:0">Zutaten</h2>
        ${r.servings ? `<div class="servings-control">
          <span>Portionen:</span>
          <div class="stepper">
            <button id="serv-minus" aria-label="weniger">−</button>
            <input id="serv-input" type="number" min="1" value="${servings}" />
            <button id="serv-plus" aria-label="mehr">＋</button>
          </div>
        </div>` : ""}
        <ul class="ingredients-list" id="ingredients"></ul>
        <button class="btn" id="add-cart" style="margin-top:16px;width:100%">🛒 Zur Einkaufsliste hinzufügen</button>
      </div>
      <div class="card">
        <h2 style="margin-top:0">Zubereitung</h2>
        ${r.steps.length
          ? `<ol class="steps-list">${r.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
          : `<p style="color:var(--muted)">Keine Schritte hinterlegt.</p>`}
      </div>
    </div>
  `;

  const ingList = view.querySelector("#ingredients");
  function renderIngredients() {
    const scaled = scaleIngredients(r.ingredients, r.servings || servings, servings);
    ingList.innerHTML = scaled.map((i) => `
      <li>
        <span>${escapeHtml(i.name)}</span>
        <span class="amount">${escapeHtml(formatAmount(i.amount, i.unit))}</span>
      </li>`).join("");
  }
  renderIngredients();

  const servInput = view.querySelector("#serv-input");
  if (servInput) {
    const setServ = (v) => { servings = Math.max(1, Math.round(v) || 1); servInput.value = servings; renderIngredients(); };
    view.querySelector("#serv-minus").addEventListener("click", () => setServ(servings - 1));
    view.querySelector("#serv-plus").addEventListener("click", () => setServ(servings + 1));
    servInput.addEventListener("change", () => setServ(Number(servInput.value)));
  }

  view.querySelector("#add-cart").addEventListener("click", () => {
    const scaled = scaleIngredients(r.ingredients, r.servings || servings, servings);
    addIngredients(scaled, r.name);
    updateCartBadge();
    toast(`${scaled.length} Zutaten zur Einkaufsliste hinzugefügt`);
  });
}
