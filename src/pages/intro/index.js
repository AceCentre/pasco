/** global style imports */
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "../../main.css";
import "@fortawesome/fontawesome-free/css/all.css";

document.querySelector("#intro-video").addEventListener(
  "ended",
  function() {
    document.querySelector("#skip-btn").classList.add("hidden");
    document.querySelector("#start-btn").classList.remove("hidden");
  },
  false
);
