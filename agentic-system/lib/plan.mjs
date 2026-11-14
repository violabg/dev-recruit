// The implementation plan as the runtime serves it (contracts/design-model.md#implementation-loop): the batch of
// every operation and which batches need the developer's selection. The plan is served in the order it was
// declared; `dependsOn` is the only precedence constraint inside a batch.

// The production batch, then the documentation batch, are served without a selection. A Testing operation and an
// operation with destructive side effects are served only when the delegation prompt names their ids.
const BATCH_OF_KIND = { Production: "production", Documentation: "documentation", Testing: "testing" };

// Lab-authored: a design written before 3.0.3 keeps its stored kinds. Code was production code and NotCode
// non-source work, so they join the automatic batches; Build and Commands ran commands, so they wait for a selection.
const LEGACY_BATCH = { Code: "production", NotCode: "documentation", Build: "selected", Commands: "selected" };

export function batchOf(operation) {
  if (operation.hasDestructiveSideEffects) return "selected";
  return BATCH_OF_KIND[operation.kind] ?? LEGACY_BATCH[operation.kind] ?? "selected";
}

export const AUTOMATIC_BATCHES = ["production", "documentation"];
export const isAutomatic = (operation) => AUTOMATIC_BATCHES.includes(batchOf(operation));

export function authorisationOf(operation) {
  const batch = batchOf(operation);
  if (AUTOMATIC_BATCHES.includes(batch)) return `${batch} batch: served without the developer's selection`;
  const why = operation.hasDestructiveSideEffects ? "it has destructive side effects" : operation.kind === "Testing" ? "it is a Testing operation" : `its kind ${operation.kind ?? "(none)"} is not served automatically`;
  return `requires the developer's explicit selection (${why}): served only when the delegation prompt names its operation id`;
}

// An operation is done for the loop once it is closed (Implemented) or reviewed (Completed).
export const isDone = (operation) => operation.implementationStatus === "Implemented" || operation.implementationStatus === "Completed";

// An operation is servable only when every operation it depends on is done.
export function unmetDependencies(operations, operation) {
  const byId = new Map(operations.map((op) => [op.id, op]));
  return (operation.dependsOn ?? []).filter((id) => !byId.get(id) || !isDone(byId.get(id)));
}

// The next automatic operation: the first servable one of the production batch, then of the documentation batch.
export function nextAutomatic(operations) {
  for (const batch of AUTOMATIC_BATCHES) {
    const next = operations.find((op) => batchOf(op) === batch && !isDone(op) && unmetDependencies(operations, op).length === 0);
    if (next) return next;
  }
  return null;
}
