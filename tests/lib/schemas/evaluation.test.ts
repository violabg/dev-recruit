/**
 * Tests for Evaluation Schema
 */

import {
  evaluationResultSchema,
  overallEvaluationSchema,
} from "@/lib/schemas/evaluation";
import { describe, expect, it } from "vitest";

describe("evaluationResultSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid evaluation result", () => {
      const validData = {
        evaluation: "La risposta del candidato è completa e accurata.",
        score: 8,
        strengths: ["Buona comprensione", "Risposta dettagliata"],
        weaknesses: ["Potrebbe essere più conciso"],
      };

      const result = evaluationResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept minimum score of 0", () => {
      const validData = {
        evaluation: "Risposta non fornita",
        score: 0,
        strengths: [],
        weaknesses: ["Nessuna risposta"],
      };

      const result = evaluationResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept maximum score of 10", () => {
      const validData = {
        evaluation: "Risposta perfetta",
        score: 10,
        strengths: ["Eccellente", "Completa"],
        weaknesses: [],
      };

      const result = evaluationResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept empty strengths array", () => {
      const validData = {
        evaluation: "Valutazione",
        score: 3,
        strengths: [],
        weaknesses: ["Area di miglioramento"],
      };

      const result = evaluationResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept empty weaknesses array", () => {
      const validData = {
        evaluation: "Valutazione",
        score: 9,
        strengths: ["Ottimo"],
        weaknesses: [],
      };

      const result = evaluationResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject score below 0", () => {
      const invalidData = {
        evaluation: "Valutazione",
        score: -1,
        strengths: [],
        weaknesses: [],
      };

      const result = evaluationResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject score above 10", () => {
      const invalidData = {
        evaluation: "Valutazione",
        score: 11,
        strengths: [],
        weaknesses: [],
      };

      const result = evaluationResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing evaluation", () => {
      const invalidData = {
        score: 5,
        strengths: [],
        weaknesses: [],
      };

      const result = evaluationResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing score", () => {
      const invalidData = {
        evaluation: "Valutazione",
        strengths: [],
        weaknesses: [],
      };

      const result = evaluationResultSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe("overallEvaluationSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid overall evaluation", () => {
      const validData = {
        evaluation: "Il candidato mostra buone competenze tecniche.",
        strengths: ["Esperienza React", "Problem solving"],
        weaknesses: ["Comunicazione da migliorare"],
        recommendation: "Consigliato per il secondo colloquio",
        fitScore: 75,
      };

      const result = overallEvaluationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept minimum fitScore of 0", () => {
      const validData = {
        evaluation: "Non idoneo",
        strengths: [],
        weaknesses: ["Competenze insufficienti"],
        recommendation: "Non procedere",
        fitScore: 0,
      };

      const result = overallEvaluationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept maximum fitScore of 100", () => {
      const validData = {
        evaluation: "Candidato ideale",
        strengths: ["Perfetto match"],
        weaknesses: [],
        recommendation: "Assumere immediatamente",
        fitScore: 100,
      };

      const result = overallEvaluationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject fitScore below 0", () => {
      const invalidData = {
        evaluation: "Valutazione",
        strengths: [],
        weaknesses: [],
        recommendation: "Raccomandazione",
        fitScore: -1,
      };

      const result = overallEvaluationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject fitScore above 100", () => {
      const invalidData = {
        evaluation: "Valutazione",
        strengths: [],
        weaknesses: [],
        recommendation: "Raccomandazione",
        fitScore: 101,
      };

      const result = overallEvaluationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing recommendation", () => {
      const invalidData = {
        evaluation: "Valutazione",
        strengths: [],
        weaknesses: [],
        fitScore: 50,
      };

      const result = overallEvaluationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing fitScore", () => {
      const invalidData = {
        evaluation: "Valutazione",
        strengths: [],
        weaknesses: [],
        recommendation: "Raccomandazione",
      };

      const result = overallEvaluationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
