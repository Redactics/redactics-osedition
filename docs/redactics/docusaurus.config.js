// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Redactics Documentation',
  tagline: 'The open source enterprise-ready tool for practicing safe data',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://www.redactics.com/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/docs/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'redactics', // Usually your GitHub org/user name.
  projectName: 'redactics-osedition', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/redactics/redactics-osedition/blob/main/docs/redactics/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Redactics Documentation',
        logo: {
          alt: 'Redactics',
          src: 'img/logo.svg',
        },
        items: [
          {
            href: 'https://github.com/redactics/redactics-osedition',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Redactics',
            items: [
              {
                label: 'About',
                href: 'https://www.redactics.com/#work',
              },
              {
                label: 'SMART Agent',
                href: 'https://www.redactics.com/#services',
              },
              {
                label: 'Guides',
                href: 'https://www.redactics.com/#blog',
              },
              {
                label: 'Editions',
                href: 'https://www.redactics.com/#pts',
              },
              {
                label: 'Contact',
                href: 'https://www.redactics.com/#pts',
              },
              {
                label: 'Blog',
                href: 'https://blog.redactics.com/',
              },
              {
                label: 'Sign Up',
                href: 'https://app.redactics.com/signup',
              },
              {
                label: 'Login',
                href: 'https://app.redactics.com/login',
              },
            ],
          },
          {
            title: 'Social',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/redactics/redactics-osedition',
              },
              {
                label: 'Linkedin',
                to: 'https://www.linkedin.com/company/76591584',
              },
              {
                label: 'Twitter',
                to: 'https://twitter.com/Redactics',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Redactics`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
