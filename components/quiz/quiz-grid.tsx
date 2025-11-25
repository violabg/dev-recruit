"use client";

import { Quiz } from "@/lib/data/quizzes";
import { QuizCard } from "./quiz-card";

interface QuizGridProps {
  quizzes: Quiz[];
}

export function QuizGrid({ quizzes }: QuizGridProps) {
  return (
    <div className="gap-4 grid grid-cols-1 @[1060px]:grid-cols-2 @[1470px]:grid-cols-3">
      {quizzes.map((quiz) => (
        <QuizCard key={quiz.id} quiz={quiz} />
      ))}
    </div>
  );
}
