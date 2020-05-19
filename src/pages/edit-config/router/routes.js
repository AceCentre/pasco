const setRouteHandler = (route) => () => {
  const ListItem = document.querySelector(`a[data-name='${route}']`);
  ListItem.classList.add("active");

  const PageSection = document.querySelector(
    `.page-sect[data-name='${route}']`
  );
  PageSection.classList.add("active");

  const MobilePageHeading = document.querySelector(`h2[data-name='${route}']`);
  MobilePageHeading.classList.add("active");
};

const unsetRouteHandler = (route) => () => {
  const ListItem = document.querySelector(`a[data-name='${route}']`);
  ListItem.classList.remove("active");

  const PageSection = document.querySelector(
    `.page-sect[data-name='${route}']`
  );
  PageSection.classList.remove("active");

  const MobilePageHeading = document.querySelector(`h2[data-name='${route}']`);
  MobilePageHeading.classList.remove("active");
};

const routes = [
  {
    path: "",
    title: "pasco - Config",
    setRoute: () => {
      const SelectorList = document.getElementById("page-selector-list");
      SelectorList.classList.remove("has-active");

      const SettingsTitle = document.querySelector("h1.main-head");

      SettingsTitle.classList.remove("has-active");

      const BackButton = document.querySelector("a.back-btn");
      BackButton.classList.remove("has-active");
    },
    unsetRoute: () => {
      const SelectorList = document.getElementById("page-selector-list");
      SelectorList.classList.add("has-active");

      const SettingsTitle = document.querySelector("h1.main-head");
      SettingsTitle.classList.add("has-active");

      const BackButton = document.querySelector("a.back-btn");
      BackButton.classList.add("has-active");
    },
  },
  {
    path: "access",
    title: "pasco - Config | Access",
    setRoute: setRouteHandler("access"),
    unsetRoute: unsetRouteHandler("access"),
  },
  {
    path: "helpers",
    title: "pasco - Config | Helpers",
    setRoute: setRouteHandler("helpers"),
    unsetRoute: unsetRouteHandler("helpers"),
  },
  {
    path: "speech",
    title: "pasco - Config | Speech",
    setRoute: setRouteHandler("speech"),
    unsetRoute: unsetRouteHandler("speech"),
  },
  {
    path: "appearance",
    title: "pasco - Config | Appearance",
    setRoute: setRouteHandler("appearance"),
    unsetRoute: unsetRouteHandler("appearance"),
  },
  {
    path: "vocabulary",
    title: "pasco - Config | Vocabulary",
    setRoute: setRouteHandler("vocabulary"),
    unsetRoute: unsetRouteHandler("vocabulary"),
  },
];

export const defaultRoute = {
  path: "",
};

export default routes;
