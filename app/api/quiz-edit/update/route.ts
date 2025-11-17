import { updateQuizAction } from "@/lib/actions/quizzes";
import { withValidation } from "@/lib/middleware/validation";
import { updateQuizRequestSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";

// Quiz update handler using validation middleware
const updateQuizHandler = withValidation(
  { body: updateQuizRequestSchema },
  {},
  async (req, validated) => {
    try {
      const data = validated.body!;

      // Convert to FormData format for compatibility with existing action
      const formData = new FormData();
      formData.append("quiz_id", data.quiz_id);
      formData.append("title", data.title);
      formData.append("time_limit", data.time_limit?.toString() || "");
      formData.append("questions", JSON.stringify(data.questions));
      if (data.instructions) {
        formData.append("instructions", data.instructions);
      }

      await updateQuizAction(formData);
      return NextResponse.json({
        success: true,
        message: "Quiz updated successfully",
      });
    } catch (error) {
      console.error("Quiz update failed:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update quiz",
        },
        { status: 500 }
      );
    }
  }
);

export const POST = updateQuizHandler;
