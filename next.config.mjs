/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  typedRoutes: true,
  // Suppress hydration mismatches from Radix UI ID generation in development
  onDemandEntries: {
    maxInactiveAge: 60000,
    pagesBufferLength: 2,
  },
  // cacheComponents: true,
}

export default nextConfig