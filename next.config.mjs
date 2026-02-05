/** @type {import('next').NextConfig} */
const isMobile = process.env.IS_MOBILE === "true";

const nextConfig = {
  reactStrictMode: true,

  // Conditionally enable static export
  output: isMobile ? "export" : undefined,

  // Required for Capacitor: Images cannot be optimized on-the-fly 
  // in a static environment without a server.
  images: {
    unoptimized: isMobile ? true : false,
  },
};

export default nextConfig;