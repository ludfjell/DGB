// Responsive images with eleventy-img: AVIF/WebP/JPEG, width and height set, lazy loading by default.
import path from "node:path";
import Image from "@11ty/eleventy-img";
import { CONTENT_DIR } from "./content.js";

const PHOTO = { widths: [480, 960, 1500], formats: ["avif", "webp", "jpeg"] };
const LOGO = { widths: [400], formats: ["png"] };

export async function processImages(images, { outputDir, urlPath }) {
  const result = {};
  for (const [key, file] of Object.entries(images)) {
    result[key] = await Image(path.join(CONTENT_DIR, file), {
      ...(key === "logo" ? LOGO : PHOTO),
      outputDir: path.join(outputDir, "media"),
      urlPath: `${urlPath}media/`,
      filenameFormat: (id, src, width, format) => `${path.parse(src).name}-${width}.${format}`,
    });
  }
  return result;
}

export function pictureHtml(metadata, { alt, sizes = "(min-width: 48rem) 46rem, 100vw", eager = false }) {
  return Image.generateHTML(metadata, {
    alt,
    sizes,
    loading: eager ? "eager" : "lazy",
    decoding: "async",
    ...(eager && { fetchpriority: "high" }),
  });
}

// The largest JPEG (or PNG) rendition, for og:image and structured data.
export function largestRendition(metadata) {
  return (metadata.jpeg ?? metadata.png).at(-1);
}
