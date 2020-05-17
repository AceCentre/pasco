import { defaultRoute } from "./routes";

const getCurrentRoute = () => {};

const setCurrentRoute = () => {
  // Validate it is given a real route
};

const routerListener = () => {
  // Call set current route
};

const setupRouter = () => {
  const currentRoute = getCurrentRoute();
  if (!currentRoute) setCurrentRoute(defaultRoute);

  document.addEventListener("historychange", routerListener);
};

export default setupRouter;
