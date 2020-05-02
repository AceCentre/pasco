import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

document.querySelector("#intro-video").addEventListener(
  "ended",
  function() {
    document.querySelector("#skip-btn").classList.add("hidden");
    document.querySelector("#start-btn").classList.remove("hidden");
  },
  false
);
