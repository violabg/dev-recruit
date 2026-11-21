import { requireUser } from "@/lib/auth-server";
import { positionDescriptionSchema } from "@/lib/schemas/position";
import { aiLogger } from "@/lib/services/logger";
import { streamPositionDescription } from "@/lib/services/ai-service";
import { NextRequest } from "next/server";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json();
    const validated = positionDescriptionSchema.parse(body);

    const stream = await streamPositionDescription({
      title: validated.title ?? "",
      experienceLevel: validated.experienceLevel ?? "",
      skills: validated.skills ?? [],
      softSkills: validated.softSkills,
      contractType: validated.contractType,
      currentDescription: validated.currentDescription,
    });

    return stream.toTextStreamResponse();
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Dati non validi" },
        { status: 400 },
      );
    }

    aiLogger.error("Stream position description failed", { error });
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Impossibile generare la descrizione",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
