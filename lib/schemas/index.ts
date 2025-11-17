// ====================
// SCHEMA ENTRY POINT
// ====================
// This file serves as the main entry point for all schema definitions.
// The unified schemas provide a single source of truth for validation.

// UNIFIED SCHEMAS (CURRENT - USE THESE)
// ====================================

// Re-export unified base schemas and types
export * from "./base";

// Re-export unified question schemas and types
export * from "./question";

// Re-export unified quiz schemas and types
export * from "./quiz";

// DOMAIN-SPECIFIC SCHEMAS
// ======================

// Re-export authentication schemas and types
export * from "./auth";

// Re-export profile schemas and types
export * from "./profile";

// Re-export position schemas and types
export * from "./position";

// Re-export AI generation schemas and types
export * from "./ai";

// Re-export candidate schemas and types
export * from "./candidate";

// Re-export assignment schemas and types
export * from "./assignment";

// Re-export evaluation schemas and types
export * from "./evaluation";

// ====================
// UTILITY EXPORTS
// ====================
// Common utilities and type helpers

// Re-export any utility types or functions needed across the application
export type {
  CandidateStatus,
  ContractType,
  ExperienceLevel,
  InterviewStatus,
  QuestionType,
} from "./base";
