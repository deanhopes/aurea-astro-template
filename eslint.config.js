import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import astroParser from 'astro-eslint-parser';
import astroPlugin from 'eslint-plugin-astro';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// ── Shared TS rules ───────────────────────────────────────────────────
const tsRules = {
  ...tsPlugin.configs.recommended.rules,

  // Correctness
  eqeqeq: ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'no-unused-expressions': 'error',

  // TypeScript strictness
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
  ],

  // Anti-slop: ban patterns AI loves to emit
  'no-lonely-if': 'error', // else { if } → else if
  'no-useless-return': 'error',
  'no-useless-rename': 'error',
  'object-shorthand': 'error', // { foo: foo } → { foo }
  'prefer-template': 'error', // 'a' + b → `a${b}`
  'prefer-destructuring': 'off',
  'no-warning-comments': ['warn', { terms: ['TODO', 'FIXME', 'HACK', 'XXX'] }],
  'no-else-return': 'error',
  'no-implicit-coercion': 'error',
  'no-param-reassign': 'error',
  'no-return-await': 'error',
  'no-throw-literal': 'error',
  'prefer-arrow-callback': 'error',

  // Complexity guards (warn — signal, not block)
  complexity: ['warn', { max: 15 }],
  'max-depth': ['warn', { max: 4 }],
  'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],

  // Design-system erosion: ban hardcoded colors in TS/Astro (use CSS tokens)
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
      message: 'Hex colors belong in CSS token files. Use var(--color-*) or a CSS class.',
    },
  ],
};

export default [
  js.configs.recommended,

  // ── TypeScript ────────────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['**/*.astro/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLVideoElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLUListElement: 'readonly',
        HTMLSpanElement: 'readonly',
        MouseEvent: 'readonly',
        PointerEvent: 'readonly',
        KeyboardEvent: 'readonly',
        WheelEvent: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        requestIdleCallback: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        devicePixelRatio: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        CustomEvent: 'readonly',
        NodeListOf: 'readonly',
        Element: 'readonly',
        ImageBitmap: 'readonly',
        createImageBitmap: 'readonly',
        OffscreenCanvas: 'readonly',
        Worker: 'readonly',
        IdleRequestCallback: 'readonly',
        FontFace: 'readonly',
        Event: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Transferable: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLIFrameElement: 'readonly',
        self: 'readonly',
        getComputedStyle: 'readonly',
        Node: 'readonly',
        MediaQueryListEvent: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsRules,
      // Typed rules — only valid with parserOptions.project set above
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
    },
  },

  // ── Web Worker (no DOM globals, has self/postMessage) ─────────────
  {
    files: ['src/**/*.worker.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        self: 'readonly',
        postMessage: 'readonly',
        console: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        ImageBitmap: 'readonly',
        createImageBitmap: 'readonly',
        OffscreenCanvas: 'readonly',
        MessageEvent: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: tsRules,
  },

  // ── Astro ─────────────────────────────────────────────────────────
  ...astroPlugin.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.astro'],
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // False positive: astro-eslint-parser can't resolve cross-element for/id in .astro
      'jsx-a11y/label-has-associated-control': 'off',
      // Subset of TS rules safe without type-checking in .astro frontmatter
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'object-shorthand': 'error',
      'prefer-template': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Typed rules require parserOptions.project — disable for Astro virtual TS files
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      // Astro-specific anti-slop
      'astro/no-conflict-set-directives': 'error',
      'astro/no-unused-define-vars-in-style': 'error',
      'astro/no-set-html-directive': 'error',
      'astro/prefer-class-list-directive': 'warn',
      'astro/prefer-object-class-list': 'warn',
    },
  },

  // ── Config files (Node env) ───────────────────────────────────────
  {
    files: ['*.config.ts', '*.config.js', '*.config.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      // Floating promises fine in config files
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },

  // ── Import hygiene ────────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.astro'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
    },
    rules: {
      'import-x/no-duplicates': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-cycle': 'warn',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // ── Ignores ───────────────────────────────────────────────────────
  {
    ignores: ['dist/', 'node_modules/', '.astro/', '.worktrees/', '.claude/'],
  },
];
