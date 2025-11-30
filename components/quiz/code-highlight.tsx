"use client";

import { prismLanguage } from "@/lib/utils";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { Highlight, themes } from "prism-react-renderer";

type CodeHighlightProps = {
  code: string;
  language?: string;
  className?: string;
};

const HighlightComponent = ({
  code,
  language = "javascript",
  className,
}: CodeHighlightProps) => {
  const { theme, resolvedTheme } = useTheme();
  const prismTheme =
    resolvedTheme === "dark" || theme === "dark"
      ? themes.vsDark
      : themes.vsLight;

  return (
    <Highlight
      theme={prismTheme}
      code={code}
      language={prismLanguage(language)}
    >
      {({
        className: highlightClassName,
        style,
        tokens,
        getLineProps,
        getTokenProps,
      }) => (
        <pre
          className={
            "mt-1 overflow-x-auto rounded-md bg-muted p-4 text-sm" +
            (highlightClassName ? " " + highlightClassName : "") +
            (className ? " " + className : "")
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
  );
};

export const CodeHighlight = dynamic(
  () => Promise.resolve(HighlightComponent),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted mt-1 p-4 rounded-md h-24 overflow-x-auto text-sm animate-pulse" />
    ),
  }
);
