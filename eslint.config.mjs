// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineConfig, globalIgnores} from 'eslint/config';
import tseslint from "@typescript-eslint/eslint-plugin";
import * as tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import stylistic from "@stylistic/eslint-plugin";
import {readFileSync} from "node:fs";

// Load custom rulesets
import eslintMattermost, {jestConfig} from "./eslint/eslint-mattermost.mjs";
import eslintReact from "./eslint/eslint-react.mjs";

// Detox's bare element.longPress() is a single tap on Android, so it fires onPress instead of onLongPress.
// Only zero-arg calls match; Gesture.LongPress is excluded by the lower-case property name.
const detoxLongPressRestriction = {
  "selector": "CallExpression[callee.type=\"MemberExpression\"][callee.property.name=\"longPress\"][arguments.length=0]",
  "message": "Pass an explicit duration to longPress() (e.g. .longPress(timeouts.TWO_SEC)). Bare .longPress() with no args resolves to a single tap on Android, firing onPress instead of onLongPress."
};

// Only specs in the mutation manifest may change server-wide state; every other spec runs on a
// shared pool server (the CI pool guard in detox/e2e/support/server_api/pool_guard.ts enforces the same).
const serverMutationSpecs = JSON.parse(readFileSync(new URL("./detox/e2e/server_mutation_specs.json", import.meta.url), "utf8")).mutation.map((entry) => entry.spec);
const serverWideMutators = "apiUpdateConfig|apiPatchConfig|apiReplaceConfig|apiPatchFeatureFlags|apiEnableFeatureFlags|apiUploadLicense|apiEnableABAC|apiCreateCustomProfileAttributeField|apiDeleteCustomProfileAttributeField|apiGetOrCreateCustomProfileAttributeField|apiLDAPSync|apiRequireLDAPServer|apiEnablePluginById|apiDisablePluginById|apiDisableNonPrepackagedPlugins|apiInstallPluginFromUrl|apiInstallPluginFromMarketplace|apiUploadAndEnablePlugin|apiEnsurePluginInstalled|apiRemovePluginById|apiPatchSystemPropertyValues|apiSetupClassificationWithBanner|apiCleanupClassification|apiCreateRemoteCluster|apiDeleteRemoteCluster|apiDeleteAllRemoteClusters|apiEnsureAtLeastOneConfirmedRemoteCluster|apiEnsureSingleRemoteCluster|apiShareChannelWithRemote|apiCreateTermsOfService|apiEnableCustomTermsOfService|apiDisableCustomTermsOfService|apiCreatePermissionPolicy";
const serverWideMutatorMessage = "This changes server-wide state on a shared pool server. Put the expected state in detox/shared/server-baseline.ts, or move the test into its own spec listed in detox/e2e/server_mutation_specs.json.";

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
      "@stylistic": stylistic,
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
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.name=/^(logError|logWarning|logInfo|logDebug)$/] MemberExpression[property.name=/^(email|username|nickname|displayName|display_name|firstName|first_name|lastName|last_name|fullName|full_name|phoneNumber|phone_number)$/]",
          "message": "Do not log PII (names/emails/usernames). Logs are user-exportable and sent to Sentry. Log stable identifiers (IDs, channel type) instead. See CLAUDE.md > Error Handling & Logging."
        },
        {
          "selector": "CallExpression[callee.name=/^(logError|logWarning|logInfo|logDebug)$/] Identifier[name=/([Tt]oken|[Pp]assword|[Ss]ecret)$/]",
          "message": "Do not log credentials (tokens/passwords/secrets). Logs are user-exportable and sent to Sentry. See CLAUDE.md > Error Handling & Logging."
        }
      ],
      "global-require": "off",
      "no-undefined": "off",
      "no-shadow": "off",
      "new-cap": [
        "error", 
        { 
          "capIsNewExceptions": [
            "Gesture.Pan",
            "Gesture.Tap",
            "Gesture.LongPress",
            "Gesture.Pinch",
            "Gesture.Rotate",
            "Gesture.ForceTouch",
            "Gesture.Exclusive",
            "Gesture.Simultaneous",
            "Gesture.Race",
            "Gesture.Native",
          ]
        }
      ],
      "react/display-name": [2, { "ignoreTranspilerName": false }],
      "react/jsx-filename-extension": "off",
      "react-hooks/exhaustive-deps": "error",
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
      "@stylistic/member-delimiter-style": 2,
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "import/order": [
        2,
        {
          "groups": ["builtin", "external", "parent", "sibling", "index", "type"],
          "newlines-between": "always",
          "pathGroups": [
            {
              "pattern": "{@(@actions|@agents|@app|@assets|@calls|@client|@components|@constants|@context|@database|@helpers|@hooks|@init|@keyboard|@managers|@playbooks|@queries|@screens|@selectors|@share|@store|@telemetry|@typings|@test|@utils)/**,@(@agents|@constants|@i18n|@keyboard|@store|@websocket)}",
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
      "no-unused-expressions": "off",
      "no-restricted-syntax": ["error", detoxLongPressRestriction]
    }
  },
  {
    files: ["detox/e2e/test/**/*.e2e.ts"],
    ignores: serverMutationSpecs,
    rules: {
      // Flat config replaces a rule's options wholesale, so the longPress restriction is repeated.
      "no-restricted-syntax": [
        "error",
        detoxLongPressRestriction,
        {"selector": `CallExpression[callee.property.name=/^(${serverWideMutators})$/]`, "message": serverWideMutatorMessage},
        {"selector": `CallExpression[callee.name=/^(${serverWideMutators})$/]`, "message": serverWideMutatorMessage}
      ],
      "no-restricted-imports": [
        "error",
        {
          "patterns": [{
            "group": ["@support/channel_attributes_test_helper", "@support/classification_test_helper"],
            "message": "These helpers toggle server-wide feature flags; only specs in detox/e2e/server_mutation_specs.json may use them."
          }]
        }
      ]
    }
  }
]);
