import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'joppyzwvniwvpsleplzt.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb', // Allow 30 MB to accommodate 25 MB files + FormData overhead
    },
  },
};

export default nextConfig;
