# 🍳 Meals

Eine schlanke, selbst gehostete Rezeptverwaltung im Stil von [Mealie](https://mealie.io/) –
aber komplett **statisch auf GitHub Pages**. Kein Server, keine Datenbank, keine laufenden Kosten.

## Funktionen

- **Rezepte verwalten** – durchsuchbare Rezeptübersicht mit Kategorien/Tags, Detailansicht mit Zutaten & Schritten
- **Portions-Rechner** – Zutatenmengen automatisch auf die gewünschte Portionszahl umrechnen
- **Einkaufsliste** – Zutaten aus Rezepten sammeln, zusammenfassen und abhaken (lokal im Browser gespeichert)
- **Rezept-Import per URL** – liest strukturierte Rezeptdaten (Schema.org / JSON-LD) von Webseiten
- **Rezepte als Dateien im Repo** – versioniert, auf allen Geräten gleich

## So funktioniert die Speicherung

Jedes Rezept ist eine JSON-Datei unter [`recipes/`](recipes/). Eine GitHub Action baut daraus
automatisch `recipes/index.json`, das die Webseite lädt. Du musst den Index also **nie von Hand pflegen**.

```
recipes/
  spaghetti-carbonara.json   ← ein Rezept = eine Datei (du committest diese)
  linsen-dal.json
  index.json                 ← wird automatisch gebaut, nicht von Hand bearbeiten
```

## Einrichtung (einmalig)

1. Diesen Branch nach `main` mergen (Pull Request).
2. Im Repo **Settings → Pages** öffnen.
3. Bei **Source** „**GitHub Actions**“ auswählen.
4. Fertig – bei jedem Push auf `main` wird die Seite neu gebaut und veröffentlicht.

Die Seite ist danach erreichbar unter:
`https://<dein-github-name>.github.io/meals/`

## Neues Rezept hinzufügen

**Variante A – über die Webseite (einfach):**
1. Auf „**Neu / Import**“ gehen.
2. Rezept manuell ausfüllen *oder* eine URL importieren.
3. Auf „**JSON erzeugen**“ klicken und die Datei herunterladen / kopieren.
4. Die Datei in GitHub unter `recipes/<name>.json` anlegen (Add file → Create new file) und committen.

**Variante B – direkt im Repo:**
Eine neue `recipes/<name>.json` nach dem Schema der vorhandenen Rezepte anlegen und committen.

Nach dem Commit baut die Action den Index neu und das Rezept erscheint auf der Seite.

## Rezeptformat

```json
{
  "id": "spaghetti-carbonara",
  "name": "Spaghetti Carbonara",
  "description": "Kurzbeschreibung",
  "image": "https://… (optional)",
  "emoji": "🍝",
  "category": ["Hauptgericht"],
  "tags": ["italienisch", "schnell"],
  "servings": 4,
  "prepTime": "10 min",
  "cookTime": "15 min",
  "ingredients": [
    { "amount": 400, "unit": "g", "name": "Spaghetti" },
    { "amount": null, "unit": "", "name": "Salz" }
  ],
  "steps": ["Schritt 1", "Schritt 2"],
  "source": "https://… (optional)"
}
```

`id` wird beim Import/Anlegen automatisch aus dem Namen erzeugt und kann auch weggelassen werden
(dann wird der Dateiname verwendet).

## Lokal entwickeln

Wegen Browser-Sicherheitsregeln muss die Seite über einen Webserver laufen (nicht per Doppelklick):

```bash
node scripts/build-index.mjs     # Index aus recipes/*.json bauen
python3 -m http.server 8000      # dann http://localhost:8000 öffnen
```

## Hinweis zum URL-Import

GitHub Pages ist rein statisch und hat keine Server-Seite. Der URL-Import läuft daher über
öffentliche CORS-Proxys und funktioniert **nicht bei jeder Webseite**. Das importierte Rezept
wird immer im Formular angezeigt, sodass du es vor dem Speichern prüfen und anpassen kannst.

## Technik

Reines HTML + CSS + JavaScript (ES-Module), keine Abhängigkeiten, kein Build-Tool für die App selbst.
Die einzige Automatisierung ist das Index-Skript in der GitHub Action.
