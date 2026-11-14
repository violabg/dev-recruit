// Design operations (contracts/design-model.md): row writes with server-assigned immutable ids, the section writes
// (contracts, filesystem, operations), approval, operation status and implementation iterations.
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { reportedChecks } from "./checks.mjs";
import { designPaths, loadDesign, saveDesign, touch } from "./design-store.mjs";
import { designGrounding, knowledgeFile, resolveKnowledgeReference } from "./knowledge.mjs";
import { authorisationOf, batchOf, isDone, nextAutomatic, unmetDependencies } from "./plan.mjs";
import { servedOperation, snapshot, snapshotIndex, snapshotSelection, verificationView } from "./projections.mjs";
import { requestSchema as schema } from "./help.mjs";
import { validate } from "./schema.mjs";
import { RuntimeError, arg, findText, iso, jobFlags, linedJson, pathGet, pathSet, pathSteps, readJson, servePart, sha256, writeJson } from "./util.mjs";
import { loadJob } from "./workflow.mjs";

function check(ctx, defName, value, tool, path = "") {
  const root = schema(ctx);
  const errors = validate(defName ? root.$defs[defName] : root, value, root, path);
  if (errors.length) {
    throw new RuntimeError(`${tool} rejected`, {
      status: "Rejected",
      errors: errors.map((detail) => ({ rule: "invalid-request", element: tool, detail })),
      applied: "nothing was applied",
    });
  }
}

// Every design operation takes { sessionId, jobId, request }. The entry point (api.mjs) has already read the request
// fields sent beside them as the request, and refused the arguments the command does not take.
function requestOf(ctx, args, defName, tool) {
  const request = arg(args, "request") ?? {};
  check(ctx, defName, request, tool, "/request");
  return request;
}

// Resolves the design of a job. DOCUMENTATION jobs have none.
function jobDesign(ctx, args, tool, options) {
  const job = loadJob(ctx, args, tool);
  if (!job.designId) {
    throw new RuntimeError(`${tool} failed: job '${job.jobId}' runs ${job.workflowType}, which has no design artifact; no design operation is allowed in this workflow.`);
  }
  return { job, design: loadDesign(ctx, job.sessionId, job.designId, options) };
}

// --- row tools --------------------------------------------------------------------------------------

const ROW_TABLES = {
  "design-obligations": { def: "obligation", collection: "obligations", counter: "obligation", prefix: "O" },
  "design-file-references": { def: "fileReference", collection: "fileReferences", counter: "fileReference", prefix: "FR" },
  "design-decisions": { def: "decision", collection: "decisions", counter: "decision", prefix: "D" },
};

function applyOptions(decision, options) {
  decision.options ??= [];
  decision.optionCounter ??= decision.options.length;
  for (const option of options) {
    const existing = option.id ? decision.options.find((o) => o.id === option.id) : null;
    if (existing) Object.assign(existing, option);
    else {
      decision.optionCounter += 1;
      decision.options.push({ id: `${decision.id}.${decision.optionCounter}`, text: option.text, chosen: Boolean(option.chosen) });
    }
  }
  // Exactly one chosen option: the last option sent as chosen wins; the others become alternatives.
  const chosenSent = options.filter((o) => o.chosen).map((o) => o.id ?? decision.options.find((x) => x.text === o.text)?.id);
  if (chosenSent.length) {
    const winner = chosenSent[chosenSent.length - 1];
    for (const o of decision.options) o.chosen = o.id === winner;
  }
}

function mergeFileReference(row, incoming) {
  if (incoming.scope) row.scope = incoming.scope;
  if (incoming.definitionPath) row.definitionPath = incoming.definitionPath;
  row.files = [...new Set([...(row.files ?? []), ...(incoming.files ?? []), ...(incoming.details ?? []).map((d) => d.path)])];
  const details = new Map((row.details ?? []).map((d) => [d.path, d]));
  for (const detail of incoming.details ?? []) details.set(detail.path, { ...details.get(detail.path), ...detail });
  row.details = [...details.values()];
}

// Lab-authored: `outline` answers the ids an operation's refObligations need, one obligation per line with its claim
// on one line, so an agent does not read and script over every row to get them.
function obligationOutline(obligations, ids) {
  const selected = ids.length ? obligations.filter((o) => ids.includes(o.id)) : obligations;
  return selected.map((o) => `${o.id}: ${(o.behavior ?? "").replace(/\s*\n\s*/g, " ").trim()}`).join("\n");
}

