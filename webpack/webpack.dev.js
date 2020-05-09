const commonConfig = require("./webpack.common");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const relativeToRoot = (pathName) => path.resolve(__dirname, "../", pathName);

const config = {
  ...commonConfig,
  plugins: [
    ...commonConfig.plugins,
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: relativeToRoot("src/pages/landing-page/index.html"),
      chunks: [],
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
