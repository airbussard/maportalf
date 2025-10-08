import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