export function rowTool(ctx, tool, args) {
  if (arg(args, "edit") !== undefined) return editTool(ctx, tool, args);
  const table = ROW_TABLES[tool];
  const { design } = jobDesign(ctx, args, tool);
  const outline = String(arg(args, "outline") ?? "false") === "true";
  const request = requestOf(ctx, args, "rowRequest", tool);
  if (outline && request.operation !== "Read") throw new RuntimeError(`${tool} rejected: outline applies to the operation Read only. Nothing was applied.`);
  const rows = request.rows ?? [];
  const ids = request.ids ?? [];
  const collection = design[table.collection];
  rows.forEach((row, index) => check(ctx, table.def, row, tool, `/request/rows/${index}`));

  switch (request.operation) {
    case "Read": {
      if (outline) return obligationOutline(collection, ids);
      const selected = ids.length ? collection.filter((r) => ids.includes(r.id)) : collection;
      return linedJson(selected);
    }
    case "Add": {
      const added = [];
      for (const row of rows) {
        if (row.id !== undefined) throw new RuntimeError(`${tool} rejected: an Add row carries no id; the runtime assigns ${table.prefix}# ids. Nothing was applied: remove id from the Add rows and send them again.`);
        if (tool === "design-file-references") {
          const existing = collection.find((r) => r.symbol === row.symbol);
          if (existing) {
            mergeFileReference(existing, row);
            added.push(existing.id);
            continue;
          }
        }
        design.counters[table.counter] += 1;
        const id = `${table.prefix}${design.counters[table.counter]}`;
        const { options, ...fields } = row;
        const record = { id, ...fields };
        if (tool === "design-obligations") record.origin ??= "Requirement";
        if (tool === "design-decisions") {
          record.highlight = Boolean(record.highlight);
          applyOptions(record, options ?? []);
        }
        if (tool === "design-file-references") {
          record.files = [];
          record.details = [];
          record.scope = "Production";
          mergeFileReference(record, row);
        }
        collection.push(record);
        added.push(id);
      }
      touch(ctx, design, "added", `${tool}: ${added.join(", ")}`);
      saveDesign(ctx, design);
      return JSON.stringify({ added });
    }
    case "Update": {
      const updated = [];
      for (const row of rows) {
        const record = collection.find((r) => r.id === row.id);
        if (!record) throw new RuntimeError(`${tool} rejected: ${row.id ?? "(no id)"} does not exist`);
        const { id, options, ...fields } = row;
        if (tool === "design-file-references") mergeFileReference(record, row);
        else Object.assign(record, fields);
        if (options) applyOptions(record, options);
        updated.push(id);
      }
      touch(ctx, design, "updated", `${tool}: ${updated.join(", ")}`);
      saveDesign(ctx, design);
      return JSON.stringify({ updated });
    }
    case "Delete": {
      if (!ids.length) throw new RuntimeError(`${tool} rejected: Delete needs the ids to remove`);
      const missing = ids.filter((id) => !collection.some((r) => r.id === id));
      if (missing.length) throw new RuntimeError(`${tool} rejected: ${missing.join(", ")} do not exist`);
      design[table.collection] = collection.filter((r) => !ids.includes(r.id));
      touch(ctx, design, "deleted", `${tool}: ${ids.join(", ")}`);
      saveDesign(ctx, design);
      return JSON.stringify({ deleted: ids });
    }
  }
}

// --- knowledge references -----------------------------------------------------------------------------

// A reference names one file of the current catalogue and a range inside it; its path is kept so the text still
// resolves after a rebuild renumbers the file ids. Answers the reason it cannot be placed, or null.
function placeReference(ctx, reference) {
  const file = knowledgeFile(ctx, reference.fId);
  if (!file) return `has an unresolvable file id: ${reference.fId} is not in the current knowledge index; call knowledge-catalog again`;
  const { s, e } = reference.range;
  if (!Number.isInteger(s) || !Number.isInteger(e) || s < 1 || e < s) return `has an unresolvable range: ${s}-${e} is not an inclusive line range`;
  if (e > file.lines) return `has an unresolvable range: The requested range ${s}-${e} is outside the knowledge file, which has ${file.lines} line(s).`;
  reference.filePath = file.path;
  return null;
}

// `references` carries the rows on Add and Update, the kids on Read and Delete (empty = all). A row that cannot be
// applied is reported in `errors` and the other rows still apply.
export function knowledgeReferences(ctx, args) {
  const tool = "design-knowledge-references";
  const { design } = jobDesign(ctx, args, tool);
  const request = requestOf(ctx, args, "knowledgeReferencesRequest", tool);
  const items = request.references ?? [];
  const { operation } = request;
  const result = { added: 0, updated: 0, deleted: 0, unlinkedOperations: [], errors: [] };
  const fail = (detail) => result.errors.push(`${operation}: ${detail}`);
  const rows = items.filter((item) => {
    if (operation === "Read" || operation === "Delete" ? Number.isInteger(item) : item !== null && typeof item === "object") return true;
    fail(`${JSON.stringify(item)} is not ${operation === "Read" || operation === "Delete" ? "a kid" : "a reference row"}`);
    return false;
  });
  const references = design.knowledgeReferences;
  const changed = [];
  switch (operation) {
    case "Read": {
      const missing = rows.filter((kid) => !references.some((r) => r.kid === kid));
      for (const kid of missing) fail(`kid ${kid} does not exist`);
      const selected = rows.length ? references.filter((r) => rows.includes(r.kid)) : references;
      return linedJson({ references: selected.map((r) => ({ ...r, ...resolveKnowledgeReference(ctx, r) })), errors: result.errors });
    }
    case "Add":
      for (const row of rows) {
        if (!Number.isInteger(row.kid) || row.kid < 1) fail(`kid ${row.kid ?? "(none)"} is not a positive integer; assign a distinct one`);
        else if (references.some((r) => r.kid === row.kid)) fail(`kid ${row.kid} already exists; use Update to change it, or assign a new kid to a distinct range`);
        else if (row.fId === undefined || !row.range) fail(`kid ${row.kid} needs its fId and its range { s, e }`);
        else {
          const reference = { kid: row.kid, fId: row.fId, range: { s: row.range.s, e: row.range.e }, filePath: null, scope: row.scope ?? "Production" };
          const problem = placeReference(ctx, reference);
          if (problem) fail(`kid ${row.kid} ${problem}`);
          else {
            references.push(reference);
            changed.push(row.kid);
            result.added++;
          }
        }
      }
      break;
    case "Update":
      for (const row of rows) {
        const current = references.find((r) => r.kid === row.kid);
        if (!current) {
          fail(`kid ${row.kid ?? "(none)"} does not exist`);
          continue;
        }
        // An existing reference keeps every field the update does not send, its stored scope included.
        const next = { ...current, fId: row.fId ?? current.fId, range: row.range ?? current.range, scope: row.scope ?? current.scope };
        const problem = row.fId !== undefined || row.range ? placeReference(ctx, next) : null;
        if (problem) fail(`kid ${row.kid} ${problem}`);
        else {
          Object.assign(current, next);
          changed.push(row.kid);
          result.updated++;
        }
      }
      break;
    case "Delete": {
      for (const kid of rows) if (!references.some((r) => r.kid === kid)) fail(`kid ${kid} does not exist`);
      const kids = rows.length ? rows.filter((kid) => references.some((r) => r.kid === kid)) : references.map((r) => r.kid);
      // An operation that declared a deleted kid loses it and is reported, so its knowledge can be registered again.
      for (const op of design.path.operations) {
        const kept = (op.knowledgeReferences ?? []).filter((kid) => !kids.includes(kid));
        if (kept.length !== (op.knowledgeReferences ?? []).length) {
          op.knowledgeReferences = kept;
          result.unlinkedOperations.push(op.id);
        }
      }
      design.knowledgeReferences = references.filter((r) => !kids.includes(r.kid));
      changed.push(...kids);
      result.deleted = kids.length;
      break;
    }
  }
  if (changed.length) {
    touch(ctx, design, { Add: "added", Update: "updated", Delete: "deleted" }[operation], `${tool}: ${changed.join(", ")}`);
    saveDesign(ctx, design);
  }
  return JSON.stringify(result);
}

