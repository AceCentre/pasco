const setRouteHandler = (route) => () => {
  const ListItem = document.querySelector(`a[data-name='${route}']`);
  ListItem.classList.add("active");
};

const unsetRouteHandler = (route) => () => {
  const ListItem = document.querySelector(`a[data-name='${route}']`);
  ListItem.classList.remove("active");
};

const routes = [
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
  path: "access",
  title: "pasco - Config | Access",
};

export default routes;
