/** @type {import('next').NextConfig} */
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ||
  "https://vehndr-api-9f3b664fe80f.herokuapp.com";

const nextConfig = {
  compress: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
      {
        source: "/cable",
        destination: `${API_PROXY_TARGET}/cable`,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400, // 24 hours
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["@vercel/analytics"],
  },
};

export default nextConfig;
