// Turns the resolved print menu (lib/menu.js) and the sheet layout (src/_data/printLayout.js)
// into A4 sheets for src/print.njk.

const SHORT_NOTE = 40; // section notes up to this length sit next to the heading in parentheses

// Allergen codes as on the printed menu: "(Sk, Se, E. Brød: HG)".
const codes = (item) =>
  item.allergens.length ? `(${item.allergens.map((a) => a.code).join(", ")}${item.allergenNote ? `. ${item.allergenNote}` : ""})` : "";

function printItem(item) {
  const allergens = codes(item);
  return {
    name: [item.name, item.note && `(${item.note})`, !item.description && allergens].filter(Boolean).join(" "),
    volume: item.prices.some((price) => price.label) ? item.prices.map((price) => price.label).join(" / ") : null,
    price: item.prices.map((price) => price.text).join(" / "),
    description: item.description ? [item.description, allergens].filter(Boolean).join(" ") : null,
  };
}

function printSection(section, subColumns) {
  const block = (sub) => ({ title: sub.title, items: sub.items.map(printItem) });
  const byId = new Map(section.sections.map((sub) => [sub.id, sub]));
  const columns = subColumns
    ? subColumns.map((ids) => ids.filter((id) => byId.has(id)).map((id) => block(byId.get(id))))
    : [[...(section.items.length ? [{ title: null, items: section.items.map(printItem) }] : []), ...section.sections.map(block)]];
  // Subsections left out of subColumns go in the last column.
  if (subColumns) {
    const placed = new Set(subColumns.flat());
    columns.at(-1).push(...section.sections.filter((sub) => !placed.has(sub.id)).map(block));
  }
  const note = section.note && section.note.length <= SHORT_NOTE ? section.note : null;
  return {
    id: section.id,
    title: section.title,
    shortNote: note,
    longNote: section.note && !note ? section.note : null,
    footnote: section.footnote,
    columns: columns.filter((column) => column.length),
  };
}

export function allergenLines(allergens, lines = 3) {
  const size = Math.ceil(allergens.length / lines);
  return Array.from({ length: lines }, (_, i) => allergens.slice(i * size, (i + 1) * size)).filter((line) => line.length);
}

export function printSheets(sections, layout) {
  // Every section and subsection by id, with its parent (for footnotes such as the wine note).
  const index = new Map();
  for (const section of sections) {
    index.set(section.id, { section, parent: null });
    for (const sub of section.sections) index.set(sub.id, { section: sub, parent: section });
  }
  const used = new Set();
  const take = (id) => {
    const entry = index.get(id);
    if (!entry) return null; // removed from meny.yml or PDF-only flag changed
    used.add(id);
    if (entry.parent) used.add(entry.parent.id);
    return entry;
  };

  const sheets = layout.map((sheet) => {
    const footnotes = new Set();
    const place = (id, subColumns) => {
      const entry = take(id);
      if (!entry) return null;
      if (entry.parent?.footnote) footnotes.add(entry.parent.footnote);
      if (subColumns) entry.section.sections.forEach((sub) => used.add(sub.id));
      return printSection(entry.section, subColumns);
    };
    const columns = sheet.columns
      ? sheet.columns.map((ids) => ids.map((id) => place(id)).filter(Boolean))
      : [(sheet.sections ?? []).map((id) => place(id, sheet.subColumns)).filter(Boolean)];
    return { grid: Boolean(sheet.columns), columns, allergens: Boolean(sheet.allergens), footnotes: [...footnotes] };
  });

  const leftover = sections.filter((section) => !used.has(section.id) && !section.sections.some((sub) => used.has(sub.id)));
  if (leftover.length) {
    console.warn(`[print] Not placed in src/_data/printLayout.js, added on an extra sheet: ${leftover.map((s) => s.id).join(", ")}`);
    sheets.push({ grid: false, columns: [leftover.map((section) => printSection(section))], allergens: false, footnotes: [] });
  }
  return sheets.filter((sheet) => sheet.columns.some((column) => column.length));
}
