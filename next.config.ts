import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'polymarket-upload.s3.us-east-2.amazonaws.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'abs.twimg.com' },
      { protocol: 'https', hostname: 'kalshi.com' },
      { protocol: 'https', hostname: 'kalshi-social-public.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'polynoob.com' },
      { protocol: 'https', hostname: 'predicting.top' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;

