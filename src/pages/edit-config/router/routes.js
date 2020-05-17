const setRouteHandler = () => () => {
  // console.log("yo");
};

const unsetRouteHandler = () => () => {
  // console.log("yo");
};

const routes = [
  {
    path: "access",
    title: "pasco - Config | Access",
    setRoute: setRouteHandler(),
    unsetRoute: unsetRouteHandler(),
  },
  {
    path: "helpers",
    title: "pasco - Config | Helpers",
    setRoute: setRouteHandler(),
    unsetRoute: unsetRouteHandler(),
  },
  {
    path: "speech",
    title: "pasco - Config | Speech",
    setRoute: setRouteHandler(),
    unsetRoute: unsetRouteHandler(),
  },
  {
    path: "appearance",
    title: "pasco - Config | Appearance",
    setRoute: setRouteHandler(),
    unsetRoute: unsetRouteHandler(),
  },
  {
    path: "vocabulary",
    title: "pasco - Config | Vocabulary",
    setRoute: setRouteHandler(),
    unsetRoute: unsetRouteHandler(),
  },
];

export const defaultRoute = {
  path: "access",
  title: "pasco - Config | Access",
};

export default routes;
