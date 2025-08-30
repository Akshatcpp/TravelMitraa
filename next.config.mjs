// next.config.mjs OR next.config.js
import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  dest: "public", // will create public/ if it doesn't exist
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // PWA only in prod
})({
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
});

export default nextConfig;