// --- overview ---------------------------------------------------------------------------------------

export function overview(ctx, args) {
  const tool = "design-overview";
  if (arg(args, "edit") !== undefined) return editTool(ctx, tool, args);
  const { design } = jobDesign(ctx, args, tool);
  const request = requestOf(ctx, args, "overview", tool);
  if (request.operation === "Read") return linedJson(design.overview);
  if (request.currentState !== undefined) design.overview.currentState = request.currentState;
  if (request.gaps !== undefined) design.overview.gaps = request.gaps;
  touch(ctx, design, "updated", "design-overview");
  saveDesign(ctx, design);
  return JSON.stringify({ status: design.status, currentState: Boolean(design.overview.currentState), gaps: Boolean(design.overview.gaps) });
}

// --- section writes: contracts, filesystem, operations -----------------------------------------------------

const TABLES = {
  contracts: { prefix: "CT", counter: "contract", owner: "design-contracts", get: (d) => d.path.contracts },
  apis: { prefix: "API", counter: "api", owner: "design-contracts", get: (d) => d.path.apis },
  files: { prefix: "FS", counter: "pathFile", owner: "design-file-system", get: (d) => d.path.filesystem.files },
  operations: { prefix: "IM", counter: "operation", owner: "design-operations", get: (d) => d.path.operations },
};

const SECTIONS = {
  "design-contracts": { def: "contractsRequest", keys: ["header", "add", "patch", "delete"] },
  "design-file-system": { def: "fileSystemRequest", keys: ["header", "add", "patch", "delete"] },
  "design-operations": { def: "operationsRequest", keys: ["header", "add", "patch", "delete", "order"] },
};

const ownTables = (tool) => Object.keys(TABLES).filter((table) => TABLES[table].owner === tool);

const cardinalOf = (table, id) => Number(id.slice(TABLES[table].prefix.length));

// Converts the cardinal references of an operation to the persisted prefixed form.
function persistRow(table, row) {
  const { id, ...record } = row;
  if (table === "operations") {
    const prefixed = (prefix) => (n) => `${prefix}${n}`;
    if (record.dependsOn) record.dependsOn = record.dependsOn.map(prefixed("IM"));
    if (record.refObligations) record.refObligations = record.refObligations.map(prefixed("O"));
    if (record.refContracts) record.refContracts = record.refContracts.map(prefixed("CT"));
    if (record.refApis) record.refApis = record.refApis.map(prefixed("API"));
    if (record.fileReferences) record.fileReferences = record.fileReferences.map((ref) => (/^\d+$/.test(String(ref)) ? `FR${ref}` : String(ref)));
  }
  return record;
}

// Problems a valid operation row can still have: references to rows of other sections that do not exist yet.
function operationRowProblems(design, row) {
  const problems = [];
  const unknownKids = (row.knowledgeReferences ?? []).filter((kid) => !design.knowledgeReferences.some((r) => r.kid === kid));
  if (unknownKids.length) problems.push(`knowledgeReferences names kid ${unknownKids.join(", ")}, which no knowledge reference registers; register it with design-knowledge-references first`);
  const unknownDecisions = (row.realizes ?? []).filter((ref) => !design.decisions.some((d) => d.id === ref));
  if (unknownDecisions.length) problems.push(`realizes names ${unknownDecisions.join(", ")}, which no decision declares; write the decision with design-decisions first`);
  return problems;
}

// `instructionsPatch` (captured on 3.0.4, design_operations run 5): an ordered list of { oldText, newText } exact edits
// of the stored instructions of a patched operation. Lab-authored: it is refused on an added row and beside
// `instructions`, and each oldText must occur exactly once in the text the earlier edits left.
function patchedInstructions(stored, row, id) {
  if (!stored) return { problem: `instructionsPatch edits the stored instructions of an existing operation; ${id} is added by this call, so send instructions` };
  if (row.instructions !== undefined) return { problem: "send instructions or instructionsPatch, not both" };
  let text = stored.instructions ?? "";
  for (const [index, edit] of row.instructionsPatch.entries()) {
    const count = edit.oldText === "" ? 0 : text.split(edit.oldText).length - 1;
    if (count === 0) return { problem: `instructionsPatch[${index}]: oldText was not found in the instructions of ${id}` };
    if (count > 1) return { problem: `instructionsPatch[${index}]: oldText occurs ${count} times in the instructions of ${id}; quote more of the text around it` };
    text = text.replace(edit.oldText, () => edit.newText);
  }
  const { instructionsPatch, ...rest } = row;
  return { row: { ...rest, instructions: text } };
}

