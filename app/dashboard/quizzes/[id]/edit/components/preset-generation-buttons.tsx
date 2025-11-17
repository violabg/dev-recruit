"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";

import { QuestionType } from "@/lib/schemas";
import {
  Brain,
  Code,
  Database,
  Layers,
  Lightbulb,
  Settings,
  Shield,
  Target,
  Zap,
} from "lucide-react";
import { useState } from "react";

// Preset configurations based on common patterns
const presets: PresetConfig[] = [
  // Frontend Presets
  {
    id: "react-hooks",
    label: "React Hooks Expert",
    description: "Advanced React hooks and state management",
    icon: Code,
    type: "multiple_choice",
    options: {
      focusAreas: [
        "React Hooks",
        "useEffect",
        "Custom Hooks",
        "State Management",
      ],
      distractorComplexity: "complex",
      instructions: "Focus on advanced React hooks patterns and best practices",
    },
    tags: ["React", "Hooks", "Advanced"],
    difficulty: 4,
  },
  {
    id: "typescript-mastery",
    label: "TypeScript Mastery",
    description: "Complex type system and generics",
    icon: Shield,
    type: "code_snippet",
    options: {
      language: "typescript",
      bugType: "syntax",
      codeComplexity: "advanced",
      includeComments: true,
      instructions: "Test advanced TypeScript type system knowledge",
    },
    tags: ["TypeScript", "Types", "Advanced"],
    difficulty: 4,
  },
  {
    id: "frontend-performance",
    label: "Frontend Performance",
    description: "Optimization techniques and best practices",
    icon: Zap,
    type: "open_question",
    options: {
      requireCodeExample: true,
      expectedResponseLength: "medium",
      evaluationCriteria: [
        "performance optimization",
        "bundle size",
        "loading speed",
      ],
      instructions: "Focus on real-world frontend performance challenges",
    },
    tags: ["Performance", "Optimization"],
    difficulty: 3,
  },

  // Backend Presets
  {
    id: "api-design",
    label: "API Design",
    description: "RESTful API architecture and best practices",
    icon: Layers,
    type: "multiple_choice",
    options: {
      focusAreas: ["REST API", "HTTP Methods", "Status Codes", "API Design"],
      distractorComplexity: "moderate",
      instructions: "Test understanding of scalable API design principles",
    },
    tags: ["API", "REST", "Backend"],
    difficulty: 3,
  },
  {
    id: "database-optimization",
    label: "Database Expert",
    description: "Query optimization and database design",
    icon: Database,
    type: "code_snippet",
    options: {
      language: "sql",
      bugType: "performance",
      codeComplexity: "intermediate",
      includeComments: false,
      instructions: "Focus on query optimization and indexing strategies",
    },
    tags: ["Database", "SQL", "Performance"],
    difficulty: 4,
  },
  {
    id: "security-awareness",
    label: "Security Expert",
    description: "Security vulnerabilities and mitigation",
    icon: Shield,
    type: "code_snippet",
    options: {
      language: "javascript",
      bugType: "security",
      codeComplexity: "advanced",
      includeComments: false,
      instructions: "Identify and fix security vulnerabilities",
    },
    tags: ["Security", "Vulnerabilities"],
    difficulty: 4,
  },

  // General Presets
  {
    id: "problem-solving",
    label: "Problem Solver",
    description: "Algorithm and logic challenges",
    icon: Brain,
    type: "open_question",
    options: {
      requireCodeExample: true,
      expectedResponseLength: "long",
      evaluationCriteria: [
        "algorithm efficiency",
        "code clarity",
        "edge cases",
      ],
      instructions: "Test algorithmic thinking and problem-solving approach",
    },
    tags: ["Algorithms", "Logic"],
    difficulty: 3,
  },
  {
    id: "system-design",
    label: "System Design",
    description: "Architecture and scalability",
    icon: Settings,
    type: "open_question",
    options: {
      requireCodeExample: false,
      expectedResponseLength: "long",
      evaluationCriteria: ["scalability", "architecture", "trade-offs"],
      instructions: "Design a scalable system architecture",
    },
    tags: ["Architecture", "Scalability"],
    difficulty: 4,
  },
  {
    id: "best-practices",
    label: "Best Practices",
    description: "Code quality and maintainability",
    icon: Target,
    type: "multiple_choice",
    options: {
      focusAreas: ["Code Quality", "SOLID Principles", "Design Patterns"],
      distractorComplexity: "moderate",
      instructions: "Test knowledge of software engineering best practices",
    },
    tags: ["Best Practices", "Clean Code"],
    difficulty: 3,
  },
];

