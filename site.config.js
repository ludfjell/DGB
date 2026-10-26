// Build settings. Everything visitors see lives in content/ – not here.
export default {
  // The address the site is published at, including the path. Every link, image and PDF URL
  // is built from this one setting.
  //   Prototype on GitHub Pages: "https://ludfjell.github.io/DGB/"
  //   At launch:                 "https://www.detgamlebageri.no/"
  siteUrl: "https://ludfjell.github.io/DGB/",

  // Time zone for "today" when upcoming opening-hour exceptions are picked.
  timeZone: "Europe/Oslo",

  // How many days ahead exceptions to the opening hours are shown.
  exceptionsWindowDays: 60,

  // Google Search Console verification carried over from the current site.
  googleSiteVerification: "FztlGNHsUrJyx4de2xGIxcz-hsBM5w0fzWN47445gFk",

  // Old Squarespace addresses that forward visitors to the new page.
  // section = key of a front-page section (see sections in content/tekst/*.yml).
  redirects: [
    { from: "/meny/", section: "menu" },
    { from: "/hjem/" },
  ],
};
