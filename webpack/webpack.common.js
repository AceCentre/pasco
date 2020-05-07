const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const relativeToRoot = (pathName) => path.resolve(__dirname, "../", pathName);

module.exports = {
  entry: {
    intro: relativeToRoot("src/pages/intro/index.js"),
    help: relativeToRoot("src/pages/help/index.js"),
  },
  output: {
    path: relativeToRoot("html"),
    filename: "[name]/bundle.js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: "intro/index.html",
      template: relativeToRoot("src/pages/intro/index.html"),
      chunks: ["intro"],
      favicon: relativeToRoot("src/favicon.ico"),
    }),
    new HtmlWebpackPlugin({
      filename: "help/index.html",
      template: relativeToRoot("src/pages/help/index.html"),
      chunks: ["help"],
      favicon: relativeToRoot("src/favicon.ico"),
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
              outputPath: "webpacked-fonts/",
            },
          },
        ],
      },
      {
        // TODO Would be good if this loader could do some kind of compression
        test: /\.(mp4|png|vtt)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "assets/",
            },
          },
        ],
      },
    ],
  },
};