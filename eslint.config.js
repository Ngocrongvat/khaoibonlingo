// ESLint flat config for KhoaiBonlingo. See eslint.config.js.example for the full rationale.
// This app is vanilla JS loaded as many <script> tags sharing ONE global scope, so per-file
// `no-undef` is impractical and disabled by design; the rules kept are per-file bug catchers.
'use strict';

module.exports = [
    {
        ignores: ['data/**', 'node_modules/**', 'assets/js/**/*.min.js'],
    },
    {
        files: ['assets/js/**/*.js'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
        rules: {
            'no-undef': 'off', // cross-file globals shared via <script> tags
            'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
            'no-dupe-keys': 'error',
            'no-dupe-args': 'error',
            'no-dupe-else-if': 'error',
            'no-duplicate-case': 'error',
            'no-unreachable': 'error',
            'no-cond-assign': ['error', 'always'],
            'no-func-assign': 'error',
            'no-redeclare': 'error',
            'no-self-assign': 'error',
            'no-self-compare': 'error',
            'no-fallthrough': 'error',
            'valid-typeof': 'error',
            'use-isnan': 'error',
            'no-constant-condition': ['warn', { checkLoops: false }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-unsafe-negation': 'error',
        },
    },
    {
        files: ['sw.js'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
        rules: { 'no-unused-vars': 'warn', 'no-dupe-keys': 'error', 'no-unreachable': 'error' },
    },
    {
        files: ['test/**/*.js'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs' },
        rules: {
            'no-unused-vars': ['warn', { args: 'none' }],
            'no-dupe-keys': 'error',
            'no-unreachable': 'error',
        },
    },
];
