const commonConfig = require("./webpack.common");
const path = require("path");

const config = {
  ...commonConfig,
  mode: "development",
  devServer: {
    contentBase: path.join(__dirname, "../html"),
    port: 9000,
    open: true,
  },
};

module.exports = config;
