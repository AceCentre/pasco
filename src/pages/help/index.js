/* Global styles import */
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "../../common.css";

import showOrHideGoTopLink from "./show-or-hide-go-top-link";

// const HELP_FILES = {
//   en: "help.html",
//   "es-ES": "help/es-ES.html",
// };

document.addEventListener("scroll", showOrHideGoTopLink);

console.log("Entry point for help page");
