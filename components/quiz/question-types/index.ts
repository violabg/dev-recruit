export { BehavioralScenarioForm } from "./behavioral-scenario-form";
export { CodeSnippetForm } from "./code-snippet-form";
export { MultipleChoiceForm } from "./multiple-choice-form";
export { OpenQuestionForm } from "./open-question-form";

export // Language mapping for CodeEditor
const getLanguageCode = (language: string): string => {
  const langMap: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "python",
    java: "java",
    "c#": "csharp",
    php: "php",
    ruby: "ruby",
    go: "go",
    swift: "swift",
    kotlin: "kotlin",
  };
  return langMap[language.toLowerCase()] || "js";
};
