// npm run validate – checks content/ without building. Exit code 1 when there are errors.
import { loadContent } from "../lib/content.js";
import { formatReport, validate } from "../lib/validate.js";

const report = validate(loadContent());
console.log(formatReport(report));
process.exitCode = report.errors.length ? 1 : 0;
