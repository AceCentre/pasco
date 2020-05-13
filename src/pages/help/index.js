/* Global styles import */
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "../../common.css";
import "./index.css";

import showOrHideGoTopLink from "./show-or-hide-go-top-link";
import tableOfContentsData from "./table-of-contents-data";
import generateTableOfContetsElement from "./table-of-contents";

/* Import image assets */
import configsSingleSwitchGif from "./assets/configs-single-switch.gif";
import configsTwoSwitchGif from "./assets/configs-two-switch.gif";
import configsArrowKeysGif from "./assets/configs-arrow-keys.gif";
import configsAuditoryCuesGif from "./assets/configs-auditory-cues.gif";
import recodingAudioGif from "./assets/recording-audio.gif";
import advancedEditingGif from "./assets/advanced-editing.gif";

/* Get image elements */
const configsSingleSwitchImg = document.getElementById("configs-single-switch");
const configsTwoSwitchImg = document.getElementById("configs-two-switch");
const configsArrowKeysImg = document.getElementById("configs-arrow-keys");
const configsAuditoryCuesImg = document.getElementById("configs-auditory-cues");
const recordingAudioImg = document.getElementById("recording-audio");
const advancedEditingImg = document.getElementById("advanced-editing");

/* Set the image sources */
configsSingleSwitchImg.src = configsSingleSwitchGif;
configsTwoSwitchImg.src = configsTwoSwitchGif;
configsArrowKeysImg.src = configsArrowKeysGif;
configsAuditoryCuesImg.src = configsAuditoryCuesGif;
recordingAudioImg.src = recodingAudioGif;
advancedEditingImg.src = advancedEditingGif;

(async () => {
  document.addEventListener("scroll", showOrHideGoTopLink);

  /* Generate and append table of contents */
  const tableOfContentsElement = generateTableOfContetsElement(
    tableOfContentsData
  );
  const tableOfContentsContainer = document.getElementById("table-of-contents");
  tableOfContentsContainer.append(tableOfContentsElement);
})();
