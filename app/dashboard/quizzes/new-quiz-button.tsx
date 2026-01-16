import { buttonVariants } from "@/components/ui/button";

import { Plus } from "lucide-react";
import Link from "next/link";

type NewQuizButtonProps = {
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
};

/**
 * Reusable button component for creating a new quiz
 * Used in both page header and empty state
 */
export function NewQuizButton({
  size = "sm",
  variant = "default",
  className,
}: NewQuizButtonProps) {
  return (
    <Link
      href="/dashboard/quizzes/new"
      className={buttonVariants({ variant, size, className })}
    >
      <Plus className="mr-1 size-4" />
      Nuovo quiz
    </Link>
  );
}
