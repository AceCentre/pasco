const path = require("path");

// eslint-disable-next-line no-undef
module.exports = {
  process(src, filename) {
    return "module.exports = " + JSON.stringify(path.basename(filename)) + ";";
  },
};
