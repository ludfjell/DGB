# CLAUDE.md – DGB – Mat & Vinstue

Static, multilingual one-pager for the restaurant DGB – Mat & Vinstue (also known as Det gamle bageri) in Drøbak. Eleventy 3, Nunjucks, plain CSS, GitHub Pages via GitHub Actions. README.md explains the system and the launch checklist.

## Rules

- **Menu changes are made only in `content/meny.yml`.** It is the single source for the website menu, the PDF menus and the structured data. Never create other copies of menu data (no JSON exports, no hardcoded dishes, no menu images).
- **Never hardcode copy in templates.** Every visible string, alt text and fact lives in `content/`: page text and labels in `content/tekst/<lang>.yml`, facts in `content/fakta.yml`, the menu in `content/meny.yml`. Templates only render data.
- **Every content change updates all languages in the same commit.** Translate it yourself and tell the user which translations you are unsure of.
- **Never guess prices or allergens.** If something is unclear, leave it out, mark it `TODO` and ask the user.
- **Keep the restaurant's Norwegian menu text verbatim** (including its spelling). The user has decided not to correct it. Translations into other languages are ours to write.
- **Opening hour exceptions go in `content/fakta.yml` → `exceptions`** (from/to, closed or opens/closes, optional note per language). The site shows the next 60 days and hides past exceptions; the nightly workflow rebuilds the site so this stays correct.
- **Design changes happen only in templates (`src/`) and CSS (`src/assets/`).** Content files must not need changes for a redesign.
- **Before committing:** run `npm run validate` and `npm run build` (and `npm run pdf` when the menu or print template changed). Then commit with a clear message and push to `main`. Deployment is automatic.
- Placeholders are written `[PLACEHOLDER: …]`. The build lists the remaining ones.

## How to add a language (example: German)

1. `content/fakta.yml` → `languages`: add `{ code: "de", htmlLang: "de", locale: "de-DE", path: "/de/" }`.
2. Create `content/tekst/de.yml` with the same keys as `no.yml` (new slugs, `print.pdfFilename: speisekarte-de`).
3. Add `de:` to the text fields in `content/meny.yml` (and optionally to `cuisine` and exception notes in `fakta.yml`).
4. If Pages CMS is in use, add a `de` field to the `tekst` and `tekstlang` components in `.pages.yml`.

Missing translations fall back to English, then Norwegian, and are listed as warnings. No template changes.

## Structure

- `content/` – fakta.yml, meny.yml, tekst/no.yml, tekst/en.yml, media/ (images, downloaded from the old Squarespace site)
- `lib/` – `content.js` (YAML loading), `validate.js` (all checks; errors stop the build), `i18n.js` (fallback, `{phone}`-style tokens), `menu.js`, `hours.js`, `images.js` (eleventy-img), `jsonld.js`, `llms.js`, `site.js` (builds one page object per language for the templates)
- `src/` – `base.njk` layout, `macros.njk` (menu section, allergen legend), `index.njk` (one-pager per language), `print.njk` (print menu → PDF), `redirect.njk`, `sitemap.njk`, `robots.njk`, `llms.njk`, `assets/` (CSS, the language-switch script)
- `scripts/validate.js`, `scripts/pdf.js` (Puppeteer; serves `_site` under the path prefix and prints `/print/<lang>/` to `/pdf/<pdfFilename>.pdf`)
- `site.config.js` – `siteUrl` (the single setting for domain + path prefix), time zone, exception window, old-URL redirects
- `.github/workflows/deploy.yml` – push to main, nightly cron, manual: install → validate → build → PDFs → deploy

## Commands

- `npm run validate` – check content only
- `npm start` – dev server at http://localhost:8080/DGB/
- `npm run build` – Eleventy build (validates first) into `_site/`
- `npm run pdf` – PDFs from the built print pages (run after build)
- `BUILD_DATE=YYYY-MM-DD npm run build` – build as if it were another day (test opening-hour exceptions)

## Conventions

- Translatable fields in fakta.yml/meny.yml: `{ no: "...", en: "..." }`. Norwegian (the default language) is required.
- Language files share the same keys. Tokens `{name}`, `{phone}`, `{email}`, `{address}` are filled in from fakta.yml; `{amount}` in `menu.price`.
- Allergen codes are the restaurant's own 17 codes, the same in every language; only the legend is translated.
- Nunjucks runs with `throwOnUndefined`, so a template that refers to a missing text key fails the build.
- While `launched: false`, every page gets `noindex`. At launch: `siteUrl` → `https://www.detgamlebageri.no/` and `launched: true` (see README).
- Open questions (allergens) are marked `TODO` at the top of `content/meny.yml`.
