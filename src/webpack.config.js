/* eslint-env node */
const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./api.js/index.js",
  output: {
    path: path.resolve(path.join(__dirname, "..", "dist")),
    filename: "api.js",
    libraryTarget: "this", // Possible value - amd, commonjs, commonjs2, commonjs-module, this, var
  },
  plugins: [
    new webpack.BannerPlugin({
      banner: "/* eslint-disable */",
      raw: true,
    }),
  ],
};
