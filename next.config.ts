import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** App root so Turbopack does not pick a parent folder’s lockfile (e.g. under the user profile). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  cacheComponents: true,
  /** Evita variantes 2k/4k innecesarias (LCP en marketing hero ~896px de ancho). */
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Tree-shake lucide barrel imports (fewer modules for webpack to trace).
    optimizePackageImports: ["lucide-react"],
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
