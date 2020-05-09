const commonConfig = require("./webpack.common");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const relativeToRoot = (pathName) => path.resolve(__dirname, "../", pathName);

const config = {
  ...commonConfig,
  entry: {
    ...commonConfig.entry,
    "landing-page": relativeToRoot("src/pages/landing-page/index.js"),
  },
  mode: "development",
  plugins: [
    ...commonConfig.plugins,
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: relativeToRoot("src/pages/landing-page/index.html"),
      chunks: ["landing-page"],
    }),
  ],
  devServer: {
    contentBase: relativeToRoot("cordova/www"),
    port: 9000,
    open: false,
  },
  output: {
    ...commonConfig.output,
    path: relativeToRoot("cordova/www"),
  },
  devtool: "inline-source-map",
};

module.exports = config;
