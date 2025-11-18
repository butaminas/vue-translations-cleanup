import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'vue-translations-cleanup',
  description: 'Find and remove unused translation keys, extract raw strings to i18n',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Examples', link: '/examples/nuxt-3' },
      { text: 'API', link: '/api/cleanup' },
      {
        text: 'v2.0.0-beta',
        items: [
          { text: 'Changelog', link: 'https://github.com/butaminas/vue-translations-cleanup/blob/main/CHANGELOG.md' },
          { text: 'Contributing', link: 'https://github.com/butaminas/vue-translations-cleanup/blob/main/CONTRIBUTING.md' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is it?', link: '/guide/what-is-it' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Cleanup Mode', link: '/guide/cleanup-mode' },
            { text: 'Extract Mode', link: '/guide/extract-mode' },
            { text: 'AI Features', link: '/guide/ai-features' },
          ]
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Config File', link: '/guide/config-file' },
            { text: 'CLI Options', link: '/guide/cli-options' },
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Framework Examples',
          items: [
            { text: 'Nuxt 3', link: '/examples/nuxt-3' },
            { text: 'Nuxt 4', link: '/examples/nuxt-4' },
            { text: 'Vue 3 + Vite', link: '/examples/vue-3-vite' },
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Custom i18n Patterns', link: '/examples/custom-i18n' },
            { text: 'Monorepo Setup', link: '/examples/monorepo' },
            { text: 'CI/CD Integration', link: '/examples/ci-cd' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Cleanup API', link: '/api/cleanup' },
            { text: 'Extraction API', link: '/api/extraction' },
            { text: 'Configuration Types', link: '/api/config-types' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/butaminas/vue-translations-cleanup' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Mindaugas Kristutis'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/butaminas/vue-translations-cleanup/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
