// Language helpers.
//   Translatable values in fakta.yml and meny.yml: { no: "...", en: "..." }
//   Language files (content/tekst/<code>.yml): one tree per language with the same keys.
// Missing translations fall back along fakta.fallbackLanguages (English, then Norwegian).

export const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function defaultLanguage(fakta) {
  return fakta.languages.find((lang) => lang.default === true);
}

// The default language never falls back: it is the required base.
export function fallbackChain(code, fakta) {
  if (code === defaultLanguage(fakta).code) return [code];
  return [...new Set([code, ...(fakta.fallbackLanguages ?? []), defaultLanguage(fakta).code])];
}

export function pick(value, chain) {
  if (!isObject(value)) return undefined;
  for (const code of chain) {
    const text = value[code];
    if (typeof text === "string" && text.trim() !== "") return text;
  }
  return undefined;
}

// Deep-merges language trees, highest priority first. Objects merge by key,
// lists merge by position, everything else: first value present wins.
export function mergeTrees(trees) {
  return trees.filter((tree) => tree !== undefined).reduceRight((fallback, primary) => mergeTwo(primary, fallback), undefined);
}

function mergeTwo(primary, fallback) {
  if (primary === undefined || primary === null) return fallback;
  if (fallback === undefined || fallback === null) return primary;
  if (isObject(primary) && isObject(fallback)) {
    const out = {};
    for (const key of new Set([...Object.keys(fallback), ...Object.keys(primary)])) {
      out[key] = mergeTwo(primary[key], fallback[key]);
    }
    return out;
  }
  if (Array.isArray(primary) && Array.isArray(fallback)) {
    return Array.from({ length: Math.max(primary.length, fallback.length) }, (_, i) => mergeTwo(primary[i], fallback[i]));
  }
  return primary;
}

// Replaces {name}, {phone}, ... in every string of a tree. Unknown tokens are left alone.
export function interpolate(tree, tokens) {
  if (typeof tree === "string") return tree.replace(/\{(\w+)\}/g, (match, key) => (key in tokens ? tokens[key] : match));
  if (Array.isArray(tree)) return tree.map((value) => interpolate(value, tokens));
  if (isObject(tree)) return Object.fromEntries(Object.entries(tree).map(([key, value]) => [key, interpolate(value, tokens)]));
  return tree;
}

// Every leaf path in a tree, e.g. "faq[3].answer".
export function leafPaths(tree, prefix = "") {
  if (Array.isArray(tree)) return tree.flatMap((value, i) => leafPaths(value, `${prefix}[${i}]`));
  if (isObject(tree)) return Object.entries(tree).flatMap(([key, value]) => leafPaths(value, prefix ? `${prefix}.${key}` : key));
  return [prefix];
}

export function getPath(tree, dotted) {
  return dotted
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce((node, key) => (node === undefined || node === null ? undefined : node[key]), tree);
}
