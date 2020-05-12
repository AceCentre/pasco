import _ from "underscore";
import { resolveLocalFileSystemUrl, readFile } from "./fs";

const REPLACE_FILE_KEYS = ["default_config", "default_trees_info_fn"];

const intializeCordova = async () => {
  const promises = REPLACE_FILE_KEYS.map(async (currentKey) => {
    const path = window[currentKey];
    const newPath = window.cordova_user_dir_prefix + window[currentKey];

    try {
      await resolveLocalFileSystemUrl(newPath);
      window[currentKey] = newPath;
    } catch (err) {
      const file = readFile(path);
      write_file(newPath, file);
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