// One section write. The call is all or nothing: a rejected row, a table of another section or a wrong `order`
// rejects the whole call, and nothing is applied. The tool runs no mechanical checks: design-checks does.
export function sectionWrite(ctx, tool, args) {
  const section = SECTIONS[tool];
  if (arg(args, "edit") !== undefined) return editTool(ctx, tool, args);
  const request = arg(args, "request");
  if (!request || typeof request !== "object" || Array.isArray(request) || Object.keys(request).length === 0) {
    throw new RuntimeError(`${tool} rejected: an empty request is never acceptable; send sessionId, jobId and request.`);
  }
  const { design } = jobDesign(ctx, args, tool);
  if (request.operation === "Read") return sectionRead(design, tool, request);
  const root = schema(ctx);
  const rejected = [];
  const reject = (path, message) => rejected.push({ path, message });
  const unmapped = (table) => `the JSON property '${table}' could not be mapped; the allowed properties are ${ownTables(tool).join(", ")}`;

  for (const key of Object.keys(request)) {
    if (!section.keys.includes(key)) reject(key, `the JSON property '${key}' could not be mapped; the allowed properties are ${section.keys.join(", ")}`);
  }
  if (request.header !== undefined) for (const message of validate(root.$defs.header, request.header, root, "header")) reject("header", message);

  // delete: { table: [cardinal ids] }
  const deletions = [];
  for (const [table, ids] of Object.entries(request.delete ?? {})) {
    const spec = TABLES[table];
    if (!spec || spec.owner !== tool) {
      reject(`delete.${table}`, spec ? `rejected here — ${table} belong to ${spec.owner}` : unmapped(table));
      continue;
    }
    for (const n of Array.isArray(ids) ? ids : []) {
      const id = `${spec.prefix}${n}`;
      if (!spec.get(design).some((r) => r.id === id)) reject(`delete.${table}`, `${id} does not exist`);
      else deletions.push({ table, id });
    }
  }

  // add and patch: { table: [rows] }
  const writes = [];
  for (const mode of ["add", "patch"]) {
    const block = request[mode];
    if (block === undefined) continue;
    if (!block || typeof block !== "object" || Array.isArray(block)) {
      reject(mode, "must be an object of tables");
      continue;
    }
    for (const [table, rows] of Object.entries(block)) {
      const spec = TABLES[table];
      if (!spec || spec.owner !== tool) {
        reject(`${mode}.${table}`, spec ? `rejected here — ${table} belong to ${spec.owner}` : unmapped(table));
        continue;
      }
      (Array.isArray(rows) ? rows : []).forEach((row, index) => {
        const path = `${mode}.${table}[${index}]`;
        const errors = validate(root.$defs[table === "apis" ? "api" : table.slice(0, -1)], row, root, path);
        if (errors.length) return reject(path, errors.join("; "));
        if (table === "operations") for (const problem of operationRowProblems(design, row)) reject(path, problem);
        const id = `${spec.prefix}${row.id}`;
        const exists = spec.get(design).some((r) => r.id === id);
        if (row.instructionsPatch !== undefined) {
          const patched = patchedInstructions(mode === "patch" ? spec.get(design).find((r) => r.id === id) : null, row, id);
          if (patched.problem) reject(path, patched.problem);
          else row = patched.row;
        }
        const repeated = writes.some((w) => w.table === table && w.mode === mode && w.id === id);
        if (mode === "add" && (exists || repeated)) reject(path, `${id} already exists`);
        if (mode === "patch" && !exists && !writes.some((w) => w.table === table && w.mode === "add" && w.id === id)) reject(path, `${id} does not exist; add it first`);
        writes.push({ mode, table, id, row });
      });
    }
  }

  // order: a permutation of the operations that exist after the call.
  if (request.order !== undefined) {
    const after = new Set(design.path.operations.map((op) => op.id));
    for (const { id } of deletions) after.delete(id);
    for (const w of writes) if (w.mode === "add") after.add(w.id);
    const order = Array.isArray(request.order) ? request.order.map((n) => `IM${n}`) : [];
    const permutation = order.length === after.size && new Set(order).size === order.length && order.every((id) => after.has(id));
    if (!permutation) reject("order", `order must name every operation once (${[...after].join(", ") || "none"}); it named ${order.join(", ") || "none"}`);
  }

  const applied = { added: [], patched: [], deleted: [] };
  if (rejected.length) return { output: linedJson({ status: design.status, applied, rejected }), exitCode: 1 };

  if (request.header) for (const [key, value] of Object.entries(request.header)) if (value) design.path[key] = value;
  for (const { table, id } of deletions) {
    const rows = TABLES[table].get(design);
    rows.splice(rows.findIndex((r) => r.id === id), 1);
    applied.deleted.push(id);
  }
  // Added rows keep their call order and go before the first stored row with a higher id, so parallel calls with
  // disjoint ranges build the same plan whichever arrives first. Stored rows are never reordered except by `order`.
  for (const table of Object.keys(TABLES)) {
    const added = writes.filter((w) => w.mode === "add" && w.table === table);
    if (!added.length) continue;
    const spec = TABLES[table];
    const records = added.map((w) => ({ id: w.id, ...persistRow(table, w.row), ...(table === "operations" ? { implementationStatus: null } : {}) }));
    const rows = spec.get(design);
    const lowest = Math.min(...records.map((r) => cardinalOf(table, r.id)));
    const at = rows.findIndex((r) => cardinalOf(table, r.id) > lowest);
    rows.splice(at === -1 ? rows.length : at, 0, ...records);
    for (const w of added) {
      design.counters[spec.counter] = Math.max(design.counters[spec.counter], w.row.id);
      applied.added.push(w.id);
    }
  }
  for (const w of writes.filter((x) => x.mode === "patch")) {
    Object.assign(TABLES[w.table].get(design).find((r) => r.id === w.id), persistRow(w.table, w.row));
    applied.patched.push(w.id);
  }
  if (request.order !== undefined) {
    const byId = new Map(design.path.operations.map((op) => [op.id, op]));
    design.path.operations = request.order.map((n) => byId.get(`IM${n}`));
  }

  touch(ctx, design, "updated", `${tool}: +${applied.added.join(",") || "-"} ~${applied.patched.join(",") || "-"} x${applied.deleted.join(",") || "-"}${request.order ? " (reordered)" : ""}`);
  saveDesign(ctx, design);
  return linedJson({ status: design.status, applied, rejected });
}

