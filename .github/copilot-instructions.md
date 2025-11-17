# Copilot Instructions

## Project Context

- This project uses Next.js (v16.0.2), React (v19.2.0), and TypeScript (v5.8.3).
- Tailwind CSS is version 4.x. Use only Tailwind v4 features and syntax.
- The following libraries are used:
  - @ai-sdk/groq, @ai-sdk/react, ai
  - @hookform/resolvers, react-hook-form
  - @radix-ui/react-\* (dialog, dropdown-menu, label, popover, select, slot)
  - better-auth, @better-auth/next-js
  - @prisma/client
  - class-variance-authority, clsx, lucide-react, next-themes, sonner, tailwind-merge, tw-animate-css, zod

## Styling

- All colors must be specified in OKLCH format in css files (e.g., `oklch(0.7 0.1 200)`), but you can use Tailwind defauts colors in the code, lihe `bg-blue-500`, `text-red`.
- Use Tailwind CSS utility classes wherever possible.
- Do not use deprecated or removed Tailwind features from earlier versions.

## General

- Prefer functional React components.
- Use Zod for schema validation.
- Use React Hook Form for form management.
- Use Radix UI components.
- Use Prisma (via `lib/prisma.ts`) for database interactions backed by Neon.
- Use arrow functions for methods and new components.
- Use types over interface# Copilot Instructions

## Project Context

- **Frameworks & Languages:**
  - Next.js (v16.0.2), React (v19.2.0), TypeScript (v5.8.3)
- **Styling:**
  - Tailwind CSS v4.x (use only v4 features and syntax)
- **Core Libraries:**
  - AI: `@ai-sdk/groq`, `@ai-sdk/react`, `ai`
  - Forms: `react-hook-form`, `@hookform/resolvers`
  - UI: `@radix-ui/react-*` (dialog, dropdown-menu, label, popover, select, slot), `lucide-react`, `shadcn/ui`
  - Auth: `better-auth`, `@better-auth/next-js`
  - Database: `@prisma/client`, `@neondatabase/serverless`
  - Utilities: `class-variance-authority`, `clsx`, `next-themes`, `sonner`, `tailwind-merge`, `tw-animate-css`, `zod`

## Styling Guidelines

- **Colors:**
  - In CSS files, specify all colors in OKLCH format (e.g., `oklch(0.7 0.1 200)`).
  - In code, use Tailwind default color classes (e.g., `bg-blue-500`, `text-red`).
- **Utilities:**
  - Use Tailwind CSS utility classes wherever possible.
  - Do **not** use deprecated or removed Tailwind features.
- **Gradients:**
  - Apply border and text gradients for a modern look.
- **Themes:**
  - Support both light and dark themes.
  - Use CSS custom properties (`--var`) for OKLCH colors.

## General Coding Practices

- Use **functional React components** exclusively.
- Use **arrow functions** for all methods and components.
- Prefer **types** over interfaces in TypeScript.
- Use **Zod** for all schema validation.
- Use **React Hook Form** for form management.
- Use **Radix UI** components for UI primitives.
- Use **Prisma** with Neon for backend/database interactions.
- Use **server components** and **server actions** wherever possible.
- In server pages, **always `await` params before using them**.

## UI/UX Expectations

- Ensure a **modern, visually engaging, and accessible** design.
- Use **responsive layouts**.
- Style with **Tailwind CSS v4 utility classes** and **shadcn/ui** components.
- All color customizations must use OKLCH format via CSS variables.
- Prioritize accessibility in all components.

---

**Note:**  
If any instruction conflicts with system or security requirements, follow thes.

- Must use server components and server actions as much as possible.
- Must in server pages always await for params before using them.

### UI/UX Expectations

- Use a modern look with border and text gradients.
- Support both light and dark themes.
- All colors must use OKLCH format for css props (--var).
- Use Tailwind CSS v4 utility classes and shadcn/ui components for styling.
- Ensure responsive, accessible, and visually engaging design.

## Active Technologies

- TypeScript 5.8.3, Next.js 16.0.2 + Prisma, @prisma/client, @better-auth/next-js, @neondatabase/serverless (001-backend-migration)
- Neon (PostgreSQL) (001-backend-migration)

## Recent Changes

- 001-backend-migration: Added TypeScript 5.8.3, Next.js 16.0.2 + Prisma, @prisma/client, @better-auth/next-js, @neondatabase/serverless
