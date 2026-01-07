const config = require('@social/config-eslint');

module.exports = {
  ...config,
  rules: {
    ...config.rules,
    'import/order': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
