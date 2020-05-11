import fetchRemoteFile from "./fetch-remote-file";
import getFileFromFileSystem from "./get-file-from-file-system";

const isRemoteUrl = (url) => /^(https?):\/\//.test(url);

const readFile = async (url, options = {}) => {
  // if its remote fetch it via xhr, otherwise its a local file
  if (isRemoteUrl(url)) {
    return fetchRemoteFile(url, options);
  } else {
    return getFileFromFileSystem(url, options);
  }
};

export default readFile;
