import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/db"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
