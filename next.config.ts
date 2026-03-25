import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default varlockNextConfigPlugin()(nextConfig);
