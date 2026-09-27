import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The game drives an imperative three.js scene graph: useFrame callbacks
    // mutate memoised meshes, cameras and the sim runtime every frame, outside
    // React state. That is the intended react-three-fiber pattern, and exactly
    // what the React Compiler's immutability rule forbids.
    files: ["src/game/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // Vendored third-party scripts: the self-hosted MapLibre RTL text plugin
    // and the MapLibre worker bundle copied in by scripts/copy-maplibre-worker.mjs.
    "public/mapbox-gl-rtl-text.js",
    "public/maplibre/**",
  ]),
]);

export default eslintConfig;
