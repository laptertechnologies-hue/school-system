import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: ["*.laptertech.store", "*.portal.laptertech.store", "*.schoolpro.ug", "localhost:3000"],
    },
  },
};

export default nextConfig;
