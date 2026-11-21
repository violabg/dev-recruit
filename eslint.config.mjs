import nextVitals from 'eslint-config-next/core-web-vitals'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'lib/prisma/**',
    'next-env.d.ts',
    // Generated files
    'coverage/**',
    'env.d.ts',
    'lib/mcp/widgets/html.generated.ts',
    'mcp-apps/dist/**',
    // Agentic system (runtime, records, sessions)
    'agentic-system/**',
    'agentic-system-maintenance/**',
    'agentic-system-sessions/**',
  ]),
])

export default eslintConfig