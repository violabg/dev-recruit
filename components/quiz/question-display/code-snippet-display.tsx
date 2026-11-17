import { BlockLabel } from "@/components/detail-blocks";
import { CodeHighlight } from "@/components/quiz/code-highlight";
import { Badge } from "@/components/ui/badge";

type CodeSnippetDisplayProps = {
  question: {
    codeSnippet?: string;
    sampleSolution?: string;
    language?: string;
  };
};

export const CodeSnippetDisplay = ({ question }: CodeSnippetDisplayProps) => {
  return (
    <div className="flex flex-col gap-3">
      {question.codeSnippet && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <BlockLabel>Snippet di codice</BlockLabel>
            {question.language && (
              <Badge variant="secondary" className="text-xs">
                {question.language}
              </Badge>
            )}
          </div>
          <CodeHighlight
            code={question.codeSnippet}
            language={question.language || "javascript"}
          />
        </div>
      )}
      {question.sampleSolution && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <BlockLabel>Soluzione di esempio</BlockLabel>
            {question.language && (
              <Badge variant="secondary" className="text-xs">
                {question.language}
              </Badge>
            )}
          </div>
          <CodeHighlight
            code={question.sampleSolution}
            language={question.language || "javascript"}
          />
        </div>
      )}
    </div>
  );
};
