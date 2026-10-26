// Checks everything in content/ before a build. Errors stop the build; missing translations,
// placeholders and other warnings are only reported.
import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "./content.js";
import { getPath, isObject, leafPaths } from "./i18n.js";

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIME = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKENS = ["name", "phone", "email", "address", "amount"];
const PLACEHOLDER = "[PLACEHOLDER";
const IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".webp"];

const FAKTA_KEYS = ["launched", "name", "alternateName", "address", "geo", "phone", "email", "currency", "priceRange", "cuisine", "acceptsReservations", "social", "languages", "fallbackLanguages", "openingHours", "exceptions", "images"];
const LANGUAGE_KEYS = ["code", "htmlLang", "locale", "path", "default"];
const EXCEPTION_KEYS = ["from", "to", "closed", "opens", "closes", "note"];
const SECTION_KEYS = ["id", "title", "note", "footnote", "web", "print", "items", "sections"];
const ITEM_KEYS = ["id", "name", "description", "note", "price", "prices", "allergens", "allergenNote", "web", "print"];

const isText = (value) => typeof value === "string" && value.trim() !== "";
// Empty optional values (as a CMS form may save them) count as absent.
const present = (value) =>
  value !== undefined &&
  value !== null &&
  !(typeof value === "string" && value.trim() === "") &&
  !(Array.isArray(value) && !value.length) &&
  !(isObject(value) && !Object.values(value).some(present));
const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

