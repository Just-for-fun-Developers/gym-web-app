import type { NextConfig } from "next";

const backendInternalUrl =
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5001";
const minioInternalUrl =
  process.env.MINIO_INTERNAL_URL ?? "http://localhost:9000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "macmini", "gym.fratellidevs.com"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendInternalUrl}/api/:path*`,
      },
      {
        source: "/minio/:path*",
        destination: `${minioInternalUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
