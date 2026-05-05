import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Pin Turbopack’s resolution root to this app. Otherwise `@import "tailwindcss"` in
// `app/globals.css` can resolve from the parent folder (no package.json / node_modules there).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
