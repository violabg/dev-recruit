// A minimal JSON Schema subset validator: type, enum, properties, required, additionalProperties: false,
// items, and local $ref (#/...). It is enough for the runtime's own request schemas.

function resolveRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((node, part) => node[part.replace(/~1/g, "/").replace(/~0/g, "~")], root);
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

export function validate(schema, value, root = schema, path = "") {
  const errors = [];
  if (schema.$ref) return validate(resolveRef(root, schema.$ref), value, root, path);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    const ok = types.some((t) => t === actual || (t === "number" && actual === "integer"));
    if (!ok) return [`${path || "(root)"}: expected ${types.join(" or ")}, got ${actual}`];
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path || "(root)"}: '${value}' is not one of ${schema.enum.join(", ")}`);
  }
  if (typeOf(value) === "object") {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}/${key}: required property is missing`);
    }
    for (const [key, child] of Object.entries(value)) {
      const childSchema = schema.properties?.[key];
      if (childSchema) errors.push(...validate(childSchema, child, root, `${path}/${key}`));
      else if (schema.additionalProperties === false) {
        errors.push(`${path}/${key}: the JSON property '${key}' could not be mapped; the allowed properties are ${Object.keys(schema.properties ?? {}).join(", ")}`);
      }
    }
  }
  if (typeOf(value) === "array" && schema.items) {
    value.forEach((item, index) => errors.push(...validate(schema.items, item, root, `${path}/${index}`)));
  }
  return errors;
}
