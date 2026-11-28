"use server";

import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  generateInterviewKitSchema,
  saveKitItemNoteSchema,
  setKitItemCoveredSchema,
  type GenerateInterviewKitInput,
  type SaveInterviewKitInput,
  type SaveKitItemNoteInput,
  type SetInterviewKitStatusInput,
  type SetKitItemCoveredInput,
} from "../schemas";
import { toActor } from "../services/actor";
import { generateInterviewKit } from "../services/ai/kit-generation";
import {
  buildKitGenerationContext,
  KIT_LOCKED_MESSAGE,
  saveInterviewKit,
  setInterviewKitStatus,
} from "../services/interview-kits";
import {
  assertInterviewStatus,
  loadInterview,
  requireParticipant,
} from "../services/interviews";
import { invalidateInterviewCache } from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

/** Notes and covered marks are accepted before and during the interview */
const NOTES_OPEN = ["scheduled", "in_progress"] as const;
const NOTES_CLOSED_MESSAGE = "Il colloquio non accetta più note";

/** The kit item with its interview, or UserError('Domanda non trovata') */
async function loadKitItem(kitItemId: string) {
  const item = await prisma.kitItem.findUnique({
    where: { id: kitItemId },
    select: {
      id: true,
      kit: {
        select: {
          interview: {
            select: { id: true, status: true, applicationId: true },
          },
        },
      },
    },
  });
  if (!item) throw new UserError("Domanda non trovata");
  return { id: item.id, interview: item.kit.interview };
}

/** Generation runs only while the interview is scheduled */
const KIT_EDITABLE = ["scheduled"] as const;

/**
 * Ask the AI for a personalized kit from the CV, the test and the previous
 * rounds. Nothing is saved: the editor merges the proposal as unsaved changes
 * and saveInterviewKitAction stores it.
 */
export async function generateInterviewKitAction(
  input: GenerateInterviewKitInput,
) {
  return runAction("generateInterviewKitAction", async () => {
    await requireUser();
    const { interviewId, specificModel } =
      generateInterviewKitSchema.parse(input);

    const interview = await loadInterview(prisma, interviewId);
    assertInterviewStatus(interview, KIT_EDITABLE, KIT_LOCKED_MESSAGE);

    const context = await buildKitGenerationContext(interview.id);
    const proposal = await generateInterviewKit({ context, specificModel });

    return { proposal };
  });
}

/**
 * Saves briefing, hypotheses, checklist, missing sources and the questions of
 * the kit in one transaction. The kit status is unchanged.
 */
export async function saveInterviewKitAction(input: SaveInterviewKitInput) {
  return runAction("saveInterviewKitAction", async () => {
    const user = await requireUser();
    const { kitId, interviewId, applicationId } = await saveInterviewKit(
      toActor(user),
      input,
    );

    invalidateInterviewCache({ interviewId, applicationId });

    return { kitId };
  });
}

/** "Segna come pronto" / "Riporta in bozza" while the interview is scheduled. */
export async function setInterviewKitStatusAction(
  input: SetInterviewKitStatusInput,
) {
  return runAction("setInterviewKitStatusAction", async () => {
    const user = await requireUser();
    const { status, interviewId, applicationId } = await setInterviewKitStatus(
      toActor(user),
      input,
    );

    invalidateInterviewCache({ interviewId, applicationId });

    return { status };
  });
}

/**
 * Autosave of the signed-in participant's note on one question: only the
 * fields present in the input change (null clears a field). Refused once the
 * author's scorecard is submitted.
 */
export async function saveKitItemNoteAction(input: SaveKitItemNoteInput) {
  return runAction("saveKitItemNoteAction", async () => {
    const user = await requireUser();
    const { kitItemId, ...fields } = saveKitItemNoteSchema.parse(input);

    const item = await loadKitItem(kitItemId);
    const { interview } = item;
    assertInterviewStatus(interview, NOTES_OPEN, NOTES_CLOSED_MESSAGE);

    const participant = await requireParticipant(
      prisma,
      interview.id,
      user.id,
    );

    const feedback = await prisma.interviewerFeedback.findUnique({
      where: {
        interviewId_interviewerId: {
          interviewId: interview.id,
          interviewerId: user.id,
        },
      },
      select: { submittedAt: true },
    });
    if (feedback?.submittedAt) {
      throw new UserError("Il feedback è già stato inviato");
    }

    // undefined = untouched, null = cleared
    const data = {
      ...(fields.note !== undefined ? { note: fields.note } : {}),
      ...(fields.score !== undefined ? { score: fields.score } : {}),
      ...(fields.evidenceQuote !== undefined
        ? { evidenceQuote: fields.evidenceQuote }
        : {}),
    };

    const note = await prisma.kitItemNote.upsert({
      where: {
        kitItemId_participantId: {
          kitItemId: item.id,
          participantId: participant.id,
        },
      },
      create: { kitItemId: item.id, participantId: participant.id, ...data },
      update: data,
      select: { id: true, updatedAt: true },
    });

    invalidateInterviewCache({
      interviewId: interview.id,
      applicationId: interview.applicationId,
    });

    return { noteId: note.id, updatedAt: note.updatedAt };
  });
}

/** Shared "Coperta" mark of a question, before or during the interview. */
export async function setKitItemCoveredAction(input: SetKitItemCoveredInput) {
  return runAction("setKitItemCoveredAction", async () => {
    await requireUser();
    const { kitItemId, covered } = setKitItemCoveredSchema.parse(input);

    const item = await loadKitItem(kitItemId);
    const { interview } = item;
    assertInterviewStatus(interview, NOTES_OPEN, NOTES_CLOSED_MESSAGE);

    await prisma.kitItem.update({
      where: { id: item.id },
      data: { covered, coveredAt: covered ? new Date() : null },
    });

    invalidateInterviewCache({
      interviewId: interview.id,
      applicationId: interview.applicationId,
    });

    return { covered };
  });
}
