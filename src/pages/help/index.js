/* Global styles import */
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "../../common.css";

import showOrHideGoTopLink from "./show-or-hide-go-top-link";
import NativeAccessApi from "../../NativeAccessApi";
import { waitForEvent } from "../../utils";
import initializeCordova from "../../initializeCordova";

// const HELP_FILES = {
//   en: "help.html",
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
