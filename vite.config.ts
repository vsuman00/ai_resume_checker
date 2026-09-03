import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  // Keep React Router's framework components and React DOM on the same React
  // instance. Without this, Vite's dependency optimizer can load a second
  // copy in development and hooks used by <Meta /> fail at runtime.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
