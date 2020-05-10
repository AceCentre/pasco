const commonConfig = require("./webpack.common");

const config = {
  ...commonConfig,
  mode: "production",
};

module.exports = config;
