// ESLint configuration using flat config format
// Note: ESLint has issues with FlatCompat + Next.js plugins in this version
// For now, linting is handled by Next.js built-in lint via next lint command

export default [
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      "coverage/",
      "storybook-static/",
      ".pnpm-store/",
      ".vscode/",
      ".DS_Store",
      "*.tsbuildinfo",
    ],
  },
];
