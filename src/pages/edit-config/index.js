import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap";
import "@fortawesome/fontawesome-free/css/all.css";
import "./index.css";
import localize from "../../localization";
import setupRouter from "./router";

import { getConfig, setConfig } from "../../config";
import { initRadioButtons } from "./radio-button";
import { initCheckbox } from "./checkbox";
import { initSlider } from "./slider";
import initKeySelection from "./key-selection";
import { initConfigureActionModal } from "./configure-action-modal";
import { parseKeys, removeKey } from "./parse-keys";

// TODO this should be somewhere more generic
const MODES = ["switch", "wheel", "auto"];

const initialConfig = getConfig();

const configureActionModal = initConfigureActionModal("configure-action-modal");

const { goInKeys, goOutKeys, goNextKeys, goPreviousKeys } = parseKeys(
  initialConfig.keys
);

const deleteKeyCallback = (deletedKey) => {
  const currentConfig = getConfig();
  const newKeys = removeKey(currentConfig.keys, deletedKey);

  setConfig({ keys: newKeys });
};

initKeySelection(
  "tree_go_in",
  configureActionModal,
  goInKeys,
  deleteKeyCallback
);
initKeySelection(
  "tree_go_out",
  configureActionModal,
  goOutKeys,
  deleteKeyCallback
);
initKeySelection(
  "tree_go_next",
  configureActionModal,
  goNextKeys,
  deleteKeyCallback
);
initKeySelection(
  "tree_go_previous",
  configureActionModal,
  goPreviousKeys,
  deleteKeyCallback
);

initCheckbox(
  "helper_stay_in_branch_for_all",
  initialConfig.helper_stay_in_branch_for_all,
  (val) => setConfig({ helper_stay_in_branch_for_all: val })
);

initCheckbox("wheel_y_reverse", initialConfig.wheel_y_reverse, (val) =>
  setConfig({ wheel_y_reverse: val })
);

initCheckbox("wheel_x_reverse", initialConfig.wheel_x_reverse, (val) =>
  setConfig({ wheel_x_reverse: val })
);

initRadioButtons(
  "onscreen_navigation",
  initialConfig.onscreen_navigation,
  (newOnScreenNavigation) =>
    setConfig({ onscreen_navigation: newOnScreenNavigation })
);

initRadioButtons(
  "helper_back_option",
  initialConfig.helper_back_option,
  (helper_back_option) => setConfig({ helper_back_option: helper_back_option })
);

initRadioButtons("mode", initialConfig.mode, (newMode) => {
  // TODO right now this makes everything unactive then sets active. Ideally it would be able to make
  // only the previously active inactive. Also this could should not be in this file
  const AllExtraOptions = MODES.map((mode) =>
    document.getElementById(`${mode}_mode_params`)
  );
  AllExtraOptions.forEach((ExtraOption) =>
    ExtraOption.classList.remove("mode-active")
  );

  const ExtraOptionsElement = document.getElementById(`${newMode}_mode_params`);
  ExtraOptionsElement.classList.add("mode-active");

  setConfig({ mode: newMode });
});

initSlider(
  "tree_content_size_percentage_range",
  initialConfig.tree_content_size_percentage,
  {
    step: 1,
    min: 10,
    max: 300,
    numberInputId: "tree_content_size_percentage",
  },
  (newPercentage) => setConfig({ tree_content_size_percentage: newPercentage })
);

initSlider(
  "wheel_y_threshold_range",
  initialConfig.wheel_y_threshold,
  { min: 1, step: 1, max: 100, numberInputId: "wheel_y_threshold" },
  (newVal) => setConfig({ wheel_y_threshold: newVal })
);

initSlider(
  "wheel_x_threshold_range",
  initialConfig.wheel_x_threshold,
  { min: 1, step: 1, max: 100, numberInputId: "wheel_x_threshold" },
  (newVal) => setConfig({ wheel_x_threshold: newVal })
);

initSlider(
  "auto_next_loops_range",
  initialConfig.auto_next_loops,
  { step: 1, min: 0, max: 4, numberInputId: "auto_next_loops" },
  (newVal) => setConfig({ auto_next_loops: newVal })
);

