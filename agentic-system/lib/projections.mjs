// Markdown projections of the design (contracts/projections.md), built from the design on each call.
import { isHighlighted, runChecks } from "./checks.mjs";
import { batchOf } from "./plan.mjs";
import { RuntimeError, findText, shortTime } from "./util.mjs";

const lower = (value) => (value ?? "").toString().toLowerCase();
const join = (items) => (items?.length ? items.join(", ") : "none");
const oneLine = (text) => (text ?? "").replace(/\s*\n\s*/g, " ").trim();

function failureArms(operation) {
  const parts = [];
  for (const b of operation.branches ?? []) {
    parts.push(`branch: ${oneLine(b.question)} → yes: ${oneLine(b.yes?.label)} (${oneLine(b.yes?.note)}) / no: ${oneLine(b.no?.label)} (${oneLine(b.no?.note)}) — why: ${oneLine(b.why)}`);
  }
  for (const n of operation.negatives ?? []) parts.push(`negative: ${oneLine(n.cause)} → ${oneLine(n.behavior)} (impact ${n.impact ?? "n/a"})`);
  for (const x of operation.exceptions ?? []) parts.push(`exception: ${oneLine(x.trigger)} → ${oneLine(x.recovery)}`);
  return parts;
}

// The reason an operation declares no knowledge or no file reference, when it gives one.
function exemptions(op) {
  const out = [];
  if (!(op.knowledgeReferences ?? []).length && op.referencesExemption?.knowledge) out.push(`no knowledge: ${oneLine(op.referencesExemption.knowledge)}`);
  if (!(op.fileReferences ?? []).length && op.referencesExemption?.file) out.push(`no file references: ${oneLine(op.referencesExemption.file)}`);
  return out;
}

function fileReferenceLine(fr) {
  const details = (fr.files ?? []).map((file) => {
    const d = (fr.details ?? []).find((x) => x.path === file);
    return `${file}${d?.line ? `:${d.line}` : ""} (why: ${oneLine(d?.why) || "(not recorded)"} | purpose: ${oneLine(d?.purpose) || "(not recorded)"})`;
  });
  return `- ${fr.id} | scope: ${lower(fr.scope ?? "Production")} | symbol: ${fr.symbol}${fr.definitionPath ? ` | defined in: ${fr.definitionPath}` : ""} | files: ${details.join("; ") || "none"}`;
}

const realizing = (design, field, id) => design.path.operations.filter((op) => (op[field] ?? []).includes(id)).map((op) => op.id);

const contractLine = (design, c) => {
  const premortem = (c.premortem ?? []).map((m) => `${oneLine(m.what)} → ${oneLine(m.mitigation)}`).join("; ");
  return `- ${c.id} | ${lower(c.type)} | module: ${c.module ?? ""} | file: ${c.file ?? ""} | promises: ${oneLine(c.promises)} | signature: ${oneLine(c.signature)} | premortem: ${premortem || "none"} | realized by: ${join(realizing(design, "refContracts", c.id))}`;
};

const apiLine = (design, a) => {
  const responses = (a.responses ?? []).map((r) => `${r.status} ${oneLine(r.description)}${r.body ? ` body: ${oneLine(r.body)}` : ""}`).join("; ");
  return `- ${a.id} | ${a.method} ${a.path} | purpose: ${oneLine(a.purpose)} | auth: ${oneLine(a.auth)} | request: ${oneLine(a.request)} | responses: ${responses || "none"} | realized by: ${join(realizing(design, "refApis", a.id))}`;
};

const fileLine = (f) => `- ${f.id} | ${lower(f.status)} | ${f.path} | module: ${f.module ?? ""} | reason: ${oneLine(f.reason)} | change: ${oneLine(f.change)} | impact: ${oneLine(f.impact)}`;

