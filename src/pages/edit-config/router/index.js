import routes, { defaultRoute } from "./routes";

const HASH_BANG = "#!";

const getCurrentRoute = (currentLocation) => {
  if (!currentLocation.hash.includes(HASH_BANG)) {
    return;
  }

  const currentPath = currentLocation.hash.split(HASH_BANG)[1];
  const currentRoute = routes.find((current) => () => {
    return current.path.toLowerCase() === currentPath.toLowerCase();
  });

  return currentRoute;
};

const setCurrentRoute = (route, currentHistory) => {
  currentHistory.pushState(
    { currentRoute: { ...route, setRoute: undefined, unsetRoute: undefined } },
    route.title,
    `${HASH_BANG}${route.path}`
  );

  // Unset all routes
  routes.forEach((currentRoute) => currentRoute.unsetRoute());

  // Set new route
  route.setRoute();
};

const routerListener = () => {
  // Call set current route
  const currentRoute = getCurrentRoute(location) || defaultRoute;
  setCurrentRoute(currentRoute, history);
};

const setupRouter = () => {
  routerListener();
  window.addEventListener("hashchange", routerListener);
};

export default setupRouter;
