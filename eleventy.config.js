import config from "./site.config.js";
import { loadContent } from "./lib/content.js";
import { buildSite } from "./lib/site.js";
import { formatReport, validate } from "./lib/validate.js";

const OUTPUT = "_site";

export default function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./content/");
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets", "content/media/favicon.png": "favicon.png" });
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
