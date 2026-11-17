"use server";

import prisma from "@/lib/prisma";
import { transcriptionRequestSchema } from "@/lib/schemas";
import { transcribeAudio } from "@/lib/services/ai/transcription";
import { acceptsAnswers } from "@/lib/utils/assessment-utils";
import type { ActionResult } from "@/lib/utils/action-result";
import { runAction, UserError } from "./run-action";

/** Longest accepted recording (about 25 MB, the provider's own limit) */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/**
 * Transcribe a spoken answer.
 *
 * Candidate-facing, so there is no signed-in user: the assessment token is the
 * credential, and it only works while that assessment still accepts answers.
 */
export async function transcribeAudioAction(
  formData: FormData,
): Promise<ActionResult<{ text: string }>> {
  return runAction("transcribeAudioAction", async () => {
    const audio = formData.get("audio");
    const { token } = transcriptionRequestSchema.parse({
      token: formData.get("token") ?? "",
    });

    const assessment = await prisma.assessment.findUnique({
      where: { token },
      select: {
        status: true,
        startedAt: true,
        quiz: { select: { timeLimit: true } },
      },
    });

    if (!assessment) {
      throw new UserError("Test non valido");
    }

    if (!audio || !(audio instanceof Blob)) {
      throw new UserError("Nessun file audio fornito");
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      throw new UserError("La registrazione è troppo lunga");
    }

    if (
      !acceptsAnswers({
        status: assessment.status,
        startedAt: assessment.startedAt,
        timeLimit: assessment.quiz.timeLimit,
      })
    ) {
      throw new UserError("Il test non è più attivo");
    }

    const text = await transcribeAudio(
      new Uint8Array(await audio.arrayBuffer()),
    );

    return { text };
  });
}
