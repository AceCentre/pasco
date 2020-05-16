const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const isCordova = require("./is-cordova")();
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const relativeToRoot = (pathName) => path.resolve(__dirname, "../", pathName);

const commonHtmlConfig = {
  favicon: relativeToRoot("src/favicon.ico"),
  minify: {
    // TODO Ideally we should be removing comments but we still use them to inject cordova scripts
    removeComments: false,
  },
  templateParameters: {
    isCordova,
  },
};

module.exports = {
  entry: {
    intro: relativeToRoot("src/pages/intro/index.js"),
    help: relativeToRoot("src/pages/help/index.js"),
    "edit-config": relativeToRoot("src/pages/edit-config/index.js"),
  },
  output: {
    path: relativeToRoot(isCordova ? "cordova/www" : "html"),
    publicPath: "/",
    filename: "[name]/bundle.js",
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: "intro/index.html",
      template: relativeToRoot("src/pages/intro/index.html"),
      chunks: ["intro"],
      ...commonHtmlConfig,
    }),
    new HtmlWebpackPlugin({
      filename: "help/index.html",
      template: relativeToRoot("src/pages/help/index.html"),
      chunks: ["help"],
      ...commonHtmlConfig,
    }),
    new HtmlWebpackPlugin({
      filename: "edit-config/index.html",
      template: relativeToRoot("src/pages/edit-config/index.html"),
      chunks: ["edit-config"],
      ...commonHtmlConfig,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "webpacked-fonts",
            },
          },
        ],
      },
      {
        // TODO Would be good if this loader could do some kind of compression
        test: /\.(mp4|png|vtt|gif)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "wepacked-assets",
            },
          },
        ],
      },
    ],
  },
};
