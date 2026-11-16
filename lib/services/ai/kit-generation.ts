/**
 * AI generation of a personalized interview kit from the CV, the test and
 * the previous rounds of an application.
 *
 * Only a proposal: it never touches the database or the cache. The
 * preparation editor merges it as unsaved changes and saveInterviewKitAction
 * stores it.
 */

import {
  aiInterviewKitGenerationSchema,
  type InterviewKitProposal,
  type InterviewKitProposalItem,
} from "../../schemas";
import {
  buildCriterionKeys,
  resolveCriterionKeys,
} from "../../utils/criterion-keys";
import {
  personalizedQuestionCap,
  pickKitSection,
} from "../../utils/interview-status";
import type { KitGenerationContext } from "../interview-kits";
import { generateStructured } from "./generate";
import { buildKitPrompt, buildKitSystemPrompt } from "./prompts";

/** Longest CV quote stored as a source reference */
const MAX_CV_QUOTE_CHARS = 300;
const BRIEFING_POINTS = 5;

export type GenerateInterviewKitParams = {
  context: KitGenerationContext;
  specificModel?: string;
};

export async function generateInterviewKit({
  context,
  specificModel,
}: GenerateInterviewKitParams): Promise<InterviewKitProposal> {
  // Every source is listed to the AI by key, never by id
  const keyedCriteria = buildCriterionKeys(context.criteria);
  const answers = context.weakAnswers.map((answer, index) => ({
    key: `Q${index + 1}`,
    questionId: answer.questionId,
  }));
  const feedback = context.previousRounds
    .flatMap((round) => round.feedbackIds)
    .map((feedbackId, index) => ({ key: `F${index + 1}`, feedbackId }));

  // Edited AI items stay in the kit and count against the cap
  const cap = Math.max(
    0,
    personalizedQuestionCap(
      context.templateQuestionCount,
      context.interview.durationMinutes,
    ) - context.keptAiItemCount,
  );

  const output = await generateStructured({
    task: "kit_generation",
    schema: aiInterviewKitGenerationSchema,
    system: buildKitSystemPrompt(),
    prompt: buildKitPrompt(
      context,
      { criteria: keyedCriteria, answers, feedback },
      cap,
    ),
    specificModel,
    temperature: 0.7,
  });

  const normalizeKey = (key: string | undefined) =>
    key?.trim().toUpperCase() ?? "";
  const questionByKey = new Map(
    answers.map((answer) => [answer.key, answer.questionId]),
  );
  const feedbackByKey = new Map(
    feedback.map((entry) => [entry.key, entry.feedbackId]),
  );

  const sourceRefOf = (
    item: (typeof output.items)[number],
  ): string | null => {
    const key = normalizeKey(item.sourceKey);
    const questionId = questionByKey.get(key);
    if (questionId) return `quiz:${questionId}`;
    const feedbackId = feedbackByKey.get(key);
    if (feedbackId) return `feedback:${feedbackId}`;
    const quote = item.cvQuote?.trim();
    if ((item.origin === "cv" || item.origin === "resume_gap") && quote) {
      return `cv:${quote.slice(0, MAX_CV_QUOTE_CHARS)}`;
    }
    return null;
  };

  const items: InterviewKitProposalItem[] = output.items.flatMap((item) => {
    const section = pickKitSection(
      context.sections.map((entry, order) => ({ ...entry, order })),
      item.sectionKind,
    );
    if (!section) return [];
    return [
      {
        sectionId: section.id,
        text: item.text,
        followUps: item.followUps,
        criterionIds: resolveCriterionKeys(keyedCriteria, item.criterionKeys),
        anchors: item.anchors,
        required: false as const,
        origin: item.origin,
        rationale: item.rationale,
        sourceRef: sourceRefOf(item),
      },
    ];
  });

  return {
    briefing: output.briefing
      .map((point) => point.trim())
      .filter((point) => point.length > 0)
      .slice(0, BRIEFING_POINTS),
    hypotheses: output.hypotheses.flatMap((hypothesis) => {
      const [criterionId] = resolveCriterionKeys(keyedCriteria, [
        hypothesis.criterionKey,
      ]);
      if (!criterionId) return [];
      return [
        {
          criterionId,
          hypothesis: hypothesis.hypothesis,
          howToVerify: hypothesis.howToVerify,
        },
      ];
    }),
    items: items.slice(0, cap),
    suggestedChecklist: output.suggestedChecklist
      .map((entry) => ({ category: entry.category, text: entry.text.trim() }))
      .filter((entry) => entry.text.length > 0),
    missingSources: context.missingSources,
  };
}
