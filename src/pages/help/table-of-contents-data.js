// TODO We can probably generate this based on DOM contents
const tableOfContents = [
  {
    heading: "Getting Started with pasco",
    anchorHref: "#getting-started-video",
  },
  {
    heading: "Quick Reference",
    anchorHref: "#quick-reference",

    subHeadings: [
      { heading: "Settings", anchorHref: "#settings" },
      {
        heading: "Common Configurations",
        anchorHref: "#common-configurations",
      },
      { heading: "Editing - Quick Mode", anchorHref: "#editing-quick-mode" },
      {
        heading: "Editing - Advanced Mode",
        anchorHref: "#editing-advanced-mode",
      },
      {
        heading: "Importing and exporting vocabulary",
        anchorHref: "#importing-and-exporting-vocabulary",
      },
    ],
  },
  { heading: "Credits", anchorHref: "#credits" },
];

export default tableOfContents;