initSlider(
  "auto_next_atfirst_delay_range",
  initialConfig.auto_next_atfirst_delay,
  {
    step: 100,
    min: 0,
    max: 2000,
    numberInputId: "auto_next_atfirst_delay",
  },
  (newVal) => setConfig({ auto_next_atfirst_delay: newVal })
);

initSlider(
  "auto_next_delay_range",
  initialConfig.auto_next_atfirst_delay,
  {
    step: 100,
    min: 0,
    max: 5000,
    numberInputId: "auto_next_delay",
  },
  (newVal) => setConfig({ auto_next_delay: newVal })
);

initSlider(
  "message_bar_height_range",
  initialConfig.message_bar_height,
  {
    step: 1,
    min: 10,
    max: 90,
    numberInputId: "message_bar_height",
  },
  (newPercentage) => setConfig({ message_bar_height: newPercentage })
);

initSlider(
  "message_bar_font_size_percentage_range",
  initialConfig.message_bar_font_size_percentage,
  {
    step: 1,
    min: 10,
    max: 300,
    numberInputId: "message_bar_font_size_percentage",
  },
  (newPercentage) =>
    setConfig({ message_bar_font_size_percentage: newPercentage })
);

initSlider(
  "auditory_cue_voice_options.pitch",
  initialConfig.auditory_cue_voice_options.pitch,
  {
    step: 0.01,
    min: 0.01,
    max: 2,
    textDisplayId: "disp-auditory_cue_voice_options__pitch",
  },
  (newPitch) => setConfig({ auditory_cue_voice_options: { pitch: newPitch } })
);

initSlider(
  "auditory_cue_voice_options.volume",
  initialConfig.auditory_cue_voice_options.volume,
  {
    step: 0.01,
    min: 0,
    max: 1,
    textDisplayId: "disp-auditory_cue_voice_options__volume",
  },
  (newVolume) =>
    setConfig({ auditory_cue_voice_options: { volume: newVolume } })
);

initSlider(
  "auditory_cue_voice_options.rateMul",
  initialConfig.auditory_cue_voice_options.rateMul,
  {
    step: 0.01,
    min: 0.01,
    max: 4,
    textDisplayId: "disp-auditory_cue_voice_options__rateMul",
  },
  (newRateMul) =>
    setConfig({ auditory_cue_voice_options: { rateMul: newRateMul } })
);

initSlider(
  "auditory_main_voice_options.pitch",
  initialConfig.auditory_main_voice_options.pitch,
  {
    step: 0.01,
    min: 0.01,
    max: 2,
    textDisplayId: "disp-auditory_main_voice_options__pitch",
  },
  (newPitch) => setConfig({ auditory_main_voice_options: { pitch: newPitch } })
);

initSlider(
  "auditory_main_voice_options.volume",
  initialConfig.auditory_main_voice_options.volume,
  {
    step: 0.01,
    min: 0,
    max: 1,
    textDisplayId: "disp-auditory_main_voice_options__volume",
  },
  (newVolume) =>
    setConfig({ auditory_main_voice_options: { volume: newVolume } })
);

initSlider(
  "auditory_main_voice_options.rateMul",
  initialConfig.auditory_main_voice_options.rateMul,
  {
    step: 0.01,
    min: 0.01,
    max: 4,
    textDisplayId: "disp-auditory_main_voice_options__rateMul",
  },
  (newRateMul) =>
    setConfig({ auditory_main_voice_options: { rateMul: newRateMul } })
);

initSlider(
  "minimum_cue_time_range",
  initialConfig.minimum_cue_time,
  { step: 100, min: 0, max: 3000, numberInputId: "minimum_cue_time" },
  (value) => setConfig({ minimum_cue_time: value })
);

initSlider(
  "ignore_second_hits_time_range",
  initialConfig.ignore_second_hits_time,
  { step: 100, min: 0, max: 2000, numberInputId: "ignore_second_hits_time" },
  (value) => setConfig({ ignore_second_hits_time: value })
);

initSlider(
  "ignore_key_release_time_range",
  initialConfig.ignore_key_release_time,
  { step: 100, min: 0, max: 2000, numberInputId: "ignore_key_release_time" },
  (value) => setConfig({ ignore_key_release_time: value })
);

setupRouter();
localize();
