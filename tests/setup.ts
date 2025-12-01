import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// Mock Next.js cache functions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
  unstable_noStore: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

// Mock Next.js headers and cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));

// Mock Prisma client
vi.mock("@/lib/prisma", () => ({
  default: {
    quiz: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    quizQuestion: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    position: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    candidate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    interview: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    evaluation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    preset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({})),
  },
}));

// Mock auth-server
vi.mock("@/lib/auth-server", () => ({
  getCurrentUser: vi.fn(),
  requireUser: vi.fn(),
}));

// Mock environment variables
vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    GROQ_API_KEY: "test-api-key",
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    R2_ACCESS_KEY_ID: "test-r2-key",
    R2_SECRET_ACCESS_KEY: "test-r2-secret",
    R2_ENDPOINT: "https://test.r2.cloudflarestorage.com",
    R2_BUCKET_NAME: "test-bucket",
  },
}));

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.resetAllMocks();
});
