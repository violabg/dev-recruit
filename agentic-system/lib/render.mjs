// Renders the review document: the template (assets/design-review.html) with the design JSON inlined.
// The page renders itself client-side from that JSON, so the document is one self-contained file.
import { runChecks } from "./checks.mjs";
import { authorisationOf, batchOf } from "./plan.mjs";

const MARKER = "/*__DESIGN_DATA__*/null";
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

// `knowledge` carries the text of every knowledge reference, resolved by the caller when it renders.
export function renderDocument(template, design, { knowledge = [] } = {}) {
  if (!template.includes(MARKER)) throw new Error("design-review.html has no data marker");
  const batches = Object.fromEntries(design.path.operations.map((op) => [op.id, { batch: batchOf(op), authorisation: authorisationOf(op) }]));
  const payload = { design, checks: runChecks(design), knowledge, batches };
  const json = JSON.stringify(payload)
    .split("<").join("\\u003c")
    .split(LINE_SEPARATOR).join("\\u2028")
    .split(PARAGRAPH_SEPARATOR).join("\\u2029");
  const title = (design.path.title ?? design.designId).replace(/[<>&]/g, "");
  return template.replace(MARKER, () => json).replace("<title>Design</title>", () => `<title>${title} — Design</title>`);
}
