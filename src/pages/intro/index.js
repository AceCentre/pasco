/* Global style imports */
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "../../main.css";
import "@fortawesome/fontawesome-free/css/all.css";

/* Asset import */
import introVideo from "./assets/intro.mp4";
import introScreenshot from "./assets/intro.png";
import introTrack from "./assets/intro.vtt";

console.log(introVideo);

/* Load video assets */
const videoEl = document.getElementById("intro-video");
const trackEl = document.getElementById("intro-video-track");
const sourceEl = document.getElementById("intro-video-source");

videoEl.poster = introScreenshot;
trackEl.src = introTrack;
sourceEl.src = introVideo;
videoEl.load();

/* Switch skip and start buttons on video end */
const skipButton = document.getElementById("skip-btn");
const startBtn = document.getElementById("start-btn");
videoEl.addEventListener(
  "ended",
  () => {
    skipButton.classList.add("hidden");
    startBtn.classList.remove("hidden");
  },
  false
);
