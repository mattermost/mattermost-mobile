import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["bundle/"] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ["*.mjs", "tsup.config.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { files: ["**/*.mjs"], extends: [tseslint.configs.disableTypeChecked] },
  {
    files: ["src/**/*.test.ts"],
    rules: {
      // node:test runs each top-level test it is given; its promise needs no await.
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            { from: "package", package: "node:test", name: ["test", "describe", "it", "suite"] },
          ],
        },
      ],
      // Fakes implement async interfaces without awaiting anything.
      "@typescript-eslint/require-await": "off",
    },
  },
  prettier,
);
