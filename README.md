# DGB – Mat & Vinstue

Website for DGB – Mat & Vinstue (Det gamle bageri), Havnebakken 1, Drøbak. A static, multilingual one-pager built with [Eleventy](https://www.11ty.dev/) and hosted on GitHub Pages.

Prototype: https://ludfjell.github.io/DGB/ (not indexed by search engines while `launched: false`).

## How it works

```
content/          everything visitors see – text, facts, menu, images
  fakta.yml       facts that are the same in every language, opening hours, languages
  meny.yml        THE menu: website menu, PDF menus and structured data all come from here
  tekst/no.yml    all Norwegian text and labels
  tekst/en.yml    all English text and labels
  media/          images
src/              templates and CSS (no copy)
lib/              loading, validation and per-language data
scripts/          validate.js, pdf.js
site.config.js    site address (incl. path prefix), time zone, old-URL redirects
```

On every push to `main`, every night and on manual run, the GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. validates `content/` and stops on errors (missing required fields, unknown allergen codes, prices that are not numbers, duplicate ids, missing Norwegian text, bad dates/times, missing image files),
2. builds the site with Eleventy: Norwegian front page at `/` and menu page at `/meny/`, English at `/en/` and `/en/menu/`,
3. renders the print menus to PDF with headless Chrome (`/pdf/meny-no.pdf`, `/pdf/menu-en.pdf`),
4. deploys to GitHub Pages.

A broken edit never goes live: the workflow stops before deploying. Missing translations only give warnings; the English page then falls back to English → Norwegian.

The build also generates `sitemap.xml` (with language alternates), `robots.txt`, `llms.txt`, JSON-LD (`Restaurant`, `Menu`, `FAQPage`) and a redirect page for the old Squarespace URL `/hjem`. The old `/meny` URL is the new menu page.

## Editing

| What | Where |
| --- | --- |
| Dishes, prices, allergens, drinks | `content/meny.yml` (`web: false` = PDF only; the rest is shown on the menu page) |
| Opening hours and exceptions (holidays etc.) | `content/fakta.yml` → `openingHours`, `exceptions` |
| Address, phone, email, social links | `content/fakta.yml` |
| Page text, headings, FAQ, alt texts, labels | `content/tekst/no.yml` and `content/tekst/en.yml` |
| Images | `content/media/` + path in `fakta.yml` → `images` + alt text in both language files |

Update every language in the same commit. Then:

```bash
npm install          # first time only
npm run validate     # check content
npm start            # local preview at http://localhost:8080/DGB/
npm run build:all    # full build incl. PDFs into _site/
```

Commit and push to `main` – deployment is automatic. Exceptions to the opening hours show up to 60 days ahead and disappear when they have passed (the nightly build takes care of that). To preview another date: `BUILD_DATE=2026-12-20 npm start`.

`.pages.yml` is ready for [Pages CMS](https://pagescms.org) if editors should get forms instead of editing YAML. It is not connected yet.

## Adding a language (example: German)

1. `content/fakta.yml` → `languages`: add `{ code: "de", htmlLang: "de", locale: "de-DE", path: "/de/" }`.
2. Copy `content/tekst/en.yml` to `content/tekst/de.yml` and translate it (keep the keys; change the slugs and `pdfFilename`, e.g. `speisekarte-de`).
3. `content/meny.yml`: add `de:` next to `no:`/`en:` in each text field. Anything left out falls back to English, then Norwegian; the build lists what is missing.
4. Optional: `de` versions of `cuisine` and exception notes in `fakta.yml`, and a `de` field in the `tekst`/`tekstlang` components in `.pages.yml`.

No template changes are needed.

## Launch checklist

1. **DNS at Domeneshop** (Domener → detgamlebageri.no → DNS-pekere). Replace the Squarespace records for the website only:
   - Apex (`@`): four A records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (optionally AAAA → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`).
   - `www`: CNAME → `ludfjell.github.io`.
   - **Do not touch the MX records** (or other mail records such as SPF/DKIM TXT). Email must keep working.
2. **GitHub** → repository Settings → Pages → Custom domain: `www.detgamlebageri.no`. Wait for the DNS check, then tick **Enforce HTTPS**. GitHub redirects the bare domain to www. (Recommended: verify the domain under your GitHub account settings → Pages to protect it against takeover.)
3. **Code**: in `site.config.js` set `siteUrl: "https://www.detgamlebageri.no/"` (this sets the path prefix to root), and in `content/fakta.yml` set `launched: true`. Commit and push.
4. Check that https://www.detgamlebageri.no/, `/en/`, `/meny`, the PDFs and `/sitemap.xml` work.
5. **Google Search Console**: the existing verification tag is kept, so the property stays verified. Submit `https://www.detgamlebageri.no/sitemap.xml`.
6. Cancel Squarespace only after the new site is live. All images are already in the repo.

**Note on the nightly build:** GitHub disables scheduled workflows in public repositories after 60 days without repository activity (commits). The site stays online, but the nightly rebuild stops. Opening-hour exceptions then no longer appear or disappear by themselves: past exceptions stay visible and new ones within the 60-day window do not show up until the next push. GitHub emails the repository owner before disabling it. To re-enable: GitHub → Actions → "Build and deploy" → **Enable workflow** (or `gh workflow enable deploy.yml`). Any push to `main` also rebuilds the site and resets the 60-day timer.
