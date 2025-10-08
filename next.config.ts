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
};

export default nextConfig;
