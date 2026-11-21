import {
  aiDecisionChallengeSchema,
  aiInterviewGuideGenerationSchema,
  aiInterviewKitGenerationSchema,
  aiQuizGenerationSchema,
  aiScorecardGenerationSchema,
  evaluationResultSchema,
  overallEvaluationSchema,
  questionSchemas,
} from "@/lib/schemas";
import {
  questionOutputSchema,
  quizOutputSchema,
} from "@/lib/services/ai/question-output";
import {
  nullsToUndefined,
  strictOutputSchema,
  toStrictJsonSchema,
  zodToJsonSchema,
} from "@/lib/services/ai/strict-schema";
import { describe, expect, it } from "vitest";
import { z } from "zod";

type Node = Record<string, any>;

const DROPPED = ["default", "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "$schema"];

/** Every rule of Groq strict mode, checked on the whole tree */
function expectStrict(node: Node, path = "$") {
  for (const key of DROPPED) {
    expect(node, `${path} has ${key}`).not.toHaveProperty(key);
  }
  expect(node, `${path} has allOf`).not.toHaveProperty("allOf");
  if (node.properties) {
    expect(node.additionalProperties, path).toBe(false);
    expect([...node.required].sort(), path).toEqual(
      Object.keys(node.properties).sort(),
    );
    for (const [key, child] of Object.entries(node.properties)) {
      expectStrict(child as Node, `${path}.${key}`);
    }
  }
  if (node.items) expectStrict(node.items, `${path}[]`);
  for (const entry of node.anyOf ?? []) expectStrict(entry, `${path}|`);
}

describe("toStrictJsonSchema", () => {
  const schema = z.object({
    name: z.string().min(2),
    note: z.string().optional(),
    level: z.enum(["a", "b"]).optional(),
    limit: z.number().nullable().optional(),
    anchors: z.object({ weak: z.string().default("") }),
  });

  it("makes every property required and the optional ones nullable", () => {
    const strict = toStrictJsonSchema(zodToJsonSchema(schema)) as Node;
    expectStrict(strict);
    expect(strict.properties.name).toEqual({ type: "string" });
    expect(strict.properties.note).toEqual({ type: ["string", "null"] });
    expect(strict.properties.level).toEqual({
      type: ["string", "null"],
      enum: ["a", "b", null],
    });
    // Already nullable: unchanged
    expect(strict.properties.limit).toEqual({ type: ["number", "null"] });
    expect(strict.properties.anchors.properties.weak).toEqual({
      type: ["string", "null"],
    });
  });

  it.each([
    ["quiz", aiQuizGenerationSchema],
    ["question", questionSchemas.flexible],
    ["scorecard", aiScorecardGenerationSchema],
    ["guide", aiInterviewGuideGenerationSchema],
    ["kit", aiInterviewKitGenerationSchema],
    ["decision", aiDecisionChallengeSchema],
    ["answer evaluation", evaluationResultSchema],
    ["overall evaluation", overallEvaluationSchema],
    ["quiz output", quizOutputSchema(["multiple_choice", "code_snippet"], true)],
    ["question output", questionOutputSchema(["open_question"])],
  ])("turns the %s schema into a strict-mode schema", (_name, zodSchema) => {
    expectStrict(toStrictJsonSchema(zodToJsonSchema(zodSchema as z.ZodType)));
  });
});

describe("nullsToUndefined", () => {
  const original = zodToJsonSchema(
    z.object({
      note: z.string().optional(),
      limit: z.number().nullable(),
      items: z.array(z.object({ quote: z.string().optional() })),
    }),
  );

  it("drops nulls of optional fields only, recursively", () => {
    expect(
      nullsToUndefined(
        { note: null, limit: null, items: [{ quote: null }, { quote: "q" }] },
        original,
      ),
    ).toEqual({ limit: null, items: [{}, { quote: "q" }] });
  });
});

describe("strictOutputSchema", () => {
  it("validates with the full Zod schema after removing the nulls", async () => {
    const schema = z.object({
      name: z.string().min(2),
      note: z.string().optional(),
    });
    const output = strictOutputSchema(schema);

    expect(await output.validate!({ name: "ok", note: null })).toEqual({
      success: true,
      value: { name: "ok" },
    });
    const invalid = await output.validate!({ name: "x", note: null });
    expect(invalid.success).toBe(false);
  });

  it("sends the narrower wire schema when one is given", async () => {
    const output = strictOutputSchema(
      questionSchemas.flexible,
      questionOutputSchema(["code_snippet"]),
    );
    const sent = (await output.jsonSchema) as Node;
    expect(sent.properties.type.enum).toEqual(["code_snippet"]);
    expect(sent.properties).not.toHaveProperty("dbId");
    expect(sent.properties).not.toHaveProperty("options");
  });
});

describe("questionOutputSchema", () => {
  it("has one variant per requested type, with criterionKeys only when asked", () => {
    const quiz = zodToJsonSchema(
      quizOutputSchema(["multiple_choice", "open_question"], true),
    );
    const variants = (quiz.properties as Node).questions.items.anyOf as Node[];
    expect(variants.map((v) => v.properties.type.enum[0])).toEqual([
      "multiple_choice",
      "open_question",
    ]);
    expect(variants.every((v) => "criterionKeys" in v.properties)).toBe(true);

    const single = zodToJsonSchema(questionOutputSchema(["multiple_choice"]));
    expect(single.properties).not.toHaveProperty("criterionKeys");
  });
});
