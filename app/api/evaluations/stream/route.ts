import { requireUser } from "@/lib/auth-server";
import { resumeEvaluationRequestSchema } from "@/lib/schemas";
import { getLanguageModel } from "@/lib/services/ai/generate";
import { getOptimalModel } from "@/lib/services/ai/models";
import { aiLogger } from "@/lib/services/logger";
import {
  prepareResumeEvaluation,
  ResumeEvaluationError,
  saveResumeEvaluation,
} from "@/lib/services/resume-evaluation";
import {
  invalidateCandidateCacheInRouteHandler,
  invalidateEvaluationCacheInRouteHandler,
} from "@/lib/utils/cache-utils";
import { streamText } from "ai";

/**
 * Streams a resume-based evaluation to the browser and stores it once the
 * stream is complete. All evaluation rules live in
 * lib/services/resume-evaluation.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body = resumeEvaluationRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!body.success) {
      return Response.json(
        { error: "candidateId e positionId sono obbligatori" },
        { status: 400 },
      );
    }

    const prepared = await prepareResumeEvaluation(
      body.data.candidateId,
      body.data.positionId,
    );

    const result = streamText({
      model: await getLanguageModel(getOptimalModel("resume_evaluation")),
      prompt: prepared.prompt,
      system: prepared.system,
      temperature: 0,
      seed: 42,
    });

    // Stream the text response directly
    const encoder = new TextEncoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullText += chunk;
            // Send the accumulated text so far
            controller.enqueue(encoder.encode(chunk));
          }

          // After streaming completes, parse and save to database BEFORE closing
          try {
            // Stores the evaluation and advances the application to screening
            await saveResumeEvaluation({
              candidateId: prepared.candidateId,
              positionId: prepared.positionId,
              applicationId: prepared.applicationId,
              title: prepared.title,
              responseText: fullText,
              userId: user.id,
              criterionKeys: prepared.criterionKeys,
            });

            // Invalidate cache to show the new evaluation and the new stage
            invalidateEvaluationCacheInRouteHandler({
              candidateId: prepared.candidateId,
            });
            invalidateCandidateCacheInRouteHandler({
              candidateId: prepared.candidateId,
              positionId: prepared.positionId,
              applicationId: prepared.applicationId,
            });
          } catch (parseError) {
            aiLogger.error("Error parsing/saving evaluation", {
              error: parseError,
            });
            // The evaluation was generated but not stored: fail the stream so
            // the client does not report a silent success.
            controller.error(
              new Error("Valutazione generata ma non salvata. Riprova."),
            );
            return;
          }

          // Close AFTER the database save is complete
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof ResumeEvaluationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    aiLogger.error("Error streaming evaluation", { error });
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la generazione della valutazione",
      },
      { status: 500 }
    );
  }
}
