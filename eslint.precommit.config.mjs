// Pre-commit ESLint config with stricter rules
import baseConfig from './eslint.config.mjs';

export default [
  ...baseConfig,
  {
    rules: {
      // Override rules to be stricter for pre-commit
      'react-hooks/exhaustive-deps': 'error',
      // Add other strict rules here if needed
      // 'no-console': 'error',
      // '@typescript-eslint/no-unused-vars': 'error',
    },
  },
];
