// /llms.txt – a plain Markdown summary for language models, built from the same data as the pages.

export function buildLlms({ fakta, pages }) {
  const lines = [`# ${fakta.name}${fakta.alternateName ? ` (${fakta.alternateName})` : ""}`, ""];
  for (const page of pages) lines.push(`> ${page.t.intro.text}`, "");

  for (const page of pages) {
    const { t } = page;
    lines.push(`## ${t.languageName}`, "", `- [${t.languageName}](${page.url})`, `- [${t.menu.pdfLink}](${page.pdf.url})`, "");

    lines.push(`### ${t.sections.contact.title}`, "");
    lines.push(`- ${t.contact.addressLabel}: ${page.contact.addressLine}`);
    lines.push(`- ${t.contact.phoneLabel}: ${page.contact.phone}`);
    lines.push(`- ${t.contact.emailLabel}: ${page.contact.email}`, "");

    lines.push(`### ${t.contact.hoursTitle}`, "", ...page.hours.weekly.map((row) => `- ${row.label}: ${row.text}`), "");
    if (page.hours.exceptions.length) {
      lines.push(`### ${t.contact.exceptionsTitle}`, "");
      for (const row of page.hours.exceptions) lines.push(`- ${row.label}: ${row.text}${row.note ? ` (${row.note})` : ""}`);
      lines.push("");
    }

    lines.push(`### ${t.sections.menu.title}`, "");
    for (const section of page.menu.web) {
      lines.push(`#### ${section.title}`, "");
      if (section.note) lines.push(section.note, "");
      for (const item of section.items) {
        const prices = item.prices.map((price) => (price.label ? `${price.label} ${price.text}` : price.text)).join(", ");
        const note = item.allergenNote ? `; ${item.allergenNote}` : "";
        const allergens = item.allergens.length ? ` (${t.menu.allergensLabel}: ${item.allergens.map((a) => a.code).join(", ")}${note})` : "";
        lines.push(`- ${item.name}${item.note ? ` (${item.note})` : ""}: ${prices}${item.description ? `. ${item.description}` : ""}${allergens}`);
      }
      lines.push("");
    }
    lines.push(`#### ${t.menu.legendTitle}`, "", page.menu.allergens.map((a) => `${a.code}: ${a.name}`).join(", "), "");

    if (page.faq.length) {
      lines.push(`### ${t.sections.faq.title}`, "");
      for (const entry of page.faq) lines.push(`**${entry.question}**`, entry.answer, "");
    }
  }
  return lines.join("\n");
}
