/** Global style imports */
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "../../main.css";
import "@fortawesome/fontawesome-free/css/all.css";

/** Asset import */
import introVideo from "./assets/intro.mp4";
import introScreenshot from "./assets/intro.png";
import introTrack from "./assets/intro.vtt";

const videoEl = document.getElementById("intro-video");
const trackEl = document.getElementById("intro-video-track");
const sourceEl = document.getElementById("intro-video-source");

videoEl.poster = introScreenshot;
trackEl.src = introTrack;
sourceEl.src = introVideo;

videoEl.load();

console.log({
  introScreenshot,
  introVideo,
  introTrack,
  videoEl,
  trackEl,
  sourceEl,
});

document.querySelector("#intro-video").addEventListener(
  "ended",
  function() {
    document.querySelector("#skip-btn").classList.add("hidden");
    document.querySelector("#start-btn").classList.remove("hidden");
  },
  false
);
