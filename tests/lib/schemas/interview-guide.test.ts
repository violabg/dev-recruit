import {
  aiInterviewGuideGenerationSchema,
  guideSectionSchema,
  interviewGuideEditorSchema,
  saveInterviewGuideSchema,
} from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const question = {
  text: "Raccontami un progetto recente",
  followUps: ["Quale era il tuo ruolo?"],
  criterionIds: ["c-1"],
  anchors: { weak: "", medium: "", strong: "" },
  required: true,
};

const section = {
  title: "Esperienza",
  minutes: 15,
  kind: "experience",
  questions: [question],
};

const guide = {
  title: "Colloquio tecnico",
  round: 1,
  durationMinutes: 60,
  sections: [section],
};

const firstMessage = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues[0]?.message;

describe("guideSectionSchema", () => {
  it.each([
    "intro",
    "experience",
    "technical",
    "behavioral",
    "candidate_questions",
    "closing",
  ])("accepts kind %s", (kind) => {
    expect(guideSectionSchema.safeParse({ ...section, kind }).success).toBe(
      true,
    );
  });

  it("refuses another kind with 'Tipo di sezione non valido'", () => {
    const result = guideSectionSchema.safeParse({ ...section, kind: "lunch" });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Tipo di sezione non valido");
  });

  it.each([1, 240])("accepts %i minutes", (minutes) => {
    expect(guideSectionSchema.safeParse({ ...section, minutes }).success).toBe(
      true,
    );
  });

  it.each([0, 241])("refuses %i minutes", (minutes) => {
    expect(guideSectionSchema.safeParse({ ...section, minutes }).success).toBe(
      false,
    );
  });
});

describe("interviewGuideEditorSchema", () => {
  it("accepts a complete guide", () => {
    expect(interviewGuideEditorSchema.safeParse(guide).success).toBe(true);
  });

  it.each([1, 10])("accepts round %i", (round) => {
    expect(
      interviewGuideEditorSchema.safeParse({ ...guide, round }).success,
    ).toBe(true);
  });

  it.each([0, 11])("refuses round %i", (round) => {
    expect(
      interviewGuideEditorSchema.safeParse({ ...guide, round }).success,
    ).toBe(false);
  });

  it.each([10, 480])("accepts a duration of %i minutes", (durationMinutes) => {
    expect(
      interviewGuideEditorSchema.safeParse({ ...guide, durationMinutes })
        .success,
    ).toBe(true);
  });

  it.each([9, 481])("refuses a duration of %i minutes", (durationMinutes) => {
    expect(
      interviewGuideEditorSchema.safeParse({ ...guide, durationMinutes })
        .success,
    ).toBe(false);
  });
});

describe("saveInterviewGuideSchema", () => {
  it("accepts a guide id or a position id", () => {
    expect(
      saveInterviewGuideSchema.safeParse({ ...guide, guideId: "g-1" }).success,
    ).toBe(true);
    expect(
      saveInterviewGuideSchema.safeParse({ ...guide, positionId: "pos-1" })
        .success,
    ).toBe(true);
  });

  it("refuses input with neither guideId nor positionId", () => {
    const result = saveInterviewGuideSchema.safeParse(guide);
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(
      "La posizione è obbligatoria per creare una guida",
    );
  });
});

describe("aiInterviewGuideGenerationSchema", () => {
  it("parses sections whose questions carry criterion keys", () => {
    const result = aiInterviewGuideGenerationSchema.safeParse({
      sections: [
        {
          title: "Tecnica",
          minutes: 20,
          kind: "technical",
          questions: [
            {
              text: "Come gestisci lo stato?",
              followUps: [],
              criterionKeys: ["C1"],
              anchors: { weak: "", medium: "", strong: "" },
              required: true,
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
