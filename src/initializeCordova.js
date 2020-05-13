import { resolveLocalFileSystemUrl, readFile, writeFile } from "./fs";
import { waitForEvent } from "./utils";

const REPLACE_FILE = [
  { fileKey: "default_config", location: "config.json" },
  { fileKey: "default_trees_info_fn", location: "trees-info.json" },
];

const intializeCordova = async () => {
  const promises = REPLACE_FILE.map(async (currentFile) => {
    const path = currentFile.location;
    const newPath = `cdvfile://localhost/persistent/${path}`;

    console.log("about to try");
    try {
      console.log("Yo");
      await resolveLocalFileSystemUrl(newPath);
      window[currentFile.fileKey] = newPath;
    } catch (err) {
      console.log("Err", err);

      const file = readFile(path);
      writeFile(newPath, file);
    }
  });

  return Promise.all(promises);
};

const initializeApp = async () => {
  if (!window.cordova) {
    throw new Error(
      "'window.cordova' is undefined, you are probably trying to initialize cordova on the web"
    );
  }

  return intializeCordova();
};

export default initializeApp;
