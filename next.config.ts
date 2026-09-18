import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @nimiq/core loads its WASM and worker scripts from its own folder at runtime.
  // Bundling it breaks those paths, so it is required natively, and its files are
  // force-included in the server trace because a dynamic import hides them from it.
  serverExternalPackages: ["@nimiq/core"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@nimiq/core/**/*", "./node_modules/comlink/**/*"],
  },
  // iOS requests apple-touch-icon-precomposed.png or explicit dimension variants without reading <link>.
  async rewrites() {
    return [
      { source: "/apple-touch-icon-precomposed.png", destination: "/apple-touch-icon.png" },
      { source: "/apple-touch-icon-180x180.png", destination: "/apple-touch-icon.png" },
      { source: "/apple-touch-icon-120x120.png", destination: "/apple-touch-icon.png" },
    ];
  },
};

export default nextConfig;