export function validate(content) {
  const errors = [...content.loadErrors];
  const missing = [];
  const warnings = [];
  const placeholders = [];
  const err = (where, message) => errors.push(`${where}: ${message}`);
  const warn = (where, message) => warnings.push(`${where}: ${message}`);
  const { fakta, meny, tekst } = content;

  const unknownKeys = (obj, allowed, where) => {
    for (const key of Object.keys(obj)) if (!allowed.includes(key)) err(where, `unknown field "${key}"`);
  };

  // ---------------------------------------------------------------- languages
  if (!isObject(fakta)) return { errors, missing, warnings, placeholders };
  const languages = Array.isArray(fakta.languages) ? fakta.languages : [];
  if (!languages.length) err("fakta.yml › languages", "at least one language is required");
  const codes = [];
  const paths = [];
  languages.forEach((lang, i) => {
    const where = `fakta.yml › languages[${i}]`;
    if (!isObject(lang)) return err(where, "must be an object");
    unknownKeys(lang, LANGUAGE_KEYS, where);
    if (!/^[a-z]{2,3}$/.test(lang.code ?? "")) err(where, `code must be a 2–3 letter language code (got "${lang.code}")`);
    else if (codes.includes(lang.code)) err(where, `duplicate language "${lang.code}"`);
    else codes.push(lang.code);
    if (!isText(lang.htmlLang)) err(where, "htmlLang is required");
    try {
      new Intl.DateTimeFormat(lang.locale);
      if (!isText(lang.locale)) throw new Error();
    } catch {
      err(where, `locale must be a valid locale such as "nb-NO" (got "${lang.locale}")`);
    }
    if (typeof lang.path !== "string" || !/^\/([a-z0-9-]+\/)*$/.test(lang.path)) err(where, `path must look like "/" or "/en/" (got "${lang.path}")`);
    else if (paths.includes(lang.path)) err(where, `duplicate path "${lang.path}"`);
    else paths.push(lang.path);
    if (lang.default !== undefined && typeof lang.default !== "boolean") err(where, "default must be true or false");
  });
  const defaults = languages.filter((lang) => lang?.default === true);
  if (defaults.length !== 1) err("fakta.yml › languages", "exactly one language must have default: true");
  const base = defaults[0]?.code ?? codes[0];
  for (const code of fakta.fallbackLanguages ?? []) {
    if (!codes.includes(code)) err("fakta.yml › fallbackLanguages", `unknown language "${code}"`);
  }

  // Translatable value: { no: "...", en: "..." }. The default language is the required base.
  const checkText = (value, where, required) => {
    if (!present(value)) {
      if (required) err(where, `missing (needs at least "${base}")`);
      return;
    }
    if (!isObject(value)) return err(where, `must look like { ${codes.map((c) => `${c}: "..."`).join(", ")} }`);
    for (const [code, text] of Object.entries(value)) {
      if (!codes.includes(code)) err(where, `unknown language "${code}"`);
      else if (text !== null && typeof text !== "string") err(`${where}.${code}`, "must be text");
      if (typeof text === "string" && text.includes(PLACEHOLDER)) placeholders.push(`${where}.${code}`);
    }
    if (!isText(value[base])) return err(where, `text in the default language ("${base}") is missing`);
    for (const code of codes) if (code !== base && !isText(value[code])) missing.push(`${code}: ${where}`);
  };

  // ---------------------------------------------------------------- fakta.yml
  unknownKeys(fakta, FAKTA_KEYS, "fakta.yml");
  if (typeof fakta.launched !== "boolean") err("fakta.yml › launched", "must be true or false");
  if (!isText(fakta.name)) err("fakta.yml › name", "is required");
  if (present(fakta.alternateName) && !isText(fakta.alternateName)) err("fakta.yml › alternateName", "must be text");
  for (const key of ["street", "postalCode", "locality", "country"]) {
    if (!isText(fakta.address?.[key])) err(`fakta.yml › address.${key}`, "is required");
  }
  const { latitude, longitude } = fakta.geo ?? {};
  if (typeof latitude !== "number" || Math.abs(latitude) > 90) err("fakta.yml › geo.latitude", "must be a number between -90 and 90");
  if (typeof longitude !== "number" || Math.abs(longitude) > 180) err("fakta.yml › geo.longitude", "must be a number between -180 and 180");
  if (!isText(fakta.phone) || !/\d/.test(fakta.phone)) err("fakta.yml › phone", "is required");
  if (!isText(fakta.email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fakta.email)) err("fakta.yml › email", "must be an email address");
  if (!/^[A-Z]{3}$/.test(fakta.currency ?? "")) err("fakta.yml › currency", 'must be a currency code such as "NOK"');
  if (present(fakta.priceRange) && !isText(fakta.priceRange)) err("fakta.yml › priceRange", "must be text");
  if (present(fakta.acceptsReservations) && typeof fakta.acceptsReservations !== "boolean") err("fakta.yml › acceptsReservations", "must be true or false");
  if (present(fakta.cuisine)) {
    if (!Array.isArray(fakta.cuisine)) err("fakta.yml › cuisine", "must be a list");
    else fakta.cuisine.forEach((value, i) => checkText(value, `fakta.yml › cuisine[${i}]`, true));
  }
  if (!isObject(fakta.social)) err("fakta.yml › social", "must list the social links");
  else for (const [key, url] of Object.entries(fakta.social)) {
    if (typeof url !== "string" || !/^https:\/\/\S+$/.test(url)) err(`fakta.yml › social.${key}`, "must be a https:// address");
  }

  if (!isObject(fakta.openingHours)) err("fakta.yml › openingHours", "is required");
  else {
    unknownKeys(fakta.openingHours, DAYS, "fakta.yml › openingHours");
    for (const day of DAYS) {
      const where = `fakta.yml › openingHours.${day}`;
      const hours = fakta.openingHours[day];
      if (!isObject(hours)) err(where, 'is required, e.g. { opens: "12:00", closes: "19:00" } or { closed: true }');
      else checkHours(hours, where, ["closed", "opens", "closes"]);
    }
  }
  if (!Array.isArray(fakta.exceptions)) err("fakta.yml › exceptions", "must be a list (use [] when there are none)");
  else fakta.exceptions.forEach((exception, i) => {
    const where = `fakta.yml › exceptions[${i}]`;
    if (!isObject(exception)) return err(where, "must be an object");
    if (!isDate(exception.from)) err(`${where}.from`, `must be a date "YYYY-MM-DD" (got "${exception.from}")`);
    if (present(exception.to)) {
      if (!isDate(exception.to)) err(`${where}.to`, `must be a date "YYYY-MM-DD" (got "${exception.to}")`);
      else if (isDate(exception.from) && exception.to < exception.from) err(`${where}.to`, "is before from");
    }
    checkHours(exception, where, EXCEPTION_KEYS);
    checkText(exception.note, `${where}.note`, false);
  });

  function checkHours(hours, where, allowed) {
    unknownKeys(hours, allowed, where);
    if (present(hours.closed) && typeof hours.closed !== "boolean") err(`${where}.closed`, "must be true or false");
    if (hours.closed === true) {
      if (present(hours.opens) || present(hours.closes)) err(where, "closed days cannot have opens/closes");
      return;
    }
    for (const key of ["opens", "closes"]) {
      if (!TIME.test(hours[key] ?? "")) err(`${where}.${key}`, `must be a time "HH:MM" in quotes (got "${hours[key]}")`);
    }
  }

  if (!isObject(fakta.images)) err("fakta.yml › images", "is required");
  else for (const [key, file] of Object.entries(fakta.images)) {
    const where = `fakta.yml › images.${key}`;
    if (typeof file !== "string" || !file.startsWith("media/")) err(where, `must be a file in content/media/, e.g. "media/photo.jpg" (got "${file}")`);
    else if (!IMAGE_TYPES.includes(path.extname(file).toLowerCase())) err(where, `must be one of ${IMAGE_TYPES.join(", ")}`);
    else if (!fs.existsSync(path.join(CONTENT_DIR, file))) err(where, `content/${file} does not exist`);
  }

  // ---------------------------------------------------------------- meny.yml
  if (isObject(meny)) {
    const ids = new Set();
    const useId = (id, where) => {
      if (typeof id !== "string" || !ID.test(id)) return err(where, `id must use lowercase letters, numbers and hyphens (got "${id}")`);
      if (ids.has(id)) return err(where, `duplicate id "${id}"`);
      ids.add(id);
    };

    const allergenCodes = new Set();
    if (!Array.isArray(meny.allergens) || !meny.allergens.length) err("meny.yml › allergens", "the allergen list is required");
    else meny.allergens.forEach((allergen, i) => {
      const where = `meny.yml › allergens[${allergen?.code ?? i}]`;
      if (!isObject(allergen)) return err(where, "must be an object");
      unknownKeys(allergen, ["code", "name"], where);
      if (typeof allergen.code !== "string" || !/^[A-Za-z]{1,4}$/.test(allergen.code)) err(where, `code must be 1–4 letters (got "${allergen.code}")`);
      else if (allergenCodes.has(allergen.code)) err(where, `duplicate allergen code "${allergen.code}"`);
      else allergenCodes.add(allergen.code);
      checkText(allergen.name, `${where}.name`, true);
    });

    const checkItem = (item, where) => {
      if (!isObject(item)) return err(where, "must be an object");
      where = `${where}[${item.id ?? "?"}]`;
      unknownKeys(item, ITEM_KEYS, where);
      useId(item.id, where);
      checkText(item.name, `${where}.name`, true);
      checkText(item.description, `${where}.description`, false);
      checkText(item.note, `${where}.note`, false);
      checkText(item.allergenNote, `${where}.allergenNote`, false);
      const isPrice = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
      const hasPrice = present(item.price);
      const hasPrices = present(item.prices);
      if (hasPrice === hasPrices) err(where, "needs either price or prices (not both)");
      if (hasPrice && !isPrice(item.price)) err(`${where}.price`, `must be a number without "kr" (got "${item.price}")`);
      if (hasPrices) {
        if (!Array.isArray(item.prices) || !item.prices.length) err(`${where}.prices`, "must be a non-empty list");
        else item.prices.forEach((price, i) => {
          if (!isObject(price)) return err(`${where}.prices[${i}]`, "must be an object");
          unknownKeys(price, ["label", "amount"], `${where}.prices[${i}]`);
          checkText(price.label, `${where}.prices[${i}].label`, true);
          if (!isPrice(price.amount)) err(`${where}.prices[${i}].amount`, `must be a number without "kr" (got "${price.amount}")`);
        });
      }
      if (present(item.allergens)) {
        if (!Array.isArray(item.allergens)) err(`${where}.allergens`, "must be a list, e.g. [HG, M]");
        else {
          for (const code of item.allergens) {
            if (!allergenCodes.has(code)) err(`${where}.allergens`, `unknown allergen code "${code}"`);
          }
          if (new Set(item.allergens).size !== item.allergens.length) warn(`${where}.allergens`, "lists a code twice");
        }
      }
      for (const key of ["web", "print"]) {
        if (present(item[key]) && typeof item[key] !== "boolean") err(`${where}.${key}`, "must be true or false");
      }
    };

    const checkSection = (section, where, depth) => {
      if (!isObject(section)) return err(where, "must be an object");
      where = `${where}[${section.id ?? "?"}]`;
      unknownKeys(section, SECTION_KEYS, where);
      useId(section.id, where);
      checkText(section.title, `${where}.title`, true);
      checkText(section.note, `${where}.note`, false);
      checkText(section.footnote, `${where}.footnote`, false);
      if (depth === 0 && typeof section.web !== "boolean") err(`${where}.web`, "must be true (website and PDF) or false (PDF only)");
      for (const key of ["web", "print"]) {
        if (present(section[key]) && typeof section[key] !== "boolean") err(`${where}.${key}`, "must be true or false");
      }
      const items = section.items ?? [];
      const sections = section.sections ?? [];
      if (!Array.isArray(items)) err(`${where}.items`, "must be a list");
      if (!Array.isArray(sections)) err(`${where}.sections`, "must be a list");
      if (depth > 0 && present(section.sections)) err(where, "sections can only be nested one level");
      if (Array.isArray(items) && Array.isArray(sections) && !items.length && !sections.length) err(where, "has no items");
      if (Array.isArray(items)) items.forEach((item) => checkItem(item, `${where} › items`));
      if (Array.isArray(sections) && depth === 0) sections.forEach((sub) => checkSection(sub, `${where} › sections`, 1));
    };

    if (!Array.isArray(meny.sections) || !meny.sections.length) err("meny.yml › sections", "at least one section is required");
    else meny.sections.forEach((section) => checkSection(section, "meny.yml › sections", 0));
    unknownKeys(meny, ["allergens", "sections"], "meny.yml");
  }

  // ---------------------------------------------------------------- tekst/<code>.yml
  const baseTree = tekst?.[base];
  if (isObject(baseTree)) {
    const basePaths = new Set(leafPaths(baseTree));
    for (const p of basePaths) {
      const value = getPath(baseTree, p);
      if (typeof value !== "string") err(`tekst/${base}.yml › ${p}`, "must be text (empty value?)");
    }
    for (const code of codes) {
      const tree = tekst[code];
      if (code === base || !isObject(tree)) continue;
      const own = new Set(leafPaths(tree));
      for (const p of basePaths) if (!own.has(p)) missing.push(`${code}: tekst/${code}.yml › ${p}`);
      for (const p of own) {
        if (!basePaths.has(p)) err(`tekst/${base}.yml › ${p}`, `exists in tekst/${code}.yml but not in the default language`);
        else if (typeof getPath(tree, p) !== "string") err(`tekst/${code}.yml › ${p}`, "must be text (empty value?)");
      }
    }
    const required = [
      ...Object.keys(fakta.images ?? {}).map((key) => `images.${key}`),
      ...Object.keys(fakta.social ?? {}).map((key) => `social.${key}`),
      ...DAYS.map((day) => `days.${day}`),
    ];
    for (const p of required) {
      if (typeof getPath(baseTree, p) !== "string") err(`tekst/${base}.yml › ${p}`, "is required");
    }
  }
  const pdfNames = new Map();
  for (const code of codes) {
    const tree = tekst?.[code];
    if (!isObject(tree)) continue;
    for (const p of leafPaths(tree)) {
      const value = getPath(tree, p);
      if (typeof value !== "string") continue;
      if (value.includes(PLACEHOLDER)) placeholders.push(`tekst/${code}.yml › ${p}`);
      for (const [, token] of value.matchAll(/\{(\w+)\}/g)) {
        if (!TOKENS.includes(token)) warn(`tekst/${code}.yml › ${p}`, `unknown field {${token}}`);
      }
    }
    // Slugs and PDF names after fallback to the default language.
    const slugs = new Set();
    const sectionKeys = new Set([...Object.keys(baseTree?.sections ?? {}), ...Object.keys(tree.sections ?? {})]);
    for (const key of sectionKeys) {
      const slug = tree.sections?.[key]?.slug ?? baseTree?.sections?.[key]?.slug;
      if (typeof slug !== "string" || !ID.test(slug)) err(`tekst/${code}.yml › sections.${key}.slug`, `must use lowercase letters, numbers and hyphens (got "${slug}")`);
      else if (slugs.has(slug)) err(`tekst/${code}.yml › sections.${key}.slug`, `duplicate slug "${slug}"`);
      else slugs.add(slug);
    }
    const pdfName = tree.print?.pdfFilename ?? baseTree?.print?.pdfFilename;
    if (typeof pdfName !== "string" || !ID.test(pdfName)) err(`tekst/${code}.yml › print.pdfFilename`, `must use lowercase letters, numbers and hyphens (got "${pdfName}")`);
    else if (pdfNames.has(pdfName)) err(`tekst/${code}.yml › print.pdfFilename`, `"${pdfName}" is already used by "${pdfNames.get(pdfName)}"`);
    else pdfNames.set(pdfName, code);
  }

  return { errors, missing, warnings, placeholders };
}

export function formatReport({ errors, missing, warnings, placeholders }) {
  const block = (icon, title, lines) => (lines.length ? [`${icon} ${title}`, ...lines.map((line) => `    ${line}`)] : []);
  return [
    errors.length ? `Content check failed: ${errors.length} error(s)` : "Content check passed",
    ...block("✖", `${errors.length} error(s) – the build stops`, errors),
    ...block("⚠", `${missing.length} missing translation(s) – fallback text is used`, missing),
    ...block("⚠", `${warnings.length} warning(s)`, warnings),
    ...block("•", `${placeholders.length} placeholder(s) left`, placeholders),
  ].join("\n");
}
