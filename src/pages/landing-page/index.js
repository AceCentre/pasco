import { fixUrlForCordova } from "../../fs";

if (window.cordova) {
  const helpPage = fixUrlForCordova("/help");
  const introPage = fixUrlForCordova("/intro");

  console.log({ helpPage, introPage });
} else {
  console.log("no cordova ");
}
