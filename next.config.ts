import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser-local demo state is a poor fit for Cache Components / PPR.
  cacheComponents: false,
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
