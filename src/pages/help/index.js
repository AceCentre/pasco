/* Global styles import */
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "../../common.css";
import "./index.css";

import showOrHideGoTopLink from "./show-or-hide-go-top-link";

import configsSingleSwitchGif from "./assets/configs-single-switch.gif";
import configsTwoSwitchGif from "./assets/configs-two-switch.gif";
import configsArrowKeysGif from "./assets/configs-arrow-keys.gif";
import configsAuditoryCuesGif from "./assets/configs-auditory-cues.gif";
import recodingAudioGif from "./assets/recording-audio.gif";
import advancedEditingGif from "./assets/advanced-editing.gif";

const configsSingleSwitchImg = document.getElementById("configs-single-switch");
const configsTwoSwitchImg = document.getElementById("configs-two-switch");
const configsArrowKeysImg = document.getElementById("configs-arrow-keys");
const configsAuditoryCuesImg = document.getElementById("configs-auditory-cues");
const recordingAudioImg = document.getElementById("recording-audio");
const advancedEditingImg = document.getElementById("advanced-editing");

configsSingleSwitchImg.src = configsSingleSwitchGif;
configsTwoSwitchImg.src = configsTwoSwitchGif;
configsArrowKeysImg.src = configsArrowKeysGif;
configsAuditoryCuesImg.src = configsAuditoryCuesGif;
recordingAudioImg.src = recodingAudioGif;
advancedEditingImg.src = advancedEditingGif;

import NativeAccessApi from "../../NativeAccessApi";
import { waitForEvent } from "../../utils";
import initializeCordova from "../../initializeCordova";

// const HELP_FILES = {
//   en: "/help",
//   "es-ES": "help/es-ES.html",
// };

(async () => {
  document.addEventListener("scroll", showOrHideGoTopLink);

  if (NativeAccessApi.available) {
    await NativeAccessApi.onready();
  }

  await waitForEvent("DOMContentLoaded");

  if (window && window.cordova) {
    await initializeCordova();
  }
})();
