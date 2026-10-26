// Reads the YAML files in content/. Parse errors are collected, not thrown,
// so the validator can report every problem at once.
import fs from "node:fs";
import path from "node:path";
import { CORE_SCHEMA, load } from "js-yaml";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const CONTENT_DIR = path.join(ROOT, "content");

function readYaml(rel, errors) {
  const file = path.join(CONTENT_DIR, rel);
  if (!fs.existsSync(file)) {
    errors.push(`content/${rel}: file is missing`);
    return undefined;
  }
  try {
    // CORE_SCHEMA keeps dates and times as plain strings.
    return load(fs.readFileSync(file, "utf8"), { schema: CORE_SCHEMA, filename: rel }) ?? {};
  } catch (error) {
    errors.push(`content/${rel}: invalid YAML – ${error.message}`);
    return undefined;
  }
}

export function loadContent() {
  const loadErrors = [];
  const fakta = readYaml("fakta.yml", loadErrors);
  const meny = readYaml("meny.yml", loadErrors);
  const tekst = {};
  const languages = Array.isArray(fakta?.languages) ? fakta.languages : [];
  for (const lang of languages) {
    if (typeof lang?.code === "string") tekst[lang.code] = readYaml(`tekst/${lang.code}.yml`, loadErrors);
  }
  return { fakta, meny, tekst, loadErrors };
}
