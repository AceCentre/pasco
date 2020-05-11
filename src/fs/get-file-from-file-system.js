import resolveLocalFileSystemUrl from "./resolve-local-file-system-url";
import fixUrlForCordova from "./fix-url-for-cordova";

const getFileFromFileSystem = async (url, options = {}) => {
  if (!window.cordova) {
    throw new Error(
      "Cannot call getFileFromFileSystem unless cordova is available on the window"
    );
  }

  const fixedUrl = fixUrlForCordova(url);

  try {
    const fileEntry = await resolveLocalFileSystemUrl(fixedUrl);

    return new Promise((resolve) => {
      fileEntry.file(function(file) {
        if (options.responseType == "blob") {
          resolve(file);
        } else {
          const reader = new FileReader();

          reader.onloadend = function() {
            resolve(reader.result);
          };

          reader.readAsText(file);
        }
      });
    });
  } catch (err) {
    const combinedErr = new Error(`Fail to load "${fixedUrl}" -- ${err.code}`);
    combinedErr.caused_by = err;
    throw combinedErr;
  }
};

export default getFileFromFileSystem;
