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
  plugins: [
    ...commonConfig.plugins,
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: relativeToRoot("src/pages/landing-page/index.html"),
      chunks: ["landing-page"],
    }),
  ],
  output: {
    ...commonConfig.output,
    path: relativeToRoot("dist"),
  },
  mode: "development",
  devServer: {
    contentBase: relativeToRoot("dist"),
    port: 9000,
    open: true,
  },
};

module.exports = config;
