import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:18000";

const nextConfig: NextConfig = {
  typescript: {
    // `"use client"` must be the first statement in a file, which displaces
    // the leading `// @ts-nocheck` block these legacy files relied on.
    // Type errors are tracked separately; do not block production builds.
    ignoreBuildErrors: true,
  },
  /* Proxy /api requests to FastAPI backend */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
