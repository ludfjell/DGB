import config from "./site.config.js";
import { loadContent } from "./lib/content.js";
import { allergenLines, printSheets } from "./lib/print.js";
import { buildSite } from "./lib/site.js";
import { formatReport, validate } from "./lib/validate.js";

const OUTPUT = "_site";

export default function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./content/");
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets", "content/media/favicon.png": "favicon.png" });
  for (const file of ["fraunces-latin-opsz-normal", "fraunces-latin-opsz-italic"]) {
    eleventyConfig.addPassthroughCopy({ [`node_modules/@fontsource-variable/fraunces/files/${file}.woff2`]: `assets/fonts/${file}.woff2` });
  }
  for (const file of ["archivo-latin-400-normal", "archivo-latin-400-italic", "archivo-latin-600-normal", "archivo-latin-700-normal"]) {
    eleventyConfig.addPassthroughCopy({ [`node_modules/@fontsource/archivo/files/${file}.woff2`]: `assets/fonts/${file}.woff2` });
  }

  // Print menu (src/print.njk)
  eleventyConfig.addFilter("printSheets", printSheets);
  eleventyConfig.addFilter("allergenLines", (allergens) => allergenLines(allergens));
  // Escapes text and sets "&" upright (the tagline is italic).
  eleventyConfig.addFilter("ampersand", (text) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&amp;/g, '<span class="amp">&amp;</span>'),
  );
  // A template that refers to a missing text key fails the build instead of printing nothing.
  eleventyConfig.setNunjucksEnvironmentOptions({ throwOnUndefined: true, trimBlocks: true, lstripBlocks: true });

  // Content is validated before every build. Any error stops the build, so a broken edit never goes live.
  eleventyConfig.addGlobalData("site", async () => {
    const content = loadContent();
    const report = validate(content);
    console.log(formatReport(report));
    if (report.errors.length) throw new Error(`content/ has ${report.errors.length} error(s) – see the list above.`);
    return buildSite(content, config, { outputDir: OUTPUT });
  });

  return {
    dir: { input: "src", includes: "_includes", output: OUTPUT },
    // Lets the dev server (npm start) serve the site under the same path as on GitHub Pages.
    pathPrefix: new URL(config.siteUrl).pathname,
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
