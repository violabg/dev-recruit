import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  cacheComponents: true,
  // Prefetch the static App Shell of each route (Next.js 16.3+).
  // Will become the default (and the option removed) in the next major.
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  // Interview links sent before the route was renamed used the misspelt path.
  async redirects() {
    return [
      {
        source: "/recruting/:path*",
        destination: "/recruiting/:path*",
        permanent: true,
      },
      { source: "/recruting", destination: "/recruiting", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
