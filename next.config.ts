import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // two root layouts (EN at /, FR at /fr/): the 404 page is its own document, src/app/global-not-found.tsx
  experimental: { globalNotFound: true },
};

export default nextConfig;
