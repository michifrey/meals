// Meals – statische Rezeptverwaltung für GitHub Pages
// Keine Build-Tools, kein Framework. Reines ES-Modul.

import { renderRecipeList, renderRecipeDetail } from "./views/recipes.js";
import { renderShoppingList } from "./views/shopping.js";
import { renderNewRecipe } from "./views/new.js";
import { loadRecipes } from "./store.js";
import { cartCount } from "./cart.js";

const view = document.getElementById("view");

// Basis-Pfad ermitteln (funktioniert für User- und Projekt-Pages gleichermaßen).
export const BASE = document.querySelector("base")?.href
  || location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");

const routes = {
  "rezepte": renderRecipeList,
  "rezept": renderRecipeDetail, // #/rezept/<id>
  "einkaufsliste": renderShoppingList,
  "neu": renderNewRecipe,
};

let recipes = [];

async function boot() {
  setupRepoLink();
  try {
    recipes = await loadRecipes();
  } catch (err) {
    console.error(err);
    view.innerHTML = `
      <div class="notice">
        <strong>Rezepte konnten nicht geladen werden.</strong><br>
        Stelle sicher, dass <code>recipes/index.json</code> existiert
        (wird automatisch per GitHub Action gebaut) und du die Seite über einen
        Webserver bzw. GitHub Pages öffnest – nicht direkt als Datei.
        <br><br><small>${escapeHtml(String(err))}</small>
      </div>`;
  }
  window.addEventListener("hashchange", router);
  router();
}

function router() {
  const hash = location.hash.replace(/^#\/?/, "") || "rezepte";
  const [route, ...rest] = hash.split("/");
  const handler = routes[route] || renderRecipeList;

  view.scrollTop = 0;
  window.scrollTo(0, 0);
  handler({ view, recipes, params: rest, navigate });

  // Aktiven Nav-Link markieren
  document.querySelectorAll(".main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });
  updateCartBadge();
}

export function navigate(path) {
  location.hash = path.startsWith("#") ? path : "#/" + path.replace(/^\//, "");
}

export function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  const n = cartCount();
  badge.textContent = String(n);
  badge.hidden = n === 0;
}

function setupRepoLink() {
  const link = document.getElementById("repo-link");
  // Aus der GitHub-Pages-URL das Repo ableiten: <user>.github.io/<repo>/
  const m = location.hostname.match(/^([^.]+)\.github\.io$/);
  if (m) {
    const repo = location.pathname.split("/").filter(Boolean)[0] || "";
    link.href = `https://github.com/${m[1]}/${repo}`;
  } else {
    link.href = "https://github.com/";
  }
}

// ---------- gemeinsame Helfer ----------
export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2400);
}

boot();
