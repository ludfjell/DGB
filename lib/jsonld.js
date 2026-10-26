// Structured data (schema.org JSON-LD) from the same data as the visible pages.
// Front page: Restaurant + FAQPage. Menu page: Menu with web-visible items only, so it matches what visitors see.

// "<" is escaped so the JSON can never close the surrounding <script> element.
const serialize = (graph) => JSON.stringify({ "@context": "https://schema.org", "@graph": graph.filter(Boolean) }, null, 2).replace(/</g, "\\u003c");
const restaurantId = (page) => `${page.siteUrl}#restaurant`;

export function restaurantJsonLd({ fakta, page, hours, faq, images }) {
  const restaurant = {
    "@type": "Restaurant",
    "@id": restaurantId(page),
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
    hasMenu: { "@id": page.menuUrl },
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

  return serialize([restaurant, faqNode]);
}

export function menuJsonLd({ fakta, page, t, menu }) {
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

  return serialize([
    {
      "@type": "Menu",
      "@id": page.menuUrl,
      name: t.sections.menu.title,
      url: page.menuUrl,
      inLanguage: page.htmlLang,
      provider: { "@id": restaurantId(page) },
      hasMenuSection: menu.web.map(section),
    },
  ]);
}