const decisionLine = (design, d) => {
  const options = d.options.map((o) => `${o.id}${o.chosen ? " (chosen)" : ""}: ${oneLine(o.text)}`).join(" || ");
  return `- ${d.id} | ${lower(d.source)} | highlight: ${isHighlighted(d)} | topic: ${oneLine(d.topic)} | question: ${oneLine(d.question)} | context: ${oneLine(d.context)} | why: ${oneLine(d.why)} | how: ${oneLine(d.how)} | realized by: ${join(realizing(design, "realizes", d.id))} | options: ${options}`;
};

const obligationLine = (o) => `- ${o.id} | ${lower(o.origin ?? "Requirement")} | ${oneLine(o.behavior)} | class: ${oneLine(o.class)} | boundaries: ${oneLine(o.boundaries)} | source: ${oneLine(o.sourceRef)}`;

export function snapshot(design) {
  const { coverage } = runChecks(design);
  const p = design.path;
  const out = [];
  out.push(`# Design snapshot — ${design.designId}`);
  out.push(
    `status: ${design.status}${design.modifiedAfterApproval ? " (modified after approval)" : ""}` +
      (design.planName ? ` | plan: ${design.planName}` : "") +
      (design.approvedAt ? ` | approved: ${shortTime(design.approvedAt)}` : "") +
      (p.title ? ` | title: ${p.title}` : ""),
  );
  out.push("", "## Overview");
  out.push(`- current codebase: ${oneLine(design.overview.currentState) || "(not recorded)"}`);
  out.push(`- gaps: ${oneLine(design.overview.gaps) || "(not recorded)"}`);
  out.push("", "## Obligations", ...design.obligations.map(obligationLine));
  out.push("", "## File references", ...design.fileReferences.map(fileReferenceLine));
  out.push("", "## Knowledge references");
  for (const k of design.knowledgeReferences ?? []) {
    out.push(`- kid ${k.kid} | fId ${k.fId} | ${k.filePath ?? "(no path)"} | lines ${k.range.s}–${k.range.e} | scope: ${lower(k.scope ?? "Production")}`);
  }
  out.push("", "## Contracts", ...p.contracts.map((c) => contractLine(design, c)));
  out.push("", "## Public APIs", ...p.apis.map((a) => apiLine(design, a)));
  out.push("", "## Filesystem", ...p.filesystem.files.map(fileLine));
  out.push("", "## Operations");
  for (const op of p.operations) {
    const arms = failureArms(op);
    out.push(
      `- ${op.id} | ${lower(op.kind)}${op.testType ? ` | test type: ${op.testType}` : ""} | batch: ${batchOf(op)}${op.hasDestructiveSideEffects ? " | destructive" : ""} | ${oneLine(op.operation)} | status: ${op.implementationStatus ?? "not started"} | dependsOn: ${join(op.dependsOn)} | files: ${join(op.files)} | implements: ${join(op.refObligations)} | contracts: ${join(op.refContracts)} | apis: ${join(op.refApis)} | knowledge: ${join((op.knowledgeReferences ?? []).map((kid) => `kid ${kid}`))} | file references: ${join(op.fileReferences)} | realizes: ${join(op.realizes)}` +
        (op.source ? ` | source: ${op.source}${op.sourceRef ? ` (${oneLine(op.sourceRef)})` : ""}` : "") +
        exemptions(op).map((e) => ` | ${e}`).join("") +
        ` | instructions: ${oneLine(op.instructions)}` +
        (arms.length ? ` | ${arms.join(" | ")}` : ""),
    );
  }
  out.push("", "## Decisions", ...design.decisions.map((d) => decisionLine(design, d)));
  out.push("", "## History");
  for (const it of design.iterations) {
    const files = (it.files ?? []).map((f) => `${lower(f.change)} ${f.path}`).join("; ");
    const verifications = (it.verifications ?? []).map((v) => `${v.kind} ${v.name}: ${oneLine(v.outcome)}`).join("; ");
    out.push(
      `- ${it.id} | ${lower(it.status)} | request: ${oneLine(it.request)} | created: ${shortTime(it.createdAt)} | closed: ${shortTime(it.closedAt) || "open"} | files: ${files || "none"} | verifications: ${verifications || "none"} | blocks: ${join(it.blocks)} | notes: ${oneLine(it.notes) || "none"}`,
    );
  }
  out.push("", "## Coverage");
  out.push(`- obligations ${coverage.obligationsRealized}/${coverage.obligationsTotal}`);
  return `${out.join("\n")}\n`;
}

