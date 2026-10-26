// Structured data (schema.org JSON-LD) from the same data as the visible page.
// The menu contains web-visible items only, so it matches what visitors see.

export function buildJsonLd({ fakta, page, t, menu, hours, faq, images }) {
  const restaurant = {
    "@type": "Restaurant",
    "@id": `${page.siteUrl}#restaurant`,
    name: fakta.name,
    ...(fakta.alternateName && { alternateName: fakta.alternateName }),
    url: page.url,
    telephone: fakta.phone,
    email: fakta.email,
    image: images.hero.url,
    logo: images.logo.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: fakta.address.street,
      postalCode: fakta.address.postalCode,
      addressLocality: fakta.address.locality,
      addressCountry: fakta.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: fakta.geo.latitude, longitude: fakta.geo.longitude },
    ...(page.cuisine.length && { servesCuisine: page.cuisine }),
    ...(fakta.priceRange && { priceRange: fakta.priceRange }),
    ...(typeof fakta.acceptsReservations === "boolean" && { acceptsReservations: fakta.acceptsReservations }),
    openingHoursSpecification: hours.specification,
    ...(hours.special.length && { specialOpeningHoursSpecification: hours.special }),
    sameAs: Object.values(fakta.social),
    hasMenu: { "@id": page.menuId },
  };

  const offer = (price) => ({ "@type": "Offer", ...(price.label && { name: price.label }), price: price.amount, priceCurrency: fakta.currency });
  const item = (entry) => ({
    "@type": "MenuItem",
    name: entry.name,
    ...(entry.description && { description: entry.description }),
    offers: entry.prices.length === 1 ? offer(entry.prices[0]) : entry.prices.map(offer),
  });
  const section = (entry) => ({
    "@type": "MenuSection",
    name: entry.title,
    ...(entry.note && { description: entry.note }),
    ...(entry.items.length && { hasMenuItem: entry.items.map(item) }),
    ...(entry.sections.length && { hasMenuSection: entry.sections.map(section) }),
  });
  const menuNode = {
    "@type": "Menu",
    "@id": page.menuId,
    name: t.sections.menu.title,
    url: page.menuId,
    inLanguage: page.htmlLang,
    hasMenuSection: menu.web.map(section),
  };

  const faqNode = faq.length && {
    "@type": "FAQPage",
    "@id": page.faqId,
    inLanguage: page.htmlLang,
    mainEntity: faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  const graph = [restaurant, menuNode, faqNode].filter(Boolean);
  // "<" is escaped so the JSON can never close the surrounding <script> element.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");
}
