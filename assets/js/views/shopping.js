// View: Einkaufsliste

import { escapeHtml, updateCartBadge, toast } from "../app.js";
import { formatAmount } from "../format.js";
import {
  getCart, addManualItem, toggleItem, removeItem, clearChecked, clearAll,
} from "../cart.js";

export function renderShoppingList({ view }) {
  function draw() {
    const items = getCart();
    // nach Quelle/Reihenfolge gruppieren wäre möglich – wir halten es flach & sortiert
    const sorted = [...items].sort((a, b) =>
      Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name, "de")
    );

    view.innerHTML = `
      <div class="page-head">
        <h1 class="page-title">Einkaufsliste</h1>
        ${items.length ? `<div style="display:flex;gap:8px">
          <button class="btn btn--muted btn--sm" id="clear-checked">Erledigte entfernen</button>
          <button class="btn btn--danger btn--sm" id="clear-all">Alles löschen</button>
        </div>` : ""}
      </div>

      ${sorted.length ? `
        <div class="card">
          <ul class="shopping-list">
            ${sorted.map(itemHtml).join("")}
          </ul>
        </div>` : `
        <div class="empty-state">
          <div class="empty-state__icon">🛒</div>
          <p>Deine Einkaufsliste ist leer.<br>Füge Zutaten aus einem Rezept hinzu.</p>
          <a class="btn" href="#/rezepte">Zu den Rezepten</a>
        </div>`}

      <div class="card" style="margin-top:20px">
        <label>Eigenen Eintrag hinzufügen</label>
        <div class="add-item-row">
          <input id="m-amount" type="number" step="any" placeholder="Menge" style="max-width:90px" />
          <input id="m-unit" type="text" placeholder="Einheit" style="max-width:100px" />
          <input id="m-name" type="text" placeholder="z. B. Olivenöl" />
          <button class="btn" id="m-add">Hinzufügen</button>
        </div>
      </div>
    `;

    view.querySelectorAll(".shopping-list input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", () => { toggleItem(cb.dataset.id); updateCartBadge(); draw(); });
    });
    view.querySelectorAll(".shopping-list .remove").forEach((b) => {
      b.addEventListener("click", () => { removeItem(b.dataset.id); updateCartBadge(); draw(); });
    });
    view.querySelector("#clear-checked")?.addEventListener("click", () => {
      clearChecked(); updateCartBadge(); draw();
    });
    view.querySelector("#clear-all")?.addEventListener("click", () => {
      if (confirm("Wirklich die gesamte Einkaufsliste löschen?")) { clearAll(); updateCartBadge(); draw(); }
    });

    const addItem = () => {
      const name = view.querySelector("#m-name").value.trim();
      if (!name) return;
      addManualItem(name, view.querySelector("#m-amount").value, view.querySelector("#m-unit").value.trim());
      updateCartBadge();
      draw();
      toast("Hinzugefügt");
    };
    view.querySelector("#m-add").addEventListener("click", addItem);
    view.querySelector("#m-name").addEventListener("keydown", (e) => { if (e.key === "Enter") addItem(); });
  }

  draw();
}

function itemHtml(i) {
  const amount = formatAmount(i.amount, i.unit);
  return `
    <li class="${i.checked ? "checked" : ""}">
      <input type="checkbox" data-id="${i.id}" ${i.checked ? "checked" : ""} />
      <label>${escapeHtml(i.name)}${amount ? ` <span style="color:var(--muted);font-weight:400">– ${escapeHtml(amount)}</span>` : ""}</label>
      <button class="remove" data-id="${i.id}" title="Entfernen">✕</button>
    </li>`;
}
