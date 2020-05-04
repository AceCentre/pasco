import _ from "underscore";
import { resolveLocalFileSystemUrl } from "./fs";

const REPLACE_FILE_KEYS = ["default_config", "default_trees_info_fn"];

const intializeCordova = async () => {
  const promises = REPLACE_FILE_KEYS.map(async (currentKey) => {
    const path = window[currentKey];
    const newPath = window.cordova_user_dir_prefix + window[currentKey];

    try {
      await resolveLocalFileSystemUrl(newPath);
      window[currentKey];
    } catch (err) {
      // read_file(path)
      //   .catch(function(err) {
      //     if (err.caused_by && err.caused_by.code == 1) {
      //       // not found
      //       return { __notfound: true };
      //     } else {
      //       throw err;
      //     }
      //   })
      //   .then(function(data) {
      //     if (!data.__notfound) {
      //       return write_file(newpath, data);
      //     }
      //   });
    }

    // resolveLocalFileSystemUrl
  });

  return Promise.all(promises);
};

//   _.each(REPLACE_FILE_KEYS, function(key) {
//     const path = window[key];
//     const newpath = window.cordova_user_dir_prefix + window[key];

//     promises.push(
//       new Promise(function(resolve, reject) {
//         window.resolveLocalFileSystemURL(newpath, resolve, continue_proc);
//         function continue_proc(err) {
//           // if not found, write it, if it exists
//           read_file(path)
//             .catch(function(err) {
//               if (err.caused_by && err.caused_by.code == 1) {
//                 // not found
//                 return { __notfound: true };
//               } else {
//                 throw err;
//               }
//             })
//             .then(function(data) {
//               if (!data.__notfound) {
//                 return write_file(newpath, data);
//               }
//             })
//             .then(resolve, reject);
//         }
//       }).then(function() {
//         window[key] = newpath;
//       })
//     );
//   });
//   return Promise.all(promises);
// };

const initializeApp = async () => {
  if (!window.cordova) {
    throw new Error(
      "'window.cordova' is undefined, you are probably trying to initialize cordova on the web"
    );
  }

  return intializeCordova();
};

export default initializeApp;
