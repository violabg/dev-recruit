import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/ai/generate", () => ({ generateStructured: vi.fn() }));

import { aiInterviewGuideGenerationSchema } from "@/lib/schemas";
import { generateStructured } from "@/lib/services/ai/generate";
import { generateInterviewGuide } from "@/lib/services/ai/guide-generation";

const criterion = (id: string, name: string) => ({
  id,
  name,
  description: null,
  category: "technical" as const,
  priority: "must" as const,
  weight: 3,
  expectedLevel: 3,
});

const params = {
  positionTitle: "Frontend Developer",
  experienceLevel: "senior",
  title: "Colloquio tecnico",
  round: 1,
  durationMinutes: 60,
  criteria: [criterion("crit-react", "React"), criterion("crit-ts", "TypeScript")],
};

const anchors = { weak: "w", medium: "m", strong: "s" };

describe("generateInterviewGuide", () => {
  beforeEach(() => {
    vi.mocked(generateStructured).mockResolvedValue({
      sections: [
        {
          title: "Introduzione",
          minutes: 4.6,
          kind: "intro",
          questions: [],
        },
        {
          title: "Tecnica",
          minutes: 0.2,
          kind: "technical",
          questions: [
            {
              text: "Come gestisci lo stato?",
              followUps: ["Perché?"],
              criterionKeys: ["c2", "C1", "C7"],
              anchors,
              required: true,
            },
          ],
        },
      ],
    });
  });

  it("calls generateStructured with the guide task and temperature 0.7", async () => {
    await generateInterviewGuide(params);

    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "guide_generation",
        schema: aiInterviewGuideGenerationSchema,
        temperature: 0.7,
      }),
    );
    const call = vi.mocked(generateStructured).mock.calls[0][0];
    expect(call.prompt).toContain("C1 - React");
    expect(call.prompt).toContain("C2 - TypeScript");
  });

  it("maps keys to ids, drops unknown keys and rounds minutes to at least 1", async () => {
    const result = await generateInterviewGuide(params);

    expect(result).toEqual({
      sections: [
        { title: "Introduzione", minutes: 5, kind: "intro", questions: [] },
        {
          title: "Tecnica",
          minutes: 1,
          kind: "technical",
          questions: [
            {
              text: "Come gestisci lo stato?",
              followUps: ["Perché?"],
              criterionIds: ["crit-ts", "crit-react"],
              anchors,
              required: true,
            },
          ],
        },
      ],
    });
  });
});
