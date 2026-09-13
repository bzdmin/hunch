import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @nimiq/core loads its WASM and worker scripts from its own folder at runtime.
  // Bundling it breaks those paths, so it is required natively, and its files are
  // force-included in the server trace because a dynamic import hides them from it.
  serverExternalPackages: ["@nimiq/core"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@nimiq/core/**/*", "./node_modules/comlink/**/*"],
  },
};

export default nextConfig;
