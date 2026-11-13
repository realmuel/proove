import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Self-contained server (traced deps only) for a much smaller Docker image.
  output: "standalone",
  // The PDF route reads these at runtime via fs, so the tracer can't see them.
  outputFileTracingIncludes: { "/api/recipes/pdf": ["./src/app/fonts/**"] },
};

export default nextConfig;
