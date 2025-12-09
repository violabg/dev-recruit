/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: '50mb',
  },
}

export default nextConfig