import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
// import istanbul from "vite-plugin-istanbul";

export default defineConfig({
  base: '/PackageNest/',
  plugins: [
    react(),
    nodePolyfills({
      // Configuration options (optional)
      protocolImports: true, // Enable protocol imports (e.g., `node:fs`)
    }),
    // istanbul({
    //   include: ["src/*/.{ts,tsx}"], // Include all TypeScript and TSX files in src
    //   exclude: ["node_modules", "tests", "coverage"], // Exclude specific folders
    //   extension: [".ts", ".tsx"],
    //   requireEnv: false
    // })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      fs: 'rollup-plugin-node-builtins',
    },
  },
});
