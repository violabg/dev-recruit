"use client";

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";

type CodeHighlightProps = {
  code: string;
  language?: string;
  className?: string;
};

export const CodeHighlight = ({
  code,
  language = "javascript",
  className,
}: CodeHighlightProps) => {
  const lines = useHighlightedCode(code, language);

  return (
    <CodeBlock className={className}>
      <CodeBlockHeader>
        <CodeBlockTitle>{language}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
};
