// Builds everything the templates need, one page object per language.
// Templates only render this data; all text comes from content/.
import { defaultLanguage, fallbackChain, interpolate, mergeTrees, pick } from "./i18n.js";
import { exceptionRows, openingHoursSpecification, specialOpeningHoursSpecification, todayIn, upcomingExceptions, weeklyRows } from "./hours.js";
import { largestRendition, pictureHtml, processImages } from "./images.js";
import { buildJsonLd } from "./jsonld.js";
import { buildLlms } from "./llms.js";
import { resolveMenu } from "./menu.js";

const PLACEHOLDER = "[PLACEHOLDER";

// Text tree for one language with fallback filled in (English, then Norwegian).
export function textFor(code, content) {
  return mergeTrees(fallbackChain(code, content.fakta).map((c) => content.tekst[c]));
}

// Print pages and PDF file names per language – used by scripts/pdf.js.
export function printTargets(content) {
  return content.fakta.languages.map((lang) => ({
    code: lang.code,
    printPath: `print/${lang.code}/`,
    pdfFile: `${textFor(lang.code, content).print.pdfFilename}.pdf`,
  }));
}

export async function buildSite(content, config, { outputDir, now = new Date() }) {
  const { fakta, meny } = content;
  const siteUrl = config.siteUrl.endsWith("/") ? config.siteUrl : `${config.siteUrl}/`;
  const prefix = new URL(siteUrl).pathname;
  const rel = (path) => `${prefix}${path.replace(/^\//, "")}`; // "/en/" → "/DGB/en/"
  const abs = (path) => new URL(rel(path), siteUrl).href; // "/en/" → "https://…/DGB/en/"

  // BUILD_DATE=YYYY-MM-DD overrides "today", for checking how exceptions will show.
  const today = process.env.BUILD_DATE ?? todayIn(config.timeZone, now);
  const upcoming = upcomingExceptions(fakta.exceptions, today, config.exceptionsWindowDays);
  const base = defaultLanguage(fakta);

  const { street, postalCode, locality } = fakta.address;
  const addressLine = `${street}, ${postalCode} ${locality}`;
  const contact = {
    street,
    postalLine: `${postalCode} ${locality}`,
    addressLine,
    phone: fakta.phone,
    phoneDisplay: fakta.phone.replace(/ /g, " "), // never wraps inside the number
    phoneHref: `tel:${fakta.phone.replace(/[^\d+]/g, "")}`,
    email: fakta.email,
    emailHref: `mailto:${fakta.email}`,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`,
  };
  const tokens = { name: fakta.name, phone: fakta.phone, email: fakta.email, address: addressLine };
  const texts = Object.fromEntries(fakta.languages.map((lang) => [lang.code, interpolate(textFor(lang.code, content), tokens)]));

  const imageData = await processImages(fakta.images, { outputDir, urlPath: prefix });
  const imageUrl = (key) => {
    const rendition = largestRendition(imageData[key]);
    return { url: new URL(rendition.url, siteUrl).href, width: rendition.width, height: rendition.height };
  };
  const slugs = (code) => Object.fromEntries(Object.entries(texts[code].sections).map(([key, section]) => [key, section.slug]));

  const pages = fakta.languages.map((lang) => {
    const chain = fallbackChain(lang.code, fakta);
    const t = texts[lang.code];
    const url = abs(lang.path);
    const menu = resolveMenu(meny, chain, { priceFormat: t.menu.price, locale: lang.locale });
    const hours = {
      weekly: weeklyRows(fakta.openingHours, { days: t.days, closed: t.contact.closed }, lang.locale),
      exceptions: exceptionRows(upcoming, chain, { closed: t.contact.closed }, lang.locale),
      specification: openingHoursSpecification(fakta.openingHours),
      special: specialOpeningHoursSpecification(upcoming),
    };
    const images = Object.fromEntries(
      Object.keys(fakta.images).map((key) => [key, pictureHtml(imageData[key], { alt: t.images[key], eager: key === "hero" })]),
    );
    const pdfPath = `/pdf/${t.print.pdfFilename}.pdf`;
    const page = {
      code: lang.code,
      lang,
      htmlLang: lang.htmlLang,
      permalink: `${lang.path}index.html`,
      printPermalink: `/print/${lang.code}/index.html`,
      siteUrl: abs("/"),
      url,
      menuId: `${url}#${t.sections.menu.slug}`,
      faqId: `${url}#${t.sections.faq.slug}`,
      t,
      ogLocale: lang.locale.replace("-", "_"),
      ogLocaleAlternates: fakta.languages.filter((other) => other !== lang).map((other) => other.locale.replace("-", "_")),
      alternates: [
        ...fakta.languages.map((other) => ({ hreflang: other.htmlLang, url: abs(other.path) })),
        { hreflang: "x-default", url: abs(base.path) },
      ],
      languageLinks: fakta.languages.map((other) => ({
        name: texts[other.code].languageName,
        htmlLang: other.htmlLang,
        href: rel(other.path),
        current: other.code === lang.code,
        sections: JSON.stringify(slugs(other.code)),
      })),
      cuisine: (fakta.cuisine ?? []).map((value) => pick(value, chain)),
      menu,
      hours,
      contact,
      social: Object.entries(fakta.social).map(([key, link]) => ({ key, url: link, label: t.social[key] })),
      reviewUrl: fakta.social.tripadvisor ?? null,
      images,
      og: { ...imageUrl("hero"), alt: t.images.hero },
      pdf: { href: rel(pdfPath), url: abs(pdfPath) },
      // Placeholder answers stay on the page but are left out of structured data and llms.txt.
      faq: t.faq.filter((entry) => !`${entry.question} ${entry.answer}`.includes(PLACEHOLDER)),
    };
    page.jsonld = buildJsonLd({ fakta, page, t, menu, hours, faq: page.faq, images: { hero: imageUrl("hero"), logo: imageUrl("logo") } });
    return page;
  });

  const baseText = texts[base.code];
  const redirects = (config.redirects ?? []).map((redirect) => {
    const slug = redirect.section ? baseText.sections[redirect.section]?.slug : null;
    if (redirect.section && !slug) throw new Error(`site.config.js: redirect ${redirect.from} points to unknown section "${redirect.section}"`);
    return {
      permalink: `/${redirect.from.replace(/^\/|\/$/g, "")}/index.html`,
      target: `${rel(base.path)}${slug ? `#${slug}` : ""}`,
      canonical: abs(base.path),
      htmlLang: base.htmlLang,
      title: baseText.meta.title,
      linkText: baseText.redirect.linkText,
    };
  });

  return {
    name: fakta.name,
    launched: fakta.launched,
    googleSiteVerification: config.googleSiteVerification ?? null,
    today,
    assets: {
      css: rel("/assets/style.css"),
      printCss: rel("/assets/print.css"),
      js: rel("/assets/lang-switch.js"),
      favicon: rel("/favicon.png"),
    },
    sitemapUrl: abs("/sitemap.xml"),
    pages,
    redirects,
    llms: buildLlms({ fakta, pages }),
  };
}
