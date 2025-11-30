"use client";

import { Badge } from "@/components/ui/badge";
import { prismLanguage } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Highlight, themes } from "prism-react-renderer";

type CodeSnippetDisplayProps = {
  question: {
    codeSnippet?: string;
    sampleSolution?: string;
    language?: string;
  };
};

export const CodeSnippetDisplay = ({ question }: CodeSnippetDisplayProps) => {
  const { theme, resolvedTheme } = useTheme();
  const prismTheme =
    resolvedTheme === "dark" || theme === "dark"
      ? themes.vsDark
      : themes.vsLight;
  return (
    <div className="space-y-3">
      {question.codeSnippet && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Snippet di codice:</h3>
            {question.language && (
              <Badge variant="secondary" className="text-xs">
                {question.language}
              </Badge>
            )}
          </div>
          <Highlight
            theme={prismTheme}
            code={question.codeSnippet}
            language={prismLanguage(question.language || "javascript")}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={
                  "mt-1 overflow-x-auto rounded-md bg-muted p-4 text-sm" +
                  className
                }
                style={style}
              >
                <code className="wrap-break-word whitespace-pre-wrap">
                  {tokens.map((line, i) => {
                    const { key: lineKey, ...lineProps } = getLineProps({
                      line,
                      key: i,
                    });
                    return (
                      <div key={String(lineKey)} {...lineProps}>
                        {line.map((token, key) => {
                          const { key: tokenKey, ...rest } = getTokenProps({
                            token,
                            key,
                          });
                          return <span key={String(tokenKey)} {...rest} />;
                        })}
                      </div>
                    );
                  })}
                </code>
              </pre>
            )}
          </Highlight>
        </div>
      )}
      {question.sampleSolution && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Soluzione di esempio:</h3>
            {question.language && (
              <Badge variant="secondary" className="text-xs">
                {question.language}
              </Badge>
            )}
          </div>
          <Highlight
            theme={prismTheme}
            code={question.sampleSolution}
            language={prismLanguage(question.language || "javascript")}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={
                  "mt-1 overflow-x-auto rounded-md bg-muted p-4 text-sm" +
                  className
                }
                style={style}
              >
                <code className="wrap-break-word whitespace-pre-wrap">
                  {tokens.map((line, i) => {
                    const { key: lineKey, ...lineProps } = getLineProps({
                      line,
                      key: i,
                    });
                    return (
                      <div key={String(lineKey)} {...lineProps}>
                        {line.map((token, key) => {
                          const { key: tokenKey, ...rest } = getTokenProps({
                            token,
                            key,
                          });
                          return <span key={String(tokenKey)} {...rest} />;
                        })}
                      </div>
                    );
                  })}
                </code>
              </pre>
            )}
          </Highlight>
        </div>
      )}
    </div>
  );
};