// --- reading a section through its own write ----------------------------------------------------------------

const SECTION_NAMES = { "design-contracts": ["Contracts", "Public APIs"], "design-file-system": ["Filesystem"], "design-operations": ["Operations"] };

// Lab-authored: a section write has no Read upstream, and agents ask for one after the row writes, which have it. It
// answers the rows of the section as the snapshot shows them. A cardinal id names the row of each of its tables.
function sectionRead(design, tool, request) {
  const extra = Object.keys(request).filter((key) => key !== "operation" && key !== "ids");
  if (extra.length) throw new RuntimeError(`${tool} rejected: a Read takes ids only; '${extra.join("', '")}' is not read. Nothing was applied.`);
  const tables = ownTables(tool);
  const sent = Array.isArray(request.ids) ? request.ids : request.ids === undefined ? [] : [request.ids];
  const ids = sent.flatMap((id) => {
    if (!/^\d+$/.test(String(id))) return [String(id)];
    const named = tables.map((table) => `${TABLES[table].prefix}${id}`);
    const existing = named.filter((name, index) => TABLES[tables[index]].get(design).some((row) => row.id === name));
    return existing.length ? existing : named.slice(0, 1);
  });
  return snapshotSelection(snapshot(design), { section: SECTION_NAMES[tool].join(","), ids: ids.length ? ids : undefined });
}

// --- edits in place -----------------------------------------------------------------------------------------

const EDIT_TABLES = {
  O: { owner: "design-obligations", def: "obligation", rows: (d) => d.obligations },
  FR: { owner: "design-file-references", def: "fileReference", rows: (d) => d.fileReferences },
  D: { owner: "design-decisions", def: "decision", rows: (d) => d.decisions },
  CT: { owner: "design-contracts", def: "contract", rows: (d) => d.path.contracts },
  API: { owner: "design-contracts", def: "api", rows: (d) => d.path.apis },
  FS: { owner: "design-file-system", def: "file", rows: (d) => d.path.filesystem.files },
  IM: { owner: "design-operations", def: "operation", rows: (d) => d.path.operations },
};

// The schema of the value at a path inside a row, or null when the row has no such field.
function fieldSchema(root, defName, steps) {
  const resolve = (node) => (node?.$ref ? root.$defs[node.$ref.split("/").pop()] : node);
  let node = resolve(root.$defs[defName]);
  for (const step of steps) {
    node = resolve(typeof step === "number" ? node?.items : node?.properties?.[step]);
    if (!node) return null;
  }
  return node;
}

// Lab-authored (contracts/design-model.md, edits): changes text inside one field of a stored row, so a correction to
// long instructions sends the sentence and not the field. `edit` is one edit or a list of { id, field, from, to, all }:
// `from` must occur once in the field, or `all: true` replaces every occurrence; any white space in `from` matches any
// white space. The call is all or nothing, like every design write, and carries no `request`.
export function editTool(ctx, tool, args) {
  const request = arg(args, "request");
  if (request && typeof request === "object" && Object.keys(request).length) {
    throw new RuntimeError(`${tool} rejected: a call carries either request or edit, not both. Nothing was applied.`);
  }
  const { design } = jobDesign(ctx, args, tool);
  const root = schema(ctx);
  const rejected = [];
  const edited = [];
  const owned = Object.keys(EDIT_TABLES).filter((prefix) => EDIT_TABLES[prefix].owner === tool);
  [arg(args, "edit")].flat().forEach((edit, index) => {
    const reject = (message) => rejected.push({ path: `edit[${index}]`, message });
    if (!edit || typeof edit !== "object" || typeof edit.field !== "string" || typeof edit.from !== "string" || typeof edit.to !== "string") {
      return reject("an edit is { id, field, from, to }: field names the text field, from the text to find and to the text that replaces it");
    }
    let target = design.overview;
    let defName = "overview";
    let label = "overview";
    if (tool !== "design-overview") {
      const given = String(edit.id ?? "");
      const id = /^\d+$/.test(given) && owned.length === 1 ? `${owned[0]}${given}` : given;
      const table = EDIT_TABLES[/^([A-Z]+)\d+$/.exec(id)?.[1]];
      if (!table) return reject(`id '${given}' names no row; give the id as the design shows it (${owned.map((prefix) => `${prefix}1`).join(", ")})`);
      if (table.owner !== tool) return reject(`${id} belongs to ${table.owner}; edit it there`);
      target = table.rows(design).find((row) => row.id === id);
      if (!target) return reject(`${id} does not exist`);
      defName = table.def;
      label = id;
    }
    const steps = pathSteps(edit.field);
    const declared = fieldSchema(root, defName, steps);
    const value = pathGet(target, steps);
    const isText = declared && [declared.type].flat().includes("string") && !declared.enum && steps[0] !== "id";
    if (!isText || typeof value !== "string") return reject(`${label} has no text field '${edit.field}' to edit; a list, an id or a fixed value is changed with a patch or an Update`);
    const found = findText(value, edit.from);
    if (found.length === 0) return reject(`the text was not found in ${label}.${edit.field} (${value.length} characters). Find it with design-snapshot and grep before editing`);
    if (found.length > 1 && edit.all !== true) return reject(`the text occurs ${found.length} times in ${label}.${edit.field}; quote more of the text around it, or set all: true to replace every occurrence`);
    let next = value;
    for (const [from, to] of [...found].reverse()) next = next.slice(0, from) + edit.to + next.slice(to);
    pathSet(target, steps, next);
    edited.push(`${label}.${edit.field}`);
  });
  if (rejected.length) return { output: linedJson({ status: design.status, edited: [], rejected }), exitCode: 1 };
  touch(ctx, design, "updated", `${tool}: edited ${[...new Set(edited)].join(", ")}`);
  saveDesign(ctx, design);
  return JSON.stringify({ edited });
}

