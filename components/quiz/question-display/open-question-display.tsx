import { Badge } from "@/components/ui/badge";

type OpenQuestionDisplayProps = {
  question: {
    sampleAnswer?: string;
    keywords?: string[];
  };
};

export const OpenQuestionDisplay = ({ question }: OpenQuestionDisplayProps) => {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">Risposta di esempio:</h3>
      <p className="mt-1 text-muted-foreground text-sm">
        {question.sampleAnswer}
      </p>
      {question.keywords && question.keywords.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="font-medium">Parole chiave:</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {question.keywords.map((keyword: string, kwIndex: number) => (
              <Badge key={kwIndex} variant="secondary">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
