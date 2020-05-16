const config = {
  collectCoverage: false,
  collectCoverageFrom: ["src/**/*.js"],
  transform: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/file-import.js",
    "^.+\\.js$": "babel-jest",
  },
};

// eslint-disable-next-line no-undef
module.exports = config;
