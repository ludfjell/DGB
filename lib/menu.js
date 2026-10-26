// Resolves meny.yml for one language and splits it into the web menu and the print menu.
import { pick } from "./i18n.js";

export function resolveMenu(meny, chain, { priceFormat, locale }) {
  const number = new Intl.NumberFormat(locale);
  const priceText = (amount) => priceFormat.replace("{amount}", number.format(amount));
  const allergenNames = new Map(meny.allergens.map((allergen) => [allergen.code, pick(allergen.name, chain)]));

  const item = (raw, inherited) => ({
    id: raw.id,
    name: pick(raw.name, chain),
    description: pick(raw.description, chain) ?? null,
    note: pick(raw.note, chain) ?? null,
    prices: raw.prices?.length
      ? raw.prices.map((price) => ({ label: pick(price.label, chain), amount: price.amount, text: priceText(price.amount) }))
      : [{ label: null, amount: raw.price, text: priceText(raw.price) }],
    allergens: (raw.allergens ?? []).map((code) => ({ code, name: allergenNames.get(code) })),
    allergenNote: pick(raw.allergenNote, chain) ?? null,
    web: raw.web ?? inherited.web,
    print: raw.print ?? inherited.print,
  });

  const section = (raw, inherited) => {
    const flags = { web: raw.web ?? inherited.web, print: raw.print ?? inherited.print };
    return {
      id: raw.id,
      title: pick(raw.title, chain),
      note: pick(raw.note, chain) ?? null,
      footnote: pick(raw.footnote, chain) ?? null,
      items: (raw.items ?? []).map((entry) => item(entry, flags)),
      sections: (raw.sections ?? []).map((entry) => section(entry, flags)),
    };
  };

  const all = meny.sections.map((entry) => section(entry, { web: true, print: true }));
  return {
    allergens: meny.allergens.map((allergen) => ({ code: allergen.code, name: allergenNames.get(allergen.code) })),
    web: visible(all, "web"),
    print: visible(all, "print"),
  };
}

// Section flags are defaults for their items; a section is shown when anything in it is.
function visible(sections, flag) {
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => item[flag]), sections: visible(section.sections, flag) }))
    .filter((section) => section.items.length || section.sections.length);
}