type PresetGenerationButtonsProps = {
  onGeneratePreset: (
    type: QuestionType,
    preset: string,
    options: any
  ) => Promise<void>;
  loading: boolean;
  position: {
    title: string;
    experience_level: string;
    skills: string[];
  };
};

type PresetConfig = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  type: QuestionType;
  options: any;
  tags: string[];
  difficulty: number;
};

export const PresetGenerationButtons = ({
  onGeneratePreset,
  loading,
  position,
}: PresetGenerationButtonsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Detect technology focus from position skills
  const skills = position.skills.map((s) => s.toLowerCase());
  const isFrontend = skills.some(
    (s) =>
      s.includes("react") ||
      s.includes("vue") ||
      s.includes("angular") ||
      s.includes("frontend") ||
      s.includes("ui") ||
      s.includes("css")
  );
  const isBackend = skills.some(
    (s) =>
      s.includes("node") ||
      s.includes("express") ||
      s.includes("api") ||
      s.includes("backend") ||
      s.includes("server") ||
      s.includes("database")
  );
  const isFullStack = isFrontend && isBackend;

  // Filter presets based on position type
  const getRelevantPresets = () => {
    if (isFullStack) {
      return presets; // Show all presets for full-stack developers
    } else if (isFrontend) {
      return presets.filter((preset) =>
        preset.tags.some((tag) =>
          [
            "React",
            "TypeScript",
            "Performance",
            "Frontend",
            "Best Practices",
            "Algorithms",
          ].includes(tag)
        )
      );
    } else if (isBackend) {
      return presets.filter((preset) =>
        preset.tags.some((tag) =>
          [
            "API",
            "Database",
            "Security",
            "Backend",
            "Best Practices",
            "Architecture",
            "Algorithms",
          ].includes(tag)
        )
      );
    } else {
      // General presets for unclear position type
      return presets.filter((preset) =>
        preset.tags.some((tag) =>
          ["Best Practices", "Algorithms", "Logic"].includes(tag)
        )
      );
    }
  };

  const relevantPresets = getRelevantPresets();

  const handlePresetClick = async (preset: PresetConfig) => {
    await onGeneratePreset(preset.type, preset.id, {
      ...preset.options,
      difficulty: preset.difficulty,
      llmModel: "llama-3.3-70b-versatile",
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Smart Question Presets
          </CardTitle>
          <CardDescription>
            <CollapsibleTrigger asChild>
              <Button variant="outline">
                Generate targeted questions based on {position.title}{" "}
                requirements
                <ChevronsUpDown />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {relevantPresets.map((preset) => {
                const IconComponent = preset.icon;
                return (
                  <Button
                    key={preset.id}
                    variant="outline"
                    className="flex flex-col items-start hover:bg-accent p-4 h-auto text-left"
                    onClick={() => handlePresetClick(preset)}
                    disabled={loading}
                  >
                    <div className="flex items-center gap-2 mb-2 w-full">
                      <IconComponent className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">
                        {preset.label}
                      </span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Level {preset.difficulty}
                      </Badge>
                    </div>
                    <p className="mb-2 text-muted-foreground text-xs">
                      {preset.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {preset.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="px-1 py-0 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Quick tip */}
            <div className="bg-muted mt-4 p-3 rounded-lg">
              <p className="text-muted-foreground text-sm">
                💡 <strong>Tip:</strong> These presets use optimized parameters
                for each question type. You can customize them further in the
                advanced generation dialog.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