// Lab-authored: part of the snapshot, by section and by item id, read from the snapshot itself so a row reads the same
// either way. A row's id is its first field (`IM3`, `CT1`, `kid 7`). A selection that finds nothing refuses, naming
// what exists, and an id that is missing is reported beside the rows that were found.
const listOf = (value) => [value].flat().flatMap((item) => String(item).split(",")).map((item) => item.trim()).filter(Boolean);

function snapshotSections(text) {
  const [head, ...blocks] = text.replace(/\n+$/, "").split(/\n(?=## )/);
  const sections = blocks.map((block) => {
    const [heading, ...rows] = block.split("\n");
    return { name: heading.slice(3), rows: rows.filter(Boolean) };
  });
  return { head, sections };
}

const rowId = (row) => row.slice(2).split(" | ")[0].trim();

// Lab-authored: the first answer for a design too long for one answer: its status, what each section holds and how to
// read it. The rows stay one call away, so no text becomes unavailable (contracts/projections.md).
export function snapshotIndex(text, flags) {
  const { head, sections } = snapshotSections(text);
  const held = ({ name, rows }) => {
    const ids = name === "Overview" || !rows.length ? "" : `, ${rowId(rows[0])} to ${rowId(rows[rows.length - 1])}`;
    const size = Math.ceil(Buffer.byteLength(rows.join("\n"), "utf8") / 1024);
    return `- ${name}: ${rows.length} row${rows.length === 1 ? "" : "s"}${ids}, ${size} KB`;
  };
  const coverage = sections.find((s) => s.name === "Coverage");
  return [
    head.trimEnd(),
    "",
    "This design is too long for one answer, so this is its index. Nothing is left out: read only what the current work needs.",
    "",
    "## Sections",
    ...sections.filter((s) => s !== coverage).map(held),
    "",
    "## Coverage",
    ...coverage.rows,
    "",
    `The whole design, in parts (CLI: ${flags} --part 1).`,
    `One section (CLI: ${flags} --section Operations).`,
    `A few items (CLI: ${flags} --ids IM3,CT1).`,
    "",
  ].join("\n");
}

// A section is named as the snapshot titles it; case, spaces and punctuation do not matter, and the table names the
// design writes use are accepted too (`apis`, `files`).
const plain = (name) => String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
const SECTION_ALIASES = { api: "publicapis", apis: "publicapis", file: "filesystem", files: "filesystem", knowledge: "knowledgereferences" };
const sectionKey = (name) => SECTION_ALIASES[plain(name)] ?? plain(name);

// The fields of a row are its `label: value` segments. A segment with no label continues the field before it.
function rowFields(row, wanted) {
  const [id, ...segments] = row.slice(2).split(" | ");
  const kept = [];
  let keep = false;
  for (const segment of segments) {
    const label = /^([A-Za-z][A-Za-z ]{0,30}): /.exec(segment);
    if (label) keep = wanted.includes(plain(label[1]));
    if (keep) kept.push(segment);
  }
  return kept.length ? `- ${id} | ${kept.join(" | ")}` : null;
}

const BRIEF_CHARS = 200;
const GREP_AROUND = 80;
const GREP_SHOWN = 5;

// The places a row holds the text, each with the text around it, so a long row is not read to find one sentence.
function rowMatches(row, query) {
  const found = findText(row.toLowerCase(), String(query).toLowerCase());
  if (!found.length) return null;
  const shown = found.slice(0, GREP_SHOWN).map(([from, to]) => `…${row.slice(Math.max(2, from - GREP_AROUND), to + GREP_AROUND)}…`);
  const more = found.length > GREP_SHOWN ? ` | (${found.length - GREP_SHOWN} more)` : "";
  return `- ${rowId(row)} | ${found.length} match${found.length === 1 ? "" : "es"} | ${shown.join(" | ")}${more}`;
}

// Lab-authored: part of the snapshot. `section` and `ids` choose rows, `fields` the fields of each row, `grep` the
// rows that hold a text, and `brief` cuts each row to its start. They combine, in that order.
export function snapshotSelection(text, { section, ids, fields, brief, grep }) {
  const { head, sections } = snapshotSections(text);
  const wanted = section === undefined ? null : listOf(section).map(sectionKey);
  const unknown = section === undefined ? [] : listOf(section).filter((name) => !sections.some((s) => plain(s.name) === sectionKey(name)));
  if (unknown.length) throw new RuntimeError(`design-snapshot failed: no section '${unknown.map((name) => name.toLowerCase()).join("', '")}'. Sections: ${sections.map((s) => s.name).join(", ")}.`);
  const items = ids === undefined ? null : listOf(ids).map((id) => id.toLowerCase());
  const columns = fields === undefined ? null : listOf(fields).map(plain);
  const found = new Set();
  const out = [head.trimEnd()];
  let shown = 0;
  for (const s of sections) {
    if (wanted && !wanted.includes(plain(s.name))) continue;
    let rows = items === null ? s.rows : s.rows.filter((row) => {
      const id = rowId(row).toLowerCase();
      if (!row.startsWith("- ") || !items.includes(id)) return false;
      found.add(id);
      return true;
    });
    const narrowed = columns !== null || grep !== undefined;
    if (columns) rows = rows.map((row) => (row.startsWith("- ") ? rowFields(row, columns) : null)).filter(Boolean);
    if (grep !== undefined) rows = rows.map((row) => rowMatches(row, grep)).filter(Boolean);
    if (brief) rows = rows.map((row) => (row.length > BRIEF_CHARS ? `${row.slice(0, BRIEF_CHARS)} …` : row));
    shown += rows.length;
    if (rows.length || (items === null && !narrowed)) out.push("", `## ${s.name}`, ...rows);
  }
  const missing = (items ?? []).filter((id) => !found.has(id));
  if (items && found.size === 0) throw new RuntimeError(`design-snapshot failed: no item '${missing.join("', '")}'${wanted ? " in that section" : ""}. A row's id is its first field: O1, FR1, kid 1, CT1, API1, FS1, IM1, D1, IT1.`);
  if (columns && shown === 0 && grep === undefined) throw new RuntimeError(`design-snapshot failed: no field '${listOf(fields).join("', '")}' in those rows. A field is the label before a colon in a row, such as instructions, files, promises, signature or change.`);
  if (grep !== undefined && shown === 0) out.push("", `No row contains '${grep}'.`);
  if (missing.length) out.push("", `Not found: ${missing.join(", ")}.`);
  return `${out.join("\n")}\n`;
}

// The contracts an operation realizes: the ones it declares in refContracts, and, for a design written before
// refContracts existed, the ones hosted in its files.
function operationContracts(design, op) {
  const files = new Set(op.files ?? []);
  return design.path.contracts.filter((c) => (op.refContracts ?? []).includes(c.id) || files.has(c.file));
}

// The view the design verifier judges. Only obligation labels are kept: the verifier judges the content presented,
// never the internal mapping. Each obligation carries the instructions of the operations that realize it; what an
// operation shares across obligations (failure arms, contracts, files) is printed once, under the operation's name.
export function verificationView(design, grounding = []) {
  const p = design.path;
  const out = [`# Design verification view`, ""];
  if (design.obligations.length === 0) {
    out.push("The design carries no obligation yet.");
    return `${out.join("\n")}\n`;
  }
  // The knowledge the whole design grounds in, beside the per-obligation grounding below: read each one.
  out.push("## Knowledge grounding");
  if (grounding.length === 0) out.push("- none");
  for (const k of grounding) out.push(`- file_id ${k.file_id}: ${k.path} (${k.why.join(", ")})`);
  // Lab-authored: name the call, so the verifier reads the documents instead of grepping or skipping them.
  if (grounding.length) {
    const ids = grounding.map((k) => k.file_id).join(",");
    out.push("", `Read every document above before judging: call knowledge-read with these file ids and this session (CLI: --fileIds ${ids} --sessionId ${design.sessionId}) and follow its parts.`);
  }
  out.push("", "Under each obligation, mechanisms shows the instructions that address it. Their failure arms, contracts and files are under Operations, and their decisions under Decisions.", "");
  const addressing = new Set();
  for (const obligation of design.obligations) {
    const operations = p.operations.filter((op) => (op.refObligations ?? []).includes(obligation.id));
    out.push(`## ${obligation.id}`);
    out.push(`- claim: ${oneLine(obligation.behavior)}`);
    if (obligation.class) out.push(`- class: ${oneLine(obligation.class)}`);
    if (obligation.boundaries) out.push(`- boundaries: ${oneLine(obligation.boundaries)}`);
    out.push(`- origin: ${obligation.origin ?? "Requirement"}`);
    out.push("- mechanisms:");
    if (operations.length === 0) out.push("  - none");
    for (const op of operations) {
      addressing.add(op.id);
      out.push(`  - in "${oneLine(op.operation)}" (${lower(op.kind)}): ${oneLine(op.instructions) || "(no instructions)"}`);
    }
    const grounded = operations.filter((op) => op.source === "Knowledge").map((op) => oneLine(op.sourceRef));
    out.push(`- knowledge grounding: ${grounded.length ? [...new Set(grounded)].join("; ") : "none"}`);
    out.push("");
  }
  // The conformance comparison covers every section and every operation, in plan order, whether or not it
  // addresses an obligation: a documentation or test step can break a sequencing or representation prescription too.
  const names = new Map(p.operations.map((op) => [op.id, `"${oneLine(op.operation)}"`]));
  const planned = new Set(p.operations.flatMap((op) => op.files ?? []));
  const realizedContracts = new Set(p.operations.flatMap((op) => operationContracts(design, op).map((c) => c.id)));
  out.push("# Operations", "");
  p.operations.forEach((op, index) => {
    const files = new Set(op.files ?? []);
    out.push(`## "${oneLine(op.operation)}" (${lower(op.kind)})`);
    out.push(`- plan position: ${index + 1} of ${p.operations.length}${op.testType ? ` | test type: ${lower(op.testType)}` : ""}${op.hasDestructiveSideEffects ? " | destructive side effects" : ""} | depends on: ${join((op.dependsOn ?? []).map((id) => names.get(id) ?? "(unknown operation)"))}`);
    if (!addressing.has(op.id)) out.push("- addresses no obligation", `- instructions: ${oneLine(op.instructions) || "none"}`);
    if (op.source) out.push(`- source: ${lower(op.source)}${op.sourceRef ? ` (${oneLine(op.sourceRef)})` : ""}`);
    const cited = (op.knowledgeReferences ?? []).map((kid) => (design.knowledgeReferences ?? []).find((r) => r.kid === kid)).filter(Boolean);
    if (cited.length) out.push(`- knowledge: ${cited.map((r) => `${r.filePath ?? "(no file)"} lines ${r.range?.s}–${r.range?.e}`).join("; ")}`);
    for (const exemption of exemptions(op)) out.push(`- ${exemption}`);
    const arms = failureArms(op);
    out.push("- failure arms:");
    if (arms.length === 0) out.push("  - none");
    for (const arm of arms) out.push(`  - ${arm}`);
    const contracts = operationContracts(design, op);
    out.push("- contracts:");
    if (contracts.length === 0) out.push("  - none");
    for (const c of contracts) out.push(`  - ${oneLine(c.promises)} | signature: ${oneLine(c.signature)}${c.type ? ` | type: ${lower(c.type)}` : ""}`);
    const apis = p.apis.filter((a) => (op.refApis ?? []).includes(a.id));
    if (apis.length) {
      out.push("- public APIs:");
      for (const a of apis) out.push(`  - ${a.method} ${a.path} | purpose: ${oneLine(a.purpose)}`);
    }
    const fsRows = p.filesystem.files.filter((f) => files.has(f.path));
    out.push("- files:");
    if (fsRows.length === 0) out.push("  - none");
    for (const f of fsRows) out.push(`  - ${f.path} (${lower(f.status)}): ${oneLine(f.change)}`);
    out.push("");
  });
  const looseContracts = p.contracts.filter((c) => !realizedContracts.has(c.id));
  const looseFiles = p.filesystem.files.filter((f) => !planned.has(f.path));
  if (looseContracts.length) {
    out.push("# Contracts in no operation", "");
    for (const c of looseContracts) out.push(`- ${oneLine(c.promises)} | signature: ${oneLine(c.signature)}${c.type ? ` | type: ${lower(c.type)}` : ""} | file: ${c.file ?? "none"}`);
    out.push("");
  }
  if (looseFiles.length) {
    out.push("# Files in no operation", "");
    for (const f of looseFiles) out.push(`- ${f.path} (${lower(f.status)}): ${oneLine(f.change)}`);
    out.push("");
  }
  // Lab-authored, like the two sections above: the verifier reads the documents whole, and only this says which of
  // the prescriptions the design registered as applying no operation carries.
  const citing = p.operations.flatMap((op) => [...(op.knowledgeReferences ?? []), ...(op.source === "Knowledge" ? [String(op.sourceRef ?? "").trim()] : [])]).map(String);
  const looseKnowledge = (design.knowledgeReferences ?? []).filter((r) => !citing.includes(String(r.kid)));
  if (looseKnowledge.length) {
    out.push("# Knowledge references in no operation", "", "The design registered these prescriptions as applying to it, and no operation cites them.", "");
    for (const r of looseKnowledge) out.push(`- ${r.filePath ?? "(no file)"} lines ${r.range?.s}–${r.range?.e} (${lower(r.scope ?? "Production")})`);
    out.push("");
  }
  if (p.apis.length) {
    out.push("# Public APIs", "");
    for (const a of p.apis) out.push(`- ${a.method} ${a.path} | purpose: ${oneLine(a.purpose)} | auth: ${oneLine(a.auth)} | request: ${oneLine(a.request)}`);
    out.push("");
  }
  out.push("# Decisions", "");
  if (design.decisions.length === 0) out.push("- none");
  for (const d of design.decisions) {
    const chosen = d.options.find((o) => o.chosen);
    const realizedBy = p.operations.filter((op) => (op.realizes ?? []).includes(d.id)).map((op) => `"${oneLine(op.operation)}"`);
    out.push(`- ${oneLine(d.question)} → ${oneLine(chosen?.text)} | realized in: ${join(realizedBy)} | source: ${lower(d.source) || "none"} | highlight: ${isHighlighted(d)}`);
  }
  out.push("");
  return `${out.join("\n")}`;
}

// Lab-authored: what the served operation's kind asks of the implementor. The 3.0.3 steps say the answer carries
// "its kind rules" without stating them; these restate the rules the steps and the implementor role give each kind.
const KIND_RULES = {
  Production: "Write the production code these instructions describe, in the files they name. The tests belong to the Testing operations: write none here unless the instructions ask for them. You decide when to build; correct the failures the build reports before you close the operation.",
  Documentation: "Write the documentation these instructions describe, in the files they name. Change no production code and no test.",
  Testing: "Write and run the tests these instructions describe. When a test reveals a real defect in the production code, fix the production code and keep the test as its proof; never weaken, skip or mock away the defect inside the test.",
};

// One served operation with the whole context it needs, so the implementor works from it alone: its instructions,
// its kind rules, the overview, the obligations it implements, the decisions it realizes, the contracts and APIs it
// realizes, the filesystem entries of its files, the text of every knowledge reference and its file references.
export function servedOperation(design, op, { batch, authorisation, knowledge }) {
  const p = design.path;
  const files = new Set(op.files ?? []);
  const out = [`# Operation ${op.id} — ${oneLine(op.operation)}`];
  out.push(`- kind: ${op.kind}${op.testType ? ` | test type: ${op.testType}` : ""} | batch: ${batch} | authorisation: ${authorisation}${op.hasDestructiveSideEffects ? " | destructive side effects" : ""}`);
  out.push(`- dependsOn: ${join(op.dependsOn)} | files: ${join(op.files)} | implements: ${join(op.refObligations)} | realizes: ${join(op.realizes)}`);
  if (op.source) out.push(`- source: ${op.source}${op.sourceRef ? ` (${oneLine(op.sourceRef)})` : ""}`);
  out.push("", "## Instructions", op.instructions ?? "(none)");
  out.push("", "## Kind rules", KIND_RULES[op.kind] ?? `No rule is defined for the kind ${op.kind ?? "(none)"}: follow the instructions.`);
  if (op.hasDestructiveSideEffects) out.push("", "This operation has destructive side effects: it is served because the developer selected it.");
  const arms = failureArms(op);
  out.push("", "## Failure arms", ...(arms.length ? arms.map((arm) => `- ${arm}`) : ["- none"]));
  out.push("", "## Overview", `- current codebase: ${oneLine(design.overview.currentState) || "(not recorded)"}`, `- gaps: ${oneLine(design.overview.gaps) || "(not recorded)"}`);
  const obligations = design.obligations.filter((o) => (op.refObligations ?? []).includes(o.id));
  out.push("", "## Obligations", ...(obligations.length ? obligations.map(obligationLine) : ["- none"]));
  const decisions = design.decisions.filter((d) => (op.realizes ?? []).includes(d.id));
  out.push("", "## Decisions");
  if (!decisions.length) out.push("- none");
  for (const d of decisions) {
    const chosen = d.options.find((o) => o.chosen);
    out.push(`- ${d.id} | ${lower(d.source)} | topic: ${oneLine(d.topic)} | chosen: ${oneLine(chosen?.text)} | how: ${oneLine(d.how)}`);
  }
  const contracts = operationContracts(design, op);
  out.push("", "## Contracts", ...(contracts.length ? contracts.map((c) => contractLine(design, c)) : ["- none"]));
  const apis = p.apis.filter((a) => (op.refApis ?? []).includes(a.id));
  out.push("", "## Public APIs", ...(apis.length ? apis.map((a) => apiLine(design, a)) : ["- none"]));
  const fsRows = p.filesystem.files.filter((f) => files.has(f.path));
  out.push("", "## Filesystem", ...(fsRows.length ? fsRows.map(fileLine) : ["- none"]));
  out.push("", "## Knowledge references");
  if (!knowledge.length) out.push(op.referencesExemption?.knowledge ? `- none: ${oneLine(op.referencesExemption.knowledge)}` : "- none: this operation declares no knowledge reference");
  for (const k of knowledge) {
    out.push("", `### kid ${k.kid}${k.filePath ? ` — ${k.filePath}, lines ${k.range.s}–${k.range.e}` : ""} (${lower(k.scope ?? "Production")})`);
    out.push(k.text ?? `(not resolved: ${k.resolutionNote})`);
  }
  const references = design.fileReferences.filter((fr) => (op.fileReferences ?? []).includes(fr.id));
  out.push("", "## File references");
  if (!references.length) out.push(op.referencesExemption?.file ? `- none: ${oneLine(op.referencesExemption.file)}` : "- none: this operation declares no file reference");
  for (const fr of references) out.push(fileReferenceLine(fr));
  out.push("", "When it is implemented, call design-implementation-operation-close.");
  return `${out.join("\n")}\n`;
}
