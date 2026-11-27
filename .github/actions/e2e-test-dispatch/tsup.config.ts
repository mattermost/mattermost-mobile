import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "bundle",
    format: ["esm"],
    target: "node26",
    clean: true,
    minify: false,
    sourcemap: false,
    splitting: false,
    bundle: true,
    noExternal: [/.*/],
});
