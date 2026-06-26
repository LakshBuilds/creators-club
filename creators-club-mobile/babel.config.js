/** @type {import("@babel/core").ConfigFunction} */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Must be last — required for react-native-reanimated / worklets
    plugins: ["react-native-reanimated/plugin"]
  };
};



