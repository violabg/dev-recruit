import { BlockLabel } from "@/components/detail-blocks";
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
      {question.sampleAnswer && (
        <>
          <BlockLabel>Risposta di esempio</BlockLabel>
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {question.sampleAnswer}
          </p>
        </>
      )}
      {question.keywords && question.keywords.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <BlockLabel>Parole chiave</BlockLabel>
          <div className="flex flex-wrap gap-1 mt-1">
            {question.keywords.map((keyword: string, kwIndex: number) => (
              <Badge key={kwIndex} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
