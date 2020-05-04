/**
 * A wrapper for window.resolveLocalFileSystemURL that throws a useful error
 * Also promisifys the function
 */
const resolveLocalFileSystemUrl = async (url) => {
  if (!window.resolveLocalFileSystemURL) {
    throw new Error(
      "resolveLocalFileSystemURL doesnt exist on window, you probably tried to use it on the web but it is only set by cordova"
    );
  }

  return new Promise((res, rej) => {
    window.resolveLocalFileSystemURL(url, res, rej);
  });
};

export default resolveLocalFileSystemUrl;
