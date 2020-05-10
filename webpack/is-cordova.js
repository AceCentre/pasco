module.exports = () => {
  console.log("Webpack, Is Cordova", process.argv.includes("--cordova"));
  return process.argv.includes("--cordova");
};
