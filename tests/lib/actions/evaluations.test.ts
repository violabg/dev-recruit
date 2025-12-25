import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  evaluateAnswer,
  generateOverallEvaluation,
} from "../../../lib/actions/evaluations";

// Mock dependencies
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((config) => config),
  },
  wrapLanguageModel: vi.fn((config) => config.model),
}));

vi.mock("@ai-sdk/groq", () => ({
  groq: vi.fn((model) => model),
}));

vi.mock("../../../lib/utils", () => ({
  getOptimalModel: vi.fn(() => "test-model"),
  isDevelopment: true,
}));

vi.mock("../../../lib/services/logger", () => ({
  aiLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("evaluations actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateAnswer", () => {
    describe("multiple choice questions", () => {
      it("evaluates correct answer", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation:
              "Risposta corretta che dimostra comprensione del concetto",
            score: 9,
            strengths: ["Scelta corretta", "Comprensione del concetto"],
            weaknesses: [],
          },
        });

        const question = {
          type: "multiple_choice" as const,
          question: "Qual è il paradigma principale di React?",
          options: [
            "Dichiarativo",
            "Imperativo",
            "Funzionale puro",
            "Orientato agli oggetti",
          ],
          correctAnswer: 0,
          explanation: "React usa un approccio dichiarativo",
        };

        const result = await evaluateAnswer(question, "0");

        expect(result.score).toBe(9);
        expect(result.maxScore).toBe(10);
        expect(result.strengths).toContain("Scelta corretta");
        expect(generateText).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: 0.0,
            seed: 42,
          })
        );
      });

      it("evaluates incorrect answer", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Risposta errata, il concetto non è stato compreso",
            score: 2,
            strengths: [],
            weaknesses: ["Scelta errata", "Confusione sui paradigmi"],
          },
        });

        const question = {
          type: "multiple_choice" as const,
          question: "Qual è il paradigma principale di React?",
          options: [
            "Dichiarativo",
            "Imperativo",
            "Funzionale puro",
            "Orientato agli oggetti",
          ],
          correctAnswer: 0,
        };

        const result = await evaluateAnswer(question, "1");

        expect(result.score).toBe(2);
        expect(result.weaknesses.length).toBeGreaterThan(0);
      });

      it("handles invalid answer index", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Nessuna opzione valida selezionata",
            score: 0,
            strengths: [],
            weaknesses: ["Risposta non valida"],
          },
        });

        const question = {
          type: "multiple_choice" as const,
          question: "Test question",
          options: ["A", "B", "C"],
          correctAnswer: 0,
        };

        const result = await evaluateAnswer(question, "5");

        expect(result.score).toBe(0);
      });

      it("includes explanation in evaluation prompt", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Buona risposta",
            score: 8,
            strengths: ["Corretto"],
            weaknesses: [],
          },
        });

        const question = {
          type: "multiple_choice" as const,
          question: "Test?",
          options: ["A", "B"],
          correctAnswer: 0,
          explanation: "Detailed explanation here",
        };

        await evaluateAnswer(question, "0");

        const callArgs = (generateText as any).mock.calls[0][0];
        expect(callArgs.prompt).toContain("Detailed explanation here");
      });
    });

    describe("open questions", () => {
      it("evaluates open question with keywords", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation:
              "Risposta completa e accurata che copre tutti i concetti chiave",
            score: 9,
            strengths: [
              "Completezza",
              "Chiarezza",
              "Uso corretto delle parole chiave",
            ],
            weaknesses: ["Potrebbe includere più esempi pratici"],
          },
        });

        const question = {
          type: "open_question" as const,
          question: "Spiega il Virtual DOM in React",
          keywords: [
            "virtual DOM",
            "riconciliazione",
            "diffing",
            "performance",
          ],
          sampleAnswer: "Il Virtual DOM è una rappresentazione in memoria...",
        };

        const answer =
          "Il Virtual DOM è una tecnica usata da React per ottimizzare le performance. Funziona creando una copia virtuale del DOM reale e usa un algoritmo di diffing per identificare i cambiamenti necessari attraverso la riconciliazione.";

        const result = await evaluateAnswer(question, answer);

        expect(result.score).toBeGreaterThan(7);
        expect(result.strengths.length).toBeGreaterThan(0);
      });

      it("includes keywords in prompt", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Test",
            score: 8,
            strengths: ["Good"],
            weaknesses: [],
          },
        });

        const question = {
          type: "open_question" as const,
          question: "Explain React hooks",
          keywords: ["useState", "useEffect", "lifecycle"],
        };

        await evaluateAnswer(
          question,
          "React hooks allow functional components..."
        );

        const callArgs = (generateText as any).mock.calls[0][0];
        expect(callArgs.prompt).toContain("useState");
        expect(callArgs.prompt).toContain("useEffect");
        expect(callArgs.prompt).toContain("lifecycle");
      });

      it("evaluates depth and completeness", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Risposta superficiale",
            score: 4,
            strengths: ["Parzialmente corretto"],
            weaknesses: [
              "Manca approfondimento",
              "Non copre tutti gli aspetti",
            ],
          },
        });

        const question = {
          type: "open_question" as const,
          question: "Spiega il Virtual DOM",
        };

        const result = await evaluateAnswer(question, "È veloce");

        expect(result.score).toBeLessThan(6);
        expect(result.weaknesses.length).toBeGreaterThan(0);
      });
    });

    describe("code snippet questions", () => {
      it("evaluates code correctness", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Codice corretto e ben strutturato",
            score: 9,
            strengths: [
              "Soluzione corretta",
              "Codice leggibile",
              "Gestione errori",
            ],
            weaknesses: ["Potrebbe ottimizzare la complessità"],
          },
        });

        const question = {
          type: "code_snippet" as const,
          question: "Implementa una funzione per invertire una stringa",
          language: "javascript",
          codeSnippet: "function reverse(str) {\n  // TODO\n}",
          sampleSolution:
            "function reverse(str) {\n  return str.split('').reverse().join('');\n}",
        };

        const answer =
          "function reverse(str) {\n  return str.split('').reverse().join('');\n}";

        const result = await evaluateAnswer(question, answer);

        expect(result.score).toBeGreaterThan(7);
        expect(result.strengths.length).toBeGreaterThan(0);
      });

      it("includes language in prompt", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Test",
            score: 8,
            strengths: ["Good"],
            weaknesses: [],
          },
        });

        const question = {
          type: "code_snippet" as const,
          question: "Fix the bug",
          language: "typescript",
          codeSnippet: "const x: number = '5';",
        };

        await evaluateAnswer(question, "const x: number = 5;");

        const callArgs = (generateText as any).mock.calls[0][0];
        expect(callArgs.prompt).toContain("typescript");
      });

      it("evaluates bug fixes", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Bug identificato e corretto correttamente",
            score: 10,
            strengths: ["Bug identificato", "Soluzione corretta"],
            weaknesses: [],
          },
        });

        const question = {
          type: "code_snippet" as const,
          question: "Trova e correggi il bug",
          language: "javascript",
          codeSnippet:
            "for (var i = 0; i < 5; i++) {\n  setTimeout(() => console.log(i), 100);\n}",
          sampleSolution:
            "for (let i = 0; i < 5; i++) {\n  setTimeout(() => console.log(i), 100);\n}",
        };

        const answer =
          "for (let i = 0; i < 5; i++) {\n  setTimeout(() => console.log(i), 100);\n}";

        const result = await evaluateAnswer(question, answer);

        expect(result.score).toBe(10);
      });
    });

    describe("error handling", () => {
      it("throws error when question is missing", async () => {
        await expect(evaluateAnswer(null as any, "answer")).rejects.toThrow(
          "Missing required fields"
        );
      });

      it("throws error when answer is missing", async () => {
        const question = {
          type: "multiple_choice" as const,
          question: "Test",
          options: ["A", "B"],
          correctAnswer: 0,
        };

        await expect(evaluateAnswer(question, "")).rejects.toThrow(
          "Missing required fields"
        );
      });

      it("uses fallback model when primary fails", async () => {
        const { generateText } = await import("ai");
        const { aiLogger } = await import("../../../lib/services/logger");

        (generateText as any)
          .mockRejectedValueOnce(new Error("Primary model failed"))
          .mockResolvedValueOnce({
            output: {
              evaluation: "Fallback evaluation",
              score: 7,
              strengths: ["OK"],
              weaknesses: [],
            },
          });

        const question = {
          type: "multiple_choice" as const,
          question: "Test",
          options: ["A", "B"],
          correctAnswer: 0,
        };

        const result = await evaluateAnswer(question, "0");

        expect(result.score).toBe(7);
        expect(aiLogger.warn).toHaveBeenCalledWith(
          "Primary model failed for evaluation, trying fallback",
          expect.any(Object)
        );
      });

      it("throws error when both models fail", async () => {
        const { generateText } = await import("ai");
        const { aiLogger } = await import("../../../lib/services/logger");

        (generateText as any)
          .mockRejectedValueOnce(new Error("Primary failed"))
          .mockRejectedValueOnce(new Error("Fallback failed"));

        const question = {
          type: "multiple_choice" as const,
          question: "Test",
          options: ["A", "B"],
          correctAnswer: 0,
        };

        await expect(evaluateAnswer(question, "0")).rejects.toThrow(
          "Evaluation failed"
        );

        expect(aiLogger.error).toHaveBeenCalledWith(
          "Fallback model also failed for evaluation",
          expect.any(Object)
        );
      });

      it("handles rate limit errors", async () => {
        const { generateText } = await import("ai");

        (generateText as any)
          .mockRejectedValueOnce(new Error("rate limit"))
          .mockRejectedValueOnce(new Error("rate limit exceeded"));

        const question = {
          type: "multiple_choice" as const,
          question: "Test",
          options: ["A", "B"],
          correctAnswer: 0,
        };

        await expect(evaluateAnswer(question, "0")).rejects.toThrow(
          "Rate limit exceeded"
        );
      });

      it("handles internal server errors", async () => {
        const { generateText } = await import("ai");

        (generateText as any)
          .mockRejectedValueOnce(new Error("Internal Server Error"))
          .mockRejectedValueOnce(new Error("Internal Server Error"));

        const question = {
          type: "multiple_choice" as const,
          question: "Test",
          options: ["A", "B"],
          correctAnswer: 0,
        };

        await expect(evaluateAnswer(question, "0")).rejects.toThrow(
          "AI service is experiencing issues"
        );
      });
    });

    describe("deterministic evaluation", () => {
      it("uses zero temperature for reproducibility", async () => {
        const { generateText } = await import("ai");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Test",
            score: 8,
            strengths: ["Good"],
            weaknesses: [],
          },
        });

        const question = {
          type: "multiple_choice" as const,
          question: "Test",
          options: ["A", "B"],
          correctAnswer: 0,
        };

        await evaluateAnswer(question, "0");

        const callArgs = (generateText as any).mock.calls[0][0];
        expect(callArgs.temperature).toBe(0.0);
        expect(callArgs.seed).toBe(42);
      });

      it("uses specific model when provided", async () => {
        const { generateText } = await import("ai");
        const { getOptimalModel } = await import("../../../lib/utils");

        (generateText as any).mockResolvedValueOnce({
          output: {
            evaluation: "Test",
            score: 8,
            strengths: ["Good"],
            weaknesses: [],
          },
        });

        const question = {
          type: "multiple_choice" as const,
          question: "Test",
          options: ["A", "B"],
          correctAnswer: 0,
        };

        await evaluateAnswer(question, "0", "custom-model");

        expect(getOptimalModel).toHaveBeenCalledWith(
          "evaluation",
          "custom-model"
        );
      });
    });
  });

  describe("generateOverallEvaluation", () => {
    it("generates overall evaluation successfully", async () => {
      const { generateText } = await import("ai");

      (generateText as any).mockResolvedValueOnce({
        output: {
          evaluation: "Valutazione complessiva positiva",
          strengths: ["Buona conoscenza tecnica", "Risponde bene"],
          weaknesses: ["Potrebbe approfondire alcuni concetti"],
          recommendation: "Procedere al colloquio tecnico",
          fitScore: 85,
        },
      });

      const evaluations = {
        q1: {
          evaluation: "Buona risposta",
          score: 8,
          strengths: ["Corretto"],
          weaknesses: [],
        },
        q2: {
          evaluation: "Ottima risposta",
          score: 9,
          strengths: ["Completo"],
          weaknesses: [],
        },
      };

      await generateOverallEvaluation("Mario Rossi", 2, 2, 85, evaluations);

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.0,
          seed: 42,
        })
      );

      const callArgs = (generateText as any).mock.calls[0][0];
      expect(callArgs.prompt).toContain("Mario Rossi");
      expect(callArgs.prompt).toContain("85");
    });
  });
});
