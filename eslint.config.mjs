// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineConfig, globalIgnores} from 'eslint/config';
import tseslint from "@typescript-eslint/eslint-plugin";
import * as tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import stylisticTs from "@stylistic/eslint-plugin-ts";

// Load custom rulesets
import eslintMattermost, {jestConfig} from "./eslint/eslint-mattermost.mjs";
import eslintReact from "./eslint/eslint-react.mjs";

export default defineConfig([
  globalIgnores([
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    "android/",
    "ios/",
    ".github/",
    "detox/artifacts/",
  ]),
  eslintMattermost,
  jestConfig,
  eslintReact,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        __DEV__: true
      },
      sourceType: "module"
    },
    plugins: {
      "@stylistic/ts": stylisticTs,
      "@typescript-eslint": tseslint,
      "import": importPlugin,
      "react-hooks": reactHooks
    },
    settings: {
      react: {
        pragma: "React",
        version: "detect"
      }
    },
    rules: {
      "eol-last": ["error", "always"],
      "global-require": "off",
      "no-undefined": "off",
      "no-shadow": "off",
      "react/display-name": [2, { "ignoreTranspilerName": false }],
      "react/jsx-filename-extension": "off",
      "react-hooks/exhaustive-deps": "warn",
      "camelcase": ["off", { "properties": "never" }],
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        2,
        {
          vars: "all",
          args: "after-used",
          caughtErrors: "none",
          ignoreRestSiblings: true,
        }
      ],
      "@typescript-eslint/no-shadow": ["error"],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-underscore-dangle": "off",
      "indent": [2, 4, { "SwitchCase": 1 }],
      "key-spacing": [
        2,
        {
          "singleLine": {
            "beforeColon": false,
            "afterColon": true
          }
        }
      ],
      "@stylistic/ts/member-delimiter-style": 2,
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "import/order": [
        2,
        {
          "groups": ["builtin", "external", "parent", "sibling", "index", "type"],
          "newlines-between": "always",
          "pathGroups": [
            {
              "pattern": "{@(@actions|@app|@assets|@calls|@client|@components|@constants|@context|@database|@helpers|@hooks|@init|@managers|@playbooks|@queries|@screens|@selectors|@share|@store|@telemetry|@typings|@test|@utils)/**,@(@constants|@i18n|@store|@websocket)}",
              "group": "external",
              "position": "after"
            },
            {
              "pattern": "app/**",
              "group": "parent",
              "position": "before"
            }
          ],
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true
          },
          "pathGroupsExcludedImportTypes": ["type"]
        }
      ]
    }
  },

  
  {
    files: ["detox/e2e/**"],
    languageOptions: {
      globals: {
        by: true,
        detox: true,
        device: true,
        element: true,
        waitFor: true
      }
    },
    rules: {
      "func-names": "off",
      "import/no-unresolved": "off",
      "max-nested-callbacks": "off",
      "no-process-env": "off",
      "no-unused-expressions": "off"
    }
  }
]);
