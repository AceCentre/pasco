import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "./index.css";
import localize from "../../localization";
import setupRouter from "./router";

import { getConfig, setConfig } from "../../config";
import { initRadioButtons } from "./radio-button";
import { initSlider } from "./slider";

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

initSlider(
  "minimum_cue_time",
  initialConfig.minimum_cue_time,
  { step: 100, min: 0, max: 3000 },
  (value) => setConfig({ minimum_cue_time: value })
);

setupRouter();
localize();