// --- reads --------------------------------------------------------------------------------------------

export function checksTool(ctx, args) {
  const accept = String(arg(args, "acceptExternalEdit") ?? "false") === "true";
  const { design } = jobDesign(ctx, args, "design-checks", { acceptExternalEdit: accept });
  if (accept) {
    const errors = validateDesignShape(design);
    if (errors.length) throw new RuntimeError("design-checks: the edited design.json is not a valid design", { status: "Rejected", errors });
    touch(ctx, design, "resealed", "external edit accepted after review");
    saveDesign(ctx, design);
  }
  return linedJson(reportedChecks(design));
}

function validateDesignShape(design) {
  const errors = [];
  for (const key of ["obligations", "fileReferences", "decisions", "iterations"]) {
    if (!Array.isArray(design[key])) errors.push({ rule: "invalid-design", element: key, detail: `${key} must be an array` });
  }
  if (!design.path || !Array.isArray(design.path.operations)) errors.push({ rule: "invalid-design", element: "path", detail: "path.operations must be an array" });
  return errors;
}

// The parts of a projection belong to one revision of the design: a later part of an older revision is refused,
// so text from two revisions is never read as one answer.
function revisionGuard(design, args, tool, caller) {
  const revision = arg(args, "revision");
  if (revision !== undefined && revision !== design.updatedAt) {
    throw new RuntimeError(`${tool} failed: the design changed after the earlier parts were served (revision '${revision}', now '${design.updatedAt}'). Start again from part 1.`);
  }
  return { tool, next: (k) => `call ${tool} again with part ${k} and revision ${design.updatedAt} (CLI: ${jobFlags(args, caller)} --part ${k} --revision ${design.updatedAt}).` };
}

export function snapshotTool(ctx, args, caller) {
  const job = loadJob(ctx, args, "design-snapshot");
  if (!job.designId) {
    return `# Design snapshot\nThis job runs ${job.workflowType}, which has no design artifact. There is nothing to project.\n`;
  }
  // Parts start at a section heading or at an item, so a row is never split.
  const design = loadDesign(ctx, job.sessionId, job.designId);
  const guard = revisionGuard(design, args, "design-snapshot", caller);
  const selection = { section: arg(args, "section"), ids: arg(args, "ids"), fields: arg(args, "fields"), grep: arg(args, "grep"), brief: String(arg(args, "brief") ?? "false") === "true" };
  const chosen = ["section", "ids", "fields", "grep"].filter((name) => selection[name] !== undefined);
  const selecting = selection.brief || chosen.length > 0;
  // The call for a later part repeats the selection, so it can be run exactly as printed. Ids keep their bare form.
  const flag = (name) => (name === "ids" ? [selection.ids].flat().join(",") : `"${[selection[name]].flat().join(",").replace(/["\\$`]/g, "\\$&")}"`);
  const same = chosen.map((name) => ` --${name} ${flag(name)}`).join("") + (selection.brief ? " --brief true" : "");
  const text = selecting ? snapshotSelection(snapshot(design), selection) : snapshot(design);
  const answer = servePart(text, args, {
    ...guard,
    limit: ctx.partLimit,
    starts: (line) => /^## /.test(line) || /^- /.test(line),
    ...(selecting ? { next: (k) => `call design-snapshot again with the same selection, part ${k} and revision ${design.updatedAt} (CLI: ${jobFlags(args, caller)}${same} --part ${k} --revision ${design.updatedAt}).` } : {}),
  });
  // A design too long for one answer opens with its index, so a resumed agent does not re-read what it needs no part of.
  return !selecting && arg(args, "part") === undefined && answer !== text ? snapshotIndex(text, jobFlags(args, caller)) : answer;
}

export function verificationViewTool(ctx, args, caller) {
  const { design } = jobDesign(ctx, args, "design-verification-view");
  // Parts start at an obligation, an operation or a section heading, so none of them is ever split.
  return servePart(verificationView(design, designGrounding(ctx, design)), args, {
    ...revisionGuard(design, args, "design-verification-view", caller),
    limit: ctx.partLimit,
    starts: (line) => /^#{1,2} /.test(line),
  });
}

