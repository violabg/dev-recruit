import { cn } from "@/lib/utils";

type MultipleChoiceDisplayProps = {
  question: {
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
  };
};

export const MultipleChoiceDisplay = ({
  question,
}: MultipleChoiceDisplayProps) => {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-bold text-heading text-sm">Opzioni:</h3>
      <div className="flex flex-col gap-4 mt-2">
        {question.options?.map((option: string, optIndex: number) => {
          const correctAnswer = question.correctAnswer ?? 0;
          const isCorrect = correctAnswer === optIndex;
          return (
            <div
              key={optIndex}
              className={cn(
                "flex items-center gap-2 rounded-md border p-2",
                isCorrect && "border-success bg-success/10",
              )}
            >
              <div
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  isCorrect &&
                    "border-success bg-success text-primary-foreground",
                )}
              >
                {isCorrect && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3 h-3"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              <span>{option}</span>
            </div>
          );
        })}
      </div>
      {question.explanation && (
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="font-bold text-heading text-sm">Spiegazione:</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
