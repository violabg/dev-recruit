import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Phase 1 renamed "Colloqui" (the quiz) to "Test": keep the old URLs working
  async redirects() {
    return [
      {
        source: "/dashboard/interviews",
        destination: "/dashboard/assessments",
        permanent: true,
      },
      {
        source: "/dashboard/interviews/:id",
        destination: "/dashboard/assessments/:id",
        permanent: true,
      },
    ];
  },
  cacheComponents: true,
  // Prefetch the static App Shell of each route (Next.js 16.3+).
  // Will become the default (and the option removed) in the next major.
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