export function documentTool(ctx, args) {
  const { design } = jobDesign(ctx, args, "design-document");
  const paths = saveDesign(ctx, design);
  const status = design.status === "Approved" && design.modifiedAfterApproval ? "Approved, modified after approval" : design.status;
  return `Design document (${status}): ${paths.html}`;
}

// --- approval -----------------------------------------------------------------------------------------

export function approve(ctx, args) {
  const tool = "design-approve";
  const { design } = jobDesign(ctx, args, tool);
  const request = requestOf(ctx, args, "approve", tool);
  if (!/^[A-Za-z0-9_]{1,100}$/.test(request.planName)) {
    throw new RuntimeError(`${tool} rejected: planName must match ^[A-Za-z0-9_]{1,100}$. Provided value: '${request.planName}'.`);
  }
  const findings = reportedChecks(design);
  if (findings.errors.length) {
    return {
      output: linedJson({ status: "Rejected", reason: "the design still has integrity errors; fix them and approve again", errors: findings.errors }),
      exitCode: 1,
    };
  }
  const at = iso(ctx.now());
  design.status = "Approved";
  design.approvedAt = at;
  design.planName = request.planName;
  design.planDescription = request.description ?? null;
  design.modifiedAfterApproval = false;
  touch(ctx, design, "approved", `approved as ${request.planName}`);
  saveDesign(ctx, design);
  return `Design approved (${at.slice(0, 10)} ${at.slice(11, 19)}Z).`;
}

export function operationStatus(ctx, args) {
  const tool = "design-operation-status";
  const { design } = jobDesign(ctx, args, tool);
  const request = requestOf(ctx, args, "operationStatus", tool);
  const unknown = request.ids.filter((id) => !design.path.operations.some((o) => o.id === id));
  if (unknown.length) throw new RuntimeError(`${tool} rejected: unknown operation ids ${unknown.join(", ")}; no flag changed`);
  for (const operation of design.path.operations) if (request.ids.includes(operation.id)) operation.implementationStatus = request.status;
  touch(ctx, design, "status", `${request.ids.join(", ")} -> ${request.status}`);
  saveDesign(ctx, design);
  return JSON.stringify(request.ids);
}

// --- implementation loop ------------------------------------------------------------------------------

// The operation text is computed without the re-serve note, so a part means the same text on every call.
function serveText(ctx, design, operation, note, args, caller) {
  const tool = "design-implementation-operation";
  const knowledge = (operation.knowledgeReferences ?? []).map((kid) => {
    const reference = design.knowledgeReferences.find((r) => r.kid === kid);
    return reference ? { ...reference, ...resolveKnowledgeReference(ctx, reference) } : { kid, text: null, resolutionNote: `kid ${kid} is not registered` };
  });
  const answer = servePart(servedOperation(design, operation, { batch: batchOf(operation), authorisation: authorisationOf(operation), knowledge }), args, {
    tool,
    limit: ctx.partLimit,
    starts: (line) => /^#{1,3} /.test(line),
    next: (k) => `call ${tool} again with part ${k} (CLI: ${jobFlags(args, caller)} --part ${k}); it serves the rest of ${operation.id} and does not advance the plan.`,
    onServed: (n, parts) => recordOperationPart(ctx, design, operation, n, parts.length),
  });
  return note ? answer.replace("\n", `\n${note}\n`) : answer;
}

// A long operation may only be closed once all of its parts were served.
function recordOperationPart(ctx, design, operation, n, total) {
  if (total === 1) return;
  const known = design.servedParts?.operation === operation.id ? design.servedParts.seen : [];
  design.servedParts = { operation: operation.id, total, seen: [...new Set([...known, n])].sort((a, b) => a - b) };
  saveDesign(ctx, design);
}

export function implementationOperation(ctx, args, caller) {
  const tool = "design-implementation-operation";
  const { design } = jobDesign(ctx, args, tool);
  const operations = design.path.operations;
  const requested = arg(args, "operationId") ?? arg(args, "id");
  const served = design.servedOperation ? operations.find((op) => op.id === design.servedOperation) : null;
  if (served) {
    if (requested && requested !== served.id) {
      throw new RuntimeError(`${tool} rejected: ${served.id} is served and not closed yet; close it with design-implementation-operation-close before asking for ${requested}.`);
    }
    const note = arg(args, "part") === undefined ? `${served.id} was already served and is not closed: implement it, then call design-implementation-operation-close.` : null;
    return serveText(ctx, design, served, note, args, caller);
  }
  let operation;
  if (requested) {
    operation = operations.find((op) => op.id === requested);
    if (!operation) throw new RuntimeError(`${tool} rejected: operation ${requested} does not exist.`);
    // The loop asks again with the same id after closing it: the authorised work is done, never reopened.
    if (isDone(operation)) {
      return `batch-complete: ${requested} is already ${operation.implementationStatus}, so the operation this delegation authorised is done; a closed operation is never reopened (a correction runs outside the loop). Return the control.`;
    }
    const unmet = unmetDependencies(operations, operation);
    if (unmet.length) throw new RuntimeError(`${tool} rejected: ${requested} depends on ${unmet.join(", ")}, which are not implemented yet; a declared dependency prevails over the developer's selection.`);
  } else {
    operation = nextAutomatic(operations);
    if (!operation) {
      return operations.some((op) => !isDone(op))
        ? "batch-complete: the production and documentation batches are exhausted. The operations that remain (Testing, destructive, or waiting on one of them) require the developer's explicit selection; return the control."
        : "complete: every operation of the plan is implemented. Return the control.";
    }
  }
  operation.implementationStatus = "InProgress";
  design.servedOperation = operation.id;
  touch(ctx, design, "served", `${operation.id} served${requested ? " on the developer's authorisation" : ""}`);
  saveDesign(ctx, design);
  return serveText(ctx, design, operation, null, args, caller);
}

