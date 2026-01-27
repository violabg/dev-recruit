import { Badge } from "@/components/ui/badge";

type BehavioralScenarioDisplayProps = {
  question: {
    sampleAnswer?: string;
    keywords?: string[];
  };
};

export const BehavioralScenarioDisplay = ({
  question,
}: BehavioralScenarioDisplayProps) => {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-bold dark:text-primary text-sm">
        Risposta di esempio:
      </h3>
      <p className="mt-1 text-muted-foreground text-sm">
        {question.sampleAnswer}
      </p>
      {question.keywords && question.keywords.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="font-bold dark:text-primary text-sm">
            Temi di valutazione:
          </h3>
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
