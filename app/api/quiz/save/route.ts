import { requireUser } from "@/lib/auth-server";
import { withValidation } from "@/lib/middleware/validation";
import prisma from "@/lib/prisma";
import { convertToStrictQuestions, saveQuizRequestSchema } from "@/lib/schemas";
import { QuizErrorCode } from "@/lib/services/error-handler";
import { getErrorResponse } from "@/lib/utils/error-response";
import { NextRequest, NextResponse } from "next/server";

const saveQuizHandler = withValidation(
  { body: saveQuizRequestSchema },
  {}, // Remove auth requirement from middleware since we handle it manually
  async (req, validated) => {
    try {
      const validatedData = validated.body!;

      // Check user authentication
      const user = await requireUser();

      if (!user) {
        return NextResponse.json(
          {
            error: "Authentication required",
            code: QuizErrorCode.UNAUTHORIZED,
          },
          { status: 401 }
        );
      }

      // Verify user owns the position
      const position = await prisma.position.findFirst({
        where: {
          id: validatedData.position_id,
          createdBy: user.id,
        },
        select: { id: true },
      });

      if (!position) {
        return NextResponse.json(
          {
            error: "Position not found or access denied",
            code: QuizErrorCode.POSITION_NOT_FOUND,
          },
          { status: 404 }
        );
      }

      // Save quiz to database
      const quiz = await prisma.quiz.create({
        data: {
          title: validatedData.title,
          positionId: position.id,
          questions: convertToStrictQuestions(validatedData.questions),
          timeLimit: validatedData.time_limit,
          createdBy: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!quiz) {
        return NextResponse.json(
          {
            error: "Failed to save quiz to database",
            code: QuizErrorCode.DATABASE_ERROR,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id: quiz.id,
        message: "Quiz saved successfully",
      });
    } catch (error) {
      console.error("Quiz save error:", error);
      const errorResponse = getErrorResponse(error);
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);

export async function POST(req: NextRequest) {
  return saveQuizHandler(req);
}
