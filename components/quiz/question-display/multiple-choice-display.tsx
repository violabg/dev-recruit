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
      <h3 className="font-medium">Opzioni:</h3>
      <div className="flex flex-col gap-4 mt-2">
        {question.options?.map((option: string, optIndex: number) => {
          const correctAnswer = question.correctAnswer || 0;
          return (
            <div
              key={optIndex}
              className={`flex items-center gap-2 rounded-md border p-2 ${
                correctAnswer === optIndex
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : ""
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  correctAnswer === optIndex
                    ? "border-green-500 bg-green-500 text-white"
                    : ""
                }`}
              >
                {correctAnswer === optIndex && (
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
          <h3 className="font-medium">Spiegazione:</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
