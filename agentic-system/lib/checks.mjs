// Mechanical design checks (contracts/design-checks.md). Facts about the artifact only: they never judge
// whether the design realizes R — that is the orchestrator's adversarial review.

// A decision stored before `highlight` replaced `blocking` reads its old flag as the highlight.
export const isHighlighted = (decision) => Boolean(decision.highlight || decision.blocking);

// At most one Testing operation per test type; testType belongs to Testing operations and to no other kind.
function testingFindings(operations) {
  const findings = [];
  const seen = new Map();
  for (const operation of operations) {
    if (operation.kind === "Testing") {
      if (!operation.testType) findings.push({ rule: "testing-operation-without-type", element: operation.id, detail: `${operation.id} is a Testing operation and declares no testType` });
      else if (seen.has(operation.testType)) findings.push({ rule: "testing-operations", element: operation.id, detail: `${seen.get(operation.testType)} and ${operation.id} are both ${operation.testType} Testing operations; the plan declares at most one per test type` });
      else seen.set(operation.testType, operation.id);
    } else if (operation.testType) {
      findings.push({ rule: "operation-test-type-misplaced", element: operation.id, detail: `${operation.id} is a ${operation.kind} operation and declares a testType; only a Testing operation does` });
    }
  }
  return findings;
}

// Lab-authored: findings that differ only in the element they name are one row, whose `element` lists them all. A
// design written in several calls otherwise answers one row for every item not realized yet.
export function compactFindings(findings) {
  const groups = new Map();
  for (const finding of findings) {
    const name = finding.element.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const detail = finding.detail.replace(new RegExp(`(?<![\\w.])${name}(?!\\w|\\.\\w)`, "g"), "<element>");
    const key = `${finding.rule}\n${detail}`;
    if (!groups.has(key)) groups.set(key, { finding, detail, elements: new Set() });
    groups.get(key).elements.add(finding.element);
  }
  return [...groups.values()].map(({ finding, detail, elements }) => (elements.size === 1 ? finding : { rule: finding.rule, element: [...elements].join(", "), detail }));
}

// What an answer reports: every finding of runChecks, compacted.
export function reportedChecks(design) {
  const { errors, warnings, coverage } = runChecks(design);
  return { errors: compactFindings(errors), warnings: compactFindings(warnings), coverage };
}

// The references an operation declares to rows of another section, and the section that must hold each one.
const REFERENCE_FIELDS = [
  ["refObligations", (design) => design.obligations, "obligation"],
  ["refContracts", (design) => design.path.contracts, "contract"],
  ["refApis", (design) => design.path.apis, "public API"],
  ["fileReferences", (design) => design.fileReferences, "file reference"],
];

const blank = (value) => typeof value !== "string" || value.trim() === "";

