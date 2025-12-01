import { Button } from "@/components/ui/button";
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
    <Button variant={variant} size={size} className={className} asChild>
      <Link href="/dashboard/quizzes/new">
        <Plus className="mr-1 size-4" />
        Nuovo quiz
      </Link>
    </Button>
  );
}
