import { fixUrlForCordova } from "../../fs";
import { waitForEvent } from "../../utils";

const isCordova = () =>
  document.URL.indexOf("http://") === -1 &&
  document.URL.indexOf("https://") === -1;

(async () => {
  console.log(document.URL);
  if (isCordova()) {
    await waitForEvent("deviceready");
    const helpPage = fixUrlForCordova("/help");
    const introPage = fixUrlForCordova("/intro");

    console.log({ helpPage, introPage });
  } else {
    console.log("no cordova ");
  }
})();
