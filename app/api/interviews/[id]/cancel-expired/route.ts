import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { invalidateInterviewCacheInRouteHandler } from "@/lib/utils/cache-utils";
import { NextResponse } from "next/server";

/**
 * POST /api/interviews/[id]/cancel-expired
 * Checks if an interview has expired based on timeLimit and cancels it if so.
 * Called from client-side when viewing an in-progress interview.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;

    const interview = await prisma.interview.findFirst({
      where: { id },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        quiz: {
          select: {
            timeLimit: true,
          },
        },
      },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Check if interview should be cancelled due to expiry
    const shouldCancel =
      interview.startedAt &&
      !interview.completedAt &&
      interview.status !== "cancelled" &&
      interview.status !== "completed" &&
      interview.quiz.timeLimit &&
      interview.quiz.timeLimit > 0;

    if (!shouldCancel) {
      return NextResponse.json({ cancelled: false, status: interview.status });
    }

    const startTime = new Date(interview.startedAt!).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / (1000 * 60);

    if (elapsedMinutes > interview.quiz.timeLimit!) {
      await prisma.interview.update({
        where: { id: interview.id },
        data: {
          status: "cancelled",
        },
      });

      await invalidateInterviewCacheInRouteHandler({
        interviewId: interview.id,
      });

      return NextResponse.json({ cancelled: true, status: "cancelled" });
    }

    return NextResponse.json({ cancelled: false, status: interview.status });
  } catch (error) {
    console.error("Error checking interview expiry:", error);
    return NextResponse.json(
      { error: "Failed to check interview expiry" },
      { status: 500 }
    );
  }
}
