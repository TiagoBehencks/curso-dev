import ts from 'typescript-eslint'
import prettierConfigRecommended from 'eslint-plugin-prettier/recommended'
import nextPlugin from '@next/eslint-plugin-next'

const config = [
  {
    ignores: ['.next/*'],
  },
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },
  ...ts.configs.recommended,
  prettierConfigRecommended,
]

export default config