export function implementationOperationClose(ctx, args) {
  const tool = "design-implementation-operation-close";
  const { design } = jobDesign(ctx, args, tool);
  const operation = design.servedOperation ? design.path.operations.find((op) => op.id === design.servedOperation) : null;
  if (!operation) throw new RuntimeError(`${tool} rejected: no operation is served; call design-implementation-operation first.`);
  const parts = design.servedParts?.operation === operation.id ? design.servedParts : null;
  const unread = parts ? Array.from({ length: parts.total }, (_, i) => i + 1).filter((n) => !parts.seen.includes(n)) : [];
  if (unread.length) throw new RuntimeError(`${tool} rejected: ${operation.id} has parts that were never served (${unread.join(", ")}). Read them with design-implementation-operation before closing it.`);
  operation.implementationStatus = "Implemented";
  design.servedOperation = null;
  delete design.servedParts;
  touch(ctx, design, "operation-closed", `${operation.id} -> Implemented`);
  saveDesign(ctx, design);
  return `${operation.id} closed as Implemented. Call design-implementation-operation for the next operation.`;
}

// --- iterations ---------------------------------------------------------------------------------------

const WALK_EXCLUDES = new Set([".git", "node_modules", "bin", "obj", "dist", ".DS_Store"]);

function workspaceFiles(workspace, excludeRoot) {
  let files;
  try {
    files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { cwd: workspace, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 })
      .split("\0")
      .filter(Boolean);
  } catch {
    files = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (WALK_EXCLUDES.has(entry.name)) continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else files.push(relative(workspace, path).split("\\").join("/"));
      }
    };
    walk(workspace);
  }
  const excluded = excludeRoot ? relative(workspace, excludeRoot).split("\\").join("/") : null;
  const result = {};
  for (const file of files) {
    if (excluded && !excluded.startsWith("..") && excluded !== "" && (file === excluded || file.startsWith(`${excluded}/`))) continue;
    const hash = entryHash(join(workspace, file));
    if (hash) result[file] = hash;
  }
  return result;
}

// A symlink is recorded by its target path, as git stores it, and never followed: a link to a directory (the
// skills installer links .claude/skills/<name> to .agents/skills/<name>) is not a file to read. Anything that
// is neither a file nor a link (a submodule, a deleted path) is left out.
function entryHash(path) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat?.isSymbolicLink()) return sha256(`symlink:${readlinkSync(path)}`);
  return stat?.isFile() ? sha256(readFileSync(path)) : null;
}

export function iterationOpen(ctx, args) {
  const tool = "design-iteration-open";
  const { design } = jobDesign(ctx, args, tool);
  const request = requestOf(ctx, args, "iterationOpen", tool);
  const open = design.iterations.find((it) => it.status === "Open");
  if (open) throw new RuntimeError(`${tool} rejected: iteration ${open.id} is still open; close it with design-iteration-close first.`);
  const requested = arg(request, "workspacePath");
  const workspace = requested ? (isAbsolute(requested) ? requested : resolve(ctx.workspaceRoot, requested)) : ctx.workspaceRoot;
  if (!existsSync(workspace)) throw new RuntimeError(`${tool} rejected: workspacePath does not exist: ${workspace}`);
  design.counters.iteration += 1;
  const id = `IT${design.counters.iteration}`;
  const createdAt = iso(ctx.now());
  writeJson(join(designPaths(ctx, design.sessionId, design.designId).iterations, `${id}.snapshot.json`), workspaceFiles(workspace, ctx.runtimeRoot));
  design.iterations.push({ id, request: request.request, workspacePath: workspace, createdAt, closedAt: null, status: "Open", files: [], verifications: [], blocks: [], notes: "" });
  touch(ctx, design, "iteration-open", `${id}: ${request.request}`);
  saveDesign(ctx, design);
  return JSON.stringify({ iterationId: id, createdAt });
}

export function iterationClose(ctx, args) {
  const tool = "design-iteration-close";
  const { design } = jobDesign(ctx, args, tool);
  const request = requestOf(ctx, args, "iterationClose", tool);
  const iteration = design.iterations.find((it) => it.id === request.iterationId);
  if (!iteration) throw new RuntimeError(`${tool} rejected: iteration ${request.iterationId} does not exist`);
  if (iteration.status === "Closed") throw new RuntimeError(`${tool} rejected: iteration ${iteration.id} is already closed; nothing was modified`);
  const before = readJson(join(designPaths(ctx, design.sessionId, design.designId).iterations, `${iteration.id}.snapshot.json`), {});
  const after = workspaceFiles(iteration.workspacePath, ctx.runtimeRoot);
  const files = [];
  for (const [path, hash] of Object.entries(after)) {
    if (!(path in before)) files.push({ path, change: "Added", detail: null });
    else if (before[path] !== hash) files.push({ path, change: "Modified", detail: null });
  }
  for (const path of Object.keys(before)) if (!(path in after)) files.push({ path, change: "Deleted", detail: null });
  files.sort((a, b) => a.path.localeCompare(b.path));
  const closedAt = iso(ctx.now());
  Object.assign(iteration, { closedAt, status: "Closed", files, verifications: request.verifications ?? [], blocks: request.blocks ?? [], notes: request.notes ?? "" });
  touch(ctx, design, "iteration-close", `${iteration.id}: ${files.length} file(s)`);
  saveDesign(ctx, design);
  return JSON.stringify({ iterationId: iteration.id, closedAt });
}
