import type { Config } from '@docusaurus/types'
import type { Options as PresetClassicOptions, ThemeConfig } from '@docusaurus/preset-classic'
import { themes } from 'prism-react-renderer'
import projectConfig, { getGitHubUrls } from './project.config'

const lightCodeTheme = themes.github
const darkCodeTheme = themes.vsDark

// Generate GitHub links from project configuration
const githubUrls = getGitHubUrls(projectConfig)
// GitHub Pages 项目站点的公开地址包含仓库子路径，用于生成正确的 SEO 链接。
const siteUrl = new URL(projectConfig.deployment.baseUrl, projectConfig.deployment.url)
  .toString()
  .replace(/\/$/, '')
const siteAssetUrl = (path: string) => `${siteUrl}/${path.replace(/^\/+/, '')}`

const config: Config = {
  title: projectConfig.title,
  tagline: projectConfig.tagline,
  favicon: 'img/favicon.png',

  // Set the production url of your site here
  url: projectConfig.deployment.url,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: projectConfig.deployment.baseUrl,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: projectConfig.docsGithub.username,
  projectName: projectConfig.docsGithub.repoName,

  // check links and markdown links
  // if the link is broken, it will throw an error during build
  // if the markdown link is broken, it will show a warning during build
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  // Metadata for SEO
  headTags: [
    // Basic SEO
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content: projectConfig.description,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'Agentic AI, Agent Framework, ReactAgent, Graph Core, Multi-Agent, Java AI, 智能体, 工作流编排, Context Engineering, AI Agent开发',
      },
    },
    // Open Graph / Facebook
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:url',
        content: siteUrl,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:title',
        content: 'Agentic AI - Agentic AI Framework for Java Developers',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:description',
        content: projectConfig.description,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image',
        content: siteAssetUrl('img/social-card.jpg'),
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:site_name',
        content: 'Agentic AI',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:locale',
        content: 'zh_CN',
      },
    },
    // Twitter
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:title',
        content: 'Agentic AI - Agentic AI Framework for Java Developers',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:description',
        content: projectConfig.description,
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:image',
        content: siteAssetUrl('img/social-card.jpg'),
      },
    },
    // Additional SEO tags
    {
      tagName: 'meta',
      attributes: {
        name: 'robots',
        content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'googlebot',
        content: 'index, follow',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'bingbot',
        content: 'index, follow',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        httpEquiv: 'Content-Type',
        content: 'text/html; charset=utf-8',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0',
      },
    },
    // Schema.org structured data
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Agentic AI',
        url: siteUrl,
        logo: siteAssetUrl('img/logo.svg'),
        description: projectConfig.description,
        sameAs: [
          `https://github.com/${projectConfig.github.username}/${projectConfig.github.repoName}`,
        ],
      }),
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Agentic AI',
        url: siteUrl,
        description: projectConfig.description,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }),
    },
  ],

  // Baidu Analytics
  scripts: [
    {
      src: 'https://hm.baidu.com/hm.js?0b8bbee27b5404c869dded46a59bdc8d',
      async: true,
    },
  ],

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans', 'en'],
    localeConfigs: {
      'zh-Hans': {
        label: '简体中文',
        direction: 'ltr',
        htmlLang: 'zh-CN',
      },
      en: {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en-US',
      },
    },
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    // [
    //   '@docusaurus/plugin-content-docs',
    //   {
    //     id: 'studio',
    //     path: 'studio',
    //     routeBasePath: 'studio',
    //     sidebarPath: './sidebars/sidebars-studio.ts',
    //   },
    // ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: githubUrls.editDocs,
          // Enhanced SEO for docs
          showLastUpdateAuthor: false,
          showLastUpdateTime: true,
          breadcrumbs: true,
        },
        blog: false,
        theme: {
          customCss: ['./src/css/custom.css', './src/css/image-zoom.css'],
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
        // Performance optimizations
        gtag: undefined, // Disable if not using Google Analytics
      } satisfies PresetClassicOptions,
    ],
  ],
  
  themeConfig: {
    // Replace with your project's social card
    image: 'img/social-card.jpg',
    // Enhanced metadata for SEO
    metadata: [
      { name: 'keywords', content: 'Agentic AI, Agent Framework, ReactAgent, Graph Core, Multi-Agent, Java AI, 智能体, AI开发框架' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { property: 'og:type', content: 'website' },
    ],
    // Disable search functionality
    algolia: undefined,
    navbar: {
      title: projectConfig.title,
      logo: {
        alt: `${projectConfig.title} Logo`,
        src: 'img/brand/logo.svg',
        srcDark: 'img/brand/logo.svg',
      },
      hideOnScroll: false,
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'graphCoreSidebar',
          position: 'left',
          label: 'Graph Core',
        },
        {
          type: 'docSidebar',
          sidebarId: 'reactAgentSidebar',
          position: 'left',
          label: 'ReAct Agent',
        },
        {
          type: 'docSidebar',
          sidebarId: 'studioSidebar',
          position: 'left',
          label: 'Studio',
        },
        {
          type: 'docSidebar',
          sidebarId: 'communitySidebar',
          position: 'left',
          label: '社区协议',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: githubUrls.repo,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '快速开始',
              to: '/docs/overview',
            },
          ],
        },
        {
          title: '开发框架',
          items: [
            {
              label: 'ReAct Agent',
              to: '/docs/frameworks/agent-framework/quick-start',
            },
            {
              label: 'Graph Core',
              to: '/docs/frameworks/graph-core/quick-start',
            },
            {
              label: 'Studio',
              to: '/docs/frameworks/studio/quick-start',
            },
          ],
        },
        {
          title: '社区',
          items: [
            {
              label: '社区协议',
              to: '/docs/community/policies',
            },
            {
              label: '贡献指南',
              href: githubUrls.contributing,
            },
            {
              label: '安全策略',
              href: `${githubUrls.repo}/security/policy`,
            },
            {
              label: 'GitHub',
              href: githubUrls.repo,
            },
            {
              label: '讨论',
              href: githubUrls.discussions,
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: '许可证',
              href: githubUrls.license,
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} ${projectConfig.author.name}`,
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
      additionalLanguages: ['bash', 'json', 'yaml', 'go', 'rust', 'python', 'javascript', 'typescript', 'java', 'gradle'],
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  } satisfies ThemeConfig,
}

export default config
