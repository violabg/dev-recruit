import { requireUser } from "@/lib/auth-server";
import { positionDescriptionSchema } from "@/lib/schemas/position";
import { streamPositionDescription } from "@/lib/services/ai-service";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json();
    const validated = positionDescriptionSchema.parse(body);

    const stream = await streamPositionDescription({
      title: validated.title,
      experienceLevel: validated.experienceLevel,
      skills: validated.skills,
      softSkills: validated.softSkills,
      contractType: validated.contractType,
      currentDescription: validated.currentDescription,
    });

    return stream.toTextStreamResponse();
  } catch (error) {
    console.error("Stream position description failed:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate description",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
