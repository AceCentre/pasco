import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "./index.css";
import localize from "../../localization";
import setupRouter from "./router";

import { getConfig, setConfig } from "../../config";
import { initRadioButtons } from "./radio-button";

const initialConfig = getConfig();

initRadioButtons(
  "onscreen_navigation",
  initialConfig.onscreen_navigation,
  (newOnScreenNavigation) =>
    setConfig({ onscreen_navigation: newOnScreenNavigation })
);

initRadioButtons("mode", initialConfig.mode, (newMode) =>
  setConfig({ mode: newMode })
);

setupRouter();
localize();
