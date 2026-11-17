/**
 * Criterion keys used by the AI instead of database ids.
 *
 * A prompt lists the criteria as C1, C2, ... (in the order given) and the model
 * answers with those keys; the keys are then resolved back to the ids.
 * Pure module: no server imports.
 */

export type KeyedCriterion<T extends { id: string }> = T & { key: string };

/**
 * Assign the key `C<n>` to each criterion, in the order of the input.
 */
export function buildCriterionKeys<T extends { id: string }>(
  criteria: T[],
): KeyedCriterion<T>[] {
  return criteria.map((criterion, index) => ({
    ...criterion,
    key: `C${index + 1}`,
  }));
}

/**
 * Resolve the keys returned by the AI to criterion ids.
 * Comparison trims and ignores case; unknown keys and duplicates are dropped;
 * the order of `keys` is kept. `undefined` gives an empty list.
 */
export function resolveCriterionKeys(
  keyed: { id: string; key: string }[],
  keys: string[] | undefined,
): string[] {
  if (!keys) return [];

  const idByKey = new Map(
    keyed.map((criterion) => [criterion.key.trim().toUpperCase(), criterion.id]),
  );

  const ids: string[] = [];
  for (const key of keys) {
    if (typeof key !== "string") continue;
    const id = idByKey.get(key.trim().toUpperCase());
    if (id !== undefined && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
