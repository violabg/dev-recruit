/**
 * Strict structured outputs.
 *
 * Groq strict mode (constrained decoding) accepts only JSON schemas where
 * every property is required, every object sets `additionalProperties: false`
 * and optional values are expressed as nullable. The Zod schemas of the app
 * use `.optional()`, defaults and length/range checks, so:
 *   - `toStrictJsonSchema` derives the schema sent to the model (optional
 *     fields become required + nullable, validation keywords are dropped);
 *   - `nullsToUndefined` turns the nulls the model writes for those optional
 *     fields back into missing keys, before the Zod schema validates the
 *     output with all its checks.
 */

import { jsonSchema, type JSONSchema7, type Schema } from "ai";
import { z } from "zod";

type Node = Record<string, unknown>;

/** Keywords strict mode does not need: Zod still enforces them on the output */
const DROPPED_KEYWORDS = [
  "$schema",
  "default",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "pattern",
  "format",
];

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function allowsNull(node: Node): boolean {
  if (node.type === "null") return true;
  if (Array.isArray(node.type) && node.type.includes("null")) return true;
  if (Array.isArray(node.enum) && node.enum.includes(null)) return true;
  if (Array.isArray(node.anyOf)) {
    return node.anyOf.some((entry) => isNode(entry) && allowsNull(entry));
  }
  return false;
}

function makeNullable(node: Node): Node {
  if (allowsNull(node)) return node;
  if (Array.isArray(node.anyOf)) {
    return { ...node, anyOf: [...node.anyOf, { type: "null" }] };
  }
  if (typeof node.type === "string") {
    return {
      ...node,
      type: [node.type, "null"],
      ...(Array.isArray(node.enum) && { enum: [...node.enum, null] }),
    };
  }
  if (Array.isArray(node.type)) {
    return { ...node, type: [...node.type, "null"] };
  }
  return { anyOf: [node, { type: "null" }] };
}

function toStrictNode(node: Node): Node {
  const result: Node = {};
  for (const [key, value] of Object.entries(node)) {
    if (!DROPPED_KEYWORDS.includes(key)) result[key] = value;
  }

  if (isNode(result.properties)) {
    const required = new Set(
      Array.isArray(node.required) ? (node.required as string[]) : [],
    );
    const properties: Record<string, Node> = {};
    for (const [key, value] of Object.entries(result.properties)) {
      if (!isNode(value)) continue;
      const strict = toStrictNode(value);
      properties[key] = required.has(key) ? strict : makeNullable(strict);
    }
    result.properties = properties;
    result.required = Object.keys(properties);
    result.additionalProperties = false;
  }

  if (isNode(result.items)) {
    result.items = toStrictNode(result.items);
  }

  for (const key of ["anyOf", "oneOf"] as const) {
    if (Array.isArray(result[key])) {
      result[key] = (result[key] as unknown[]).map((entry) =>
        isNode(entry) ? toStrictNode(entry) : entry,
      );
    }
  }
  if (Array.isArray(result.oneOf)) {
    result.anyOf = result.oneOf;
    delete result.oneOf;
  }

  return result;
}

/** JSON schema of a Zod schema, as Zod describes its input */
export function zodToJsonSchema(schema: z.ZodType): Node {
  return z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as Node;
}

/** Strict-mode version of a JSON schema (see module comment) */
export function toStrictJsonSchema(schema: Node): Node {
  return toStrictNode(schema);
}

/**
 * Remove the nulls written for properties that the ORIGINAL schema declares
 * optional and not nullable, recursively. Other values are left untouched.
 */
export function nullsToUndefined(value: unknown, schema: Node): unknown {
  if (Array.isArray(value)) {
    return isNode(schema.items)
      ? value.map((item) => nullsToUndefined(item, schema.items as Node))
      : value;
  }
  if (!isNode(value) || !isNode(schema.properties)) return value;

  const properties = schema.properties as Record<string, unknown>;
  const required = new Set(
    Array.isArray(schema.required) ? (schema.required as string[]) : [],
  );
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    const property = properties[key];
    if (!isNode(property)) {
      result[key] = entry;
      continue;
    }
    if (entry === null && !required.has(key) && !allowsNull(property)) {
      continue;
    }
    result[key] = nullsToUndefined(entry, property);
  }
  return result;
}

/**
 * AI SDK schema for a structured output: the model receives the strict
 * version of `wire` (default: `schema`), the output is validated by `schema`.
 */
export function strictOutputSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  wire: z.ZodType = schema,
): Schema<z.infer<TSchema>> {
  const original = zodToJsonSchema(wire);
  return jsonSchema<z.infer<TSchema>>(
    toStrictJsonSchema(original) as JSONSchema7,
    {
      validate: (value) => {
        const parsed = schema.safeParse(nullsToUndefined(value, original));
        return parsed.success
          ? { success: true, value: parsed.data as z.infer<TSchema> }
          : { success: false, error: parsed.error };
      },
    },
  );
}
