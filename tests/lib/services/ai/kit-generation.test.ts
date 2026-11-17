import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/ai/generate", () => ({ generateStructured: vi.fn() }));

import { aiInterviewKitGenerationSchema } from "@/lib/schemas";
import { generateStructured } from "@/lib/services/ai/generate";
import { generateInterviewKit } from "@/lib/services/ai/kit-generation";
import type { KitGenerationContext } from "@/lib/services/interview-kits";

const criterion = (id: string, name: string) => ({
  id,
  name,
  description: null,
  category: "technical" as const,
  priority: "must" as const,
  weight: 3,
  expectedLevel: 3,
});

const context = (overrides: Partial<KitGenerationContext> = {}): KitGenerationContext => ({
  interview: { id: "int-1", round: 2, durationMinutes: 60 },
  position: { title: "Dev", experienceLevel: "senior", skills: [], softSkills: [] },
  criteria: [criterion("crit-react", "React"), criterion("crit-sql", "SQL")],
  sections: [
    { id: "s-intro", title: "Introduzione", minutes: 5, kind: "intro" },
    { id: "s-tech", title: "Tecnica", minutes: 40, kind: "technical" },
    { id: "s-close", title: "Chiusura", minutes: 5, kind: "closing" },
  ],
  // cap = floor(2 * 6 / 3) = 4
  templateQuestionCount: 6,
  keptAiItemCount: 0,
  resumeText: "CV",
  resumeWeaknesses: [],
  resumeCriteriaGaps: [],
  weakAnswers: [
    { questionId: "quiz-q-1", question: "Q", answer: "A", score: 2, weaknesses: [] },
  ],
  previousRounds: [
    { feedbackIds: ["fb-1", "fb-2"], criteria: [] },
  ],
  missingSources: ["answer_detail"],
  ...overrides,
});

const anchors = { weak: "w", medium: "m", strong: "s" };

const aiItem = (overrides: Record<string, unknown> = {}) => ({
  text: "Domanda",
  followUps: ["Perché?", "Esempio?"],
  criterionKeys: ["C1"],
  sectionKind: "technical",
  origin: "cv",
  rationale: "Motivo",
  anchors,
  ...overrides,
});

const output = (items = [aiItem()]) => ({
  briefing: [" Uno ", "", "Due", "Tre", "Quattro", "Cinque", "Sei"],
  hypotheses: [
    { criterionKey: " c2 ", hypothesis: "Ipotesi", howToVerify: "Verifica" },
    { criterionKey: "C9", hypothesis: "Sconosciuto", howToVerify: "x" },
  ],
  items,
  suggestedChecklist: [
    { category: "logistics", text: "  Inviare il link  " },
    { category: "communicate", text: "  " },
  ],
});

beforeEach(() => {
  vi.mocked(generateStructured).mockResolvedValue(output() as any);
});

describe("generateInterviewKit", () => {
  it("calls generateStructured with the kit task, temperature 0.7 and no seed", async () => {
    await generateInterviewKit({ context: context(), specificModel: "some/model" });

    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "kit_generation",
        temperature: 0.7,
        schema: aiInterviewKitGenerationSchema,
        specificModel: "some/model",
      }),
    );
    const options = vi.mocked(generateStructured).mock.calls[0][0] as any;
    expect(options.seed).toBeUndefined();
    // The model sees keys, never ids
    expect(options.prompt).toContain("C1");
    expect(options.prompt).toContain("Q1");
    expect(options.prompt).toContain("F1");
    expect(options.prompt).not.toContain("crit-react");
    expect(options.prompt).not.toContain("quiz-q-1");
    expect(options.prompt).not.toContain("fb-1");
    expect(options.prompt).toContain("at most 4 personalized questions");
  });

  it("keeps at most 5 trimmed briefing points and resolves hypotheses, dropping unknown keys", async () => {
    const proposal = await generateInterviewKit({ context: context() });

    expect(proposal.briefing).toEqual(["Uno", "Due", "Tre", "Quattro", "Cinque"]);
    expect(proposal.hypotheses).toEqual([
      { criterionId: "crit-sql", hypothesis: "Ipotesi", howToVerify: "Verifica" },
    ]);
    expect(proposal.suggestedChecklist).toEqual([
      { category: "logistics", text: "Inviare il link" },
    ]);
    expect(proposal.missingSources).toEqual(["answer_detail"]);
  });

  it("resolves criterion keys, dropping the unknown ones", async () => {
    vi.mocked(generateStructured).mockResolvedValue(
      output([aiItem({ criterionKeys: ["c2", "C7", "C1"] })]) as any,
    );
    const proposal = await generateInterviewKit({ context: context() });
    expect(proposal.items[0].criterionIds).toEqual(["crit-sql", "crit-react"]);
    expect(proposal.items[0].required).toBe(false);
  });

  it("builds source references for quiz answers, feedback and CV quotes", async () => {
    vi.mocked(generateStructured).mockResolvedValue(
      output([
        aiItem({ origin: "quiz_answer", sourceKey: " q1 " }),
        aiItem({ origin: "previous_round", sourceKey: "F2" }),
        aiItem({ origin: "cv", cvQuote: `  ${"x".repeat(400)}  ` }),
        aiItem({ origin: "quiz_answer", sourceKey: "Q9" }),
      ]) as any,
    );

    const proposal = await generateInterviewKit({ context: context() });

    expect(proposal.items.map((item) => item.sourceRef)).toEqual([
      "quiz:quiz-q-1",
      "feedback:fb-2",
      `cv:${"x".repeat(300)}`,
      // Unknown key: origin kept, no source
      null,
    ]);
    expect(proposal.items[3].origin).toBe("quiz_answer");
  });

  it("places items by section kind with the fallbacks", async () => {
    vi.mocked(generateStructured).mockResolvedValue(
      output([
        aiItem({ sectionKind: "intro" }),
        aiItem({ sectionKind: "behavioral" }),
        aiItem({ sectionKind: "closing" }),
      ]) as any,
    );
    const proposal = await generateInterviewKit({ context: context() });
    expect(proposal.items.map((item) => item.sectionId)).toEqual([
      "s-intro",
      // No behavioral section: last non-closing
      "s-tech",
      "s-close",
    ]);
  });

  it("drops the items when the kit has no section", async () => {
    const proposal = await generateInterviewKit({ context: context({ sections: [] }) });
    expect(proposal.items).toEqual([]);
  });

  it("caps the personalized questions, minus the edited AI items kept", async () => {
    const many = Array.from({ length: 8 }, (_, i) => aiItem({ text: `D${i}` }));
    vi.mocked(generateStructured).mockResolvedValue(output(many) as any);

    const capped = await generateInterviewKit({ context: context() });
    expect(capped.items.map((item) => item.text)).toEqual(["D0", "D1", "D2", "D3"]);

    const withKept = await generateInterviewKit({
      context: context({ keptAiItemCount: 3 }),
    });
    expect(withKept.items).toHaveLength(1);

    const none = await generateInterviewKit({
      context: context({ keptAiItemCount: 9 }),
    });
    expect(none.items).toEqual([]);
  });

  it("uses the duration when the kit has no template question", async () => {
    const many = Array.from({ length: 8 }, (_, i) => aiItem({ text: `D${i}` }));
    vi.mocked(generateStructured).mockResolvedValue(output(many) as any);

    // floor(0.4 * 30 / 5) = 2
    const proposal = await generateInterviewKit({
      context: context({
        templateQuestionCount: 0,
        interview: { id: "int-1", round: 1, durationMinutes: 30 },
      }),
    });
    expect(proposal.items).toHaveLength(2);
  });
});