export function runChecks(design) {
  const errors = [];
  const warnings = [];
  const operations = design.path.operations;
  const operationIds = operations.map((o) => o.id);

  operations.forEach((operation, index) => {
    for (const [field, rows, noun] of REFERENCE_FIELDS) {
      const known = new Set(rows(design).map((r) => r.id));
      for (const ref of operation[field] ?? []) {
        if (!known.has(ref)) errors.push({ rule: "operation-reference-unknown", element: operation.id, detail: `${operation.id} declares ${ref} in ${field}, which is no ${noun} of the design` });
      }
    }
    for (const kid of operation.knowledgeReferences ?? []) {
      if (!(design.knowledgeReferences ?? []).some((r) => r.kid === kid)) errors.push({ rule: "operation-reference-unknown", element: operation.id, detail: `${operation.id} declares kid ${kid}, which no knowledge reference registers` });
    }
    // Lab-authored: the 3.0.3 instructions require the references or the reason a dimension needs none; the captured
    // server rules do not list a finding for it, so the runtime reports it as a warning.
    if (!(operation.knowledgeReferences ?? []).length && blank(operation.referencesExemption?.knowledge)) {
      warnings.push({ rule: "operation-references-undeclared", element: operation.id, detail: `${operation.id} declares no knowledgeReferences and no referencesExemption.knowledge saying why it needs none` });
    }
    if (!(operation.fileReferences ?? []).length && blank(operation.referencesExemption?.file)) {
      warnings.push({ rule: "operation-references-undeclared", element: operation.id, detail: `${operation.id} declares no fileReferences and no referencesExemption.file saying why it needs none` });
    }
    // Captured on 3.0.4 (get_design_checks, run 5): a warning, on a Production operation that declares no obligation.
    // The capture shows no Documentation or Testing operation with it, so only Production is reported (Lab-authored).
    if (operation.kind === "Production" && !(operation.refObligations ?? []).length) {
      warnings.push({ rule: "operation-without-obligations", element: operation.id, detail: "the operation writes code but realizes no obligation of R" });
    }
    if (operation.source && operation.source !== "Design" && blank(operation.sourceRef)) {
      errors.push({ rule: "operation-source-without-ref", element: operation.id, detail: `${operation.id} comes from ${operation.source} but cites no sourceRef` });
    }
    for (const dependency of operation.dependsOn ?? []) {
      const position = operationIds.indexOf(dependency);
      if (position === -1) errors.push({ rule: "operation-dependency-unknown", element: operation.id, detail: `${operation.id} depends on ${dependency}, which does not exist` });
      else if (position >= index) errors.push({ rule: "operation-dependency-order", element: operation.id, detail: `${operation.id} depends on ${dependency}, which is not scheduled before it` });
    }
  });

  errors.push(...testingFindings(operations));

  // Coverage: an obligation is realized when at least one operation declares it in refObligations.
  const realizedObligations = new Set(operations.flatMap((o) => o.refObligations ?? []));
  let obligationsRealized = 0;
  for (const obligation of design.obligations) {
    if (realizedObligations.has(obligation.id)) obligationsRealized += 1;
    else if (operations.length) errors.push({ rule: "obligation-not-realized", element: obligation.id, detail: `no operation realizes ${obligation.id} (refObligations)` });
  }

  // Every contract and every public API is realized by at least one operation.
  if (operations.length) {
    const contracts = new Set(operations.flatMap((o) => o.refContracts ?? []));
    for (const contract of design.path.contracts) {
      if (!contracts.has(contract.id)) errors.push({ rule: "contract-not-realized", element: contract.id, detail: `no operation realizes ${contract.id} (refContracts)` });
    }
    const apis = new Set(operations.flatMap((o) => o.refApis ?? []));
    for (const api of design.path.apis) {
      if (!apis.has(api.id)) errors.push({ rule: "api-not-realized", element: api.id, detail: `no operation realizes ${api.id} (refApis)` });
    }
  }

  // A contract is hosted in a file the filesystem declares.
  const declaredPaths = new Set(design.path.filesystem.files.map((f) => f.path));
  if (design.path.filesystem.files.length) {
    for (const contract of design.path.contracts) {
      if (contract.file && !declaredPaths.has(contract.file)) {
        errors.push({ rule: "contract-file-undeclared", element: contract.id, detail: `${contract.id} is hosted in ${contract.file}, which the filesystem does not declare` });
      }
    }
  }

  const decisionIds = new Set(design.decisions.map((d) => d.id));
  const cited = new Set();
  for (const operation of operations) {
    for (const ref of operation.realizes ?? []) {
      cited.add(ref);
      if (!decisionIds.has(ref)) errors.push({ rule: "decision-realized-unknown", element: operation.id, detail: `${operation.id} realizes ${ref}, which does not exist` });
    }
  }
  for (const decision of design.decisions) {
    const chosen = decision.options.filter((o) => o.chosen).length;
    if (chosen !== 1) errors.push({ rule: "decision-chosen-count", element: decision.id, detail: `${decision.id} has ${chosen} chosen options; exactly one must be chosen` });
    if (operations.length && !isHighlighted(decision) && !cited.has(decision.id)) {
      errors.push({ rule: "decision-not-realized", element: decision.id, detail: `${decision.id} is not realized by any operation (at least one operation must cite it in realizes)` });
    }
  }

  const operationFiles = new Set(operations.flatMap((o) => o.files ?? []));
  if (operations.length) {
    for (const file of design.path.filesystem.files) {
      if (!operationFiles.has(file.path)) errors.push({ rule: "file-without-operation", element: file.id, detail: `${file.id} (${file.path}) is added, modified or deleted by no operation` });
    }
  }

  for (const reference of design.fileReferences) {
    for (const file of reference.files ?? []) {
      const detail = (reference.details ?? []).find((d) => d.path === file);
      if (blank(detail?.why) || blank(detail?.purpose)) {
        warnings.push({
          rule: "file-reference-without-detail",
          element: reference.id,
          detail: `the file '${file}' of the symbol '${reference.symbol}' does not say why it is a reference or how the implementor must use it`,
        });
      }
    }
  }

  return {
    errors,
    warnings,
    coverage: { obligationsTotal: design.obligations.length, obligationsRealized },
  };
}
