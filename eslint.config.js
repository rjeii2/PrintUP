import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [{
  files: ['**/*.{ts,tsx}'],
  languageOptions: { parser: tsParser },
  plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    '@typescript-eslint/no-explicit-any': 'off'
  }
}];
