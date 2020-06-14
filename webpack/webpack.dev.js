const commonConfig = require("./webpack.common");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const isCordova = require("./is-cordova")();
const { DefinePlugin } = require("webpack");

const relativeToRoot = (pathName) => path.resolve(__dirname, "../", pathName);

const output = {
  ...commonConfig.output,
  path: relativeToRoot(isCordova ? "cordova/www" : "dist"),
};

const config = {
  ...commonConfig,
  entry: {
    ...commonConfig.entry,
    "landing-page": relativeToRoot("src/pages/landing-page/index.js"),
  },
  plugins: [
    ...commonConfig.plugins,
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: relativeToRoot("src/pages/landing-page/index.html"),
      chunks: ["landing-page"],
      templateParameters: {
        isCordova,
      },
    }),
    new DefinePlugin({
      "process.env.WEBPACK_ENV": JSON.stringify("development"),
    }),
  ],
  output,
  mode: "development",
  devServer: {
    contentBase: relativeToRoot(isCordova ? "cordova/www" : "dist"),
    port: 9000,
    open: !isCordova,
  },
  devtool: "inline-source-map",
};

module.exports = config;
