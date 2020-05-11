const fetchRemoteFile = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const xhrRequest = new XMLHttpRequest();
    if (options.responseType) {
      xhrRequest.responseType = options.responseType;
    }
    xhrRequest.open(options.method || "GET", url);
    xhrRequest.onreadystatechange = function() {
      if (xhrRequest.readyState === XMLHttpRequest.DONE) {
        if (xhrRequest.status >= 200 && xhrRequest.status < 300) {
          if (options.responseType) {
            if (
              options.responseType == "blob" &&
              typeof xhrRequest.response == "string"
            ) {
              resolve(new Blob([xhrRequest.response]));
            } else {
              resolve(xhrRequest.response);
            }
          } else {
            resolve(xhrRequest.responseText);
          }
        } else {
          const err = new Error(
            xhrRequest.statusText ||
              "unknown status " + xhrRequest.status + " for `" + url + "`"
          );
          err.options = options;
          err.url = url;
          err.xhr = xhrRequest;
          reject(err);
        }
      }
    };
    xhrRequest.send(options.data || null);
  });
};

export default fetchRemoteFile;
