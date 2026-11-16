import type { Prisma } from "../prisma/client";
import type { InterviewGuideEditorData } from "../schemas";

/**
 * Save an interview guide with its ordered sections and questions.
 *
 * The single place that writes GuideSection and GuideQuestion. Runs inside the
 * caller's transaction.
 * - With `guideId` the guide row is updated (title, round, durationMinutes);
 *   without it a guide is created for `positionId`.
 * - Sections and questions are matched by id: a row whose id belongs to this
 *   guide (a question: to the same section) is updated, any other row is
 *   created, stored rows missing from the input are deleted.
 * - `order` is the index in the input array. Ids of kept rows never change.
 */
export async function syncInterviewGuide(
  tx: Prisma.TransactionClient,
  params: {
    guideId?: string;
    positionId: string;
    data: InterviewGuideEditorData;
    userId: string;
  },
): Promise<{ id: string }> {
  const { guideId, positionId, data, userId } = params;

  const guide = guideId
    ? await tx.interviewGuide.update({
        where: { id: guideId },
        data: {
          title: data.title,
          round: data.round,
          durationMinutes: data.durationMinutes,
        },
        select: { id: true },
      })
    : await tx.interviewGuide.create({
        data: {
          positionId,
          title: data.title,
          round: data.round,
          durationMinutes: data.durationMinutes,
          createdBy: userId,
        },
        select: { id: true },
      });

  const storedSections = await tx.guideSection.findMany({
    where: { guideId: guide.id },
    select: { id: true, questions: { select: { id: true } } },
  });
  const storedQuestionsBySection = new Map(
    storedSections.map((section) => [
      section.id,
      new Set(section.questions.map((question) => question.id)),
    ]),
  );

  const keptSectionIds: string[] = [];

  for (const [sectionIndex, section] of data.sections.entries()) {
    const sectionData = {
      title: section.title,
      minutes: section.minutes,
      kind: section.kind,
      order: sectionIndex,
    };

    let sectionId: string;
    let storedQuestionIds: Set<string>;

    const storedQuestions = section.id
      ? storedQuestionsBySection.get(section.id)
      : undefined;

    if (section.id && storedQuestions) {
      await tx.guideSection.update({
        where: { id: section.id },
        data: sectionData,
      });
      sectionId = section.id;
      storedQuestionIds = storedQuestions;
    } else {
      const created = await tx.guideSection.create({
        data: { ...sectionData, guideId: guide.id },
        select: { id: true },
      });
      sectionId = created.id;
      storedQuestionIds = new Set();
    }
    keptSectionIds.push(sectionId);

    const keptQuestionIds = new Set<string>();

    for (const [questionIndex, question] of section.questions.entries()) {
      const questionData = {
        text: question.text,
        followUps: question.followUps,
        criterionIds: question.criterionIds,
        anchors: {
          weak: question.anchors.weak,
          medium: question.anchors.medium,
          strong: question.anchors.strong,
        },
        required: question.required,
        order: questionIndex,
      };

      // A question id of another section is treated as new: it is created
      // here and the old row is deleted with its section's leftovers
      if (question.id && storedQuestionIds.has(question.id)) {
        await tx.guideQuestion.update({
          where: { id: question.id },
          data: questionData,
        });
        keptQuestionIds.add(question.id);
      } else {
        await tx.guideQuestion.create({
          data: { ...questionData, sectionId },
        });
      }
    }

    const droppedQuestionIds = [...storedQuestionIds].filter(
      (id) => !keptQuestionIds.has(id),
    );
    if (droppedQuestionIds.length > 0) {
      await tx.guideQuestion.deleteMany({
        where: { id: { in: droppedQuestionIds } },
      });
    }
  }

  // Sections missing from the input are deleted (their questions cascade)
  await tx.guideSection.deleteMany({
    where: { guideId: guide.id, id: { notIn: keptSectionIds } },
  });

  return { id: guide.id };
}
