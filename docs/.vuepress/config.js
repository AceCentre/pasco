module.exports = {
  base: '/pasco/',
  title: 'pasco Docs',
  description: 'Communication for Physically and Visually impaired',
  ga: 'UA-24637628-7',
  plugins: [
    '@vuepress/medium-zoom'
  ],
  head: [
    ['link', { rel: "manifest",  href: "/site.webmanifest" }],
    ['link', { rel: "mask-icon",  href: "/safari-pinned-tab.svg", color: "#5bbad5" }],
    ['link', { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico" }],
    ['link', { rel: "apple-touch-icon", type: "image/x-icon", sizes: "180x180", href: "/apple-touch-icon.png" }],
    ['link', { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" }],
    ['link', { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" }],
    ['meta', { name: "application-name", content: "RelayKeys Docs" }],
    ['meta', { name: "theme-color", content: "#263238" }],
    ['meta', { name: "apple-mobile-web-app-title", content: "Directus Docs" }],
    ['meta', { name: "msapplication-TileColor", content: "#263238" }],
    ['meta', { name: "msapplication-config", content: "/browserconfig.xml" }]
  ],
  themeConfig: {
    lastUpdated: 'Last Updated',
    repo: 'acecentre/pasco',
    docsDir: 'docs',
    editLinks: true,
    serviceWorker: true,
    hiddenLinks: [],
    nav: [
      { text: 'AceCentre', link: 'https://acecentre.org.uk' },
    ],
    sidebarDepth: 1,
    // ⌨️ 🧠 📡 🤖 ✨ 💥 🔥 🌈 ⭐️ 🍄 🍹 🎱 🎨 🏆 🚨 🚀 💡 ⚙️ 🔮 🛠 🔑 🎁 🎈 🎀 ❤️ 💯
    sidebar: [
      {
        title: '⌨️ Getting Started',
        collapsable: false,
        children: [
          ['/getting-started/introduction', 'Introduction'],
          ['/getting-started/installation', 'Installation'],
          ['/getting-started/contributing', 'Contributing'],
          ['/getting-started/supporting-pasco', 'Supporting pasco'],
          ['/getting-started/troubleshooting', 'Troubleshooting'],
        ]
      },
    ]
  }
};