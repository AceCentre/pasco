import defaultConfig from "./default.json";
import { merge } from "lodash";
import logger from "../logger";

const CONFIG_STORAGE_KEY = "config_storage";

export const getConfig = () => {
  if (!window || !window.localStorage) {
    throw new Error("getConfig: No access to local storage API");
  }

  const rawConfig = window.localStorage.getItem(CONFIG_STORAGE_KEY);
  if (rawConfig == null) {
    window.localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify(defaultConfig)
    );

    logger.info("No existing config, default config:: ", defaultConfig);

    return defaultConfig;
  } else {
    const configFromStorage = JSON.parse(rawConfig);
    const mergedConfig = { ...defaultConfig, ...configFromStorage };

    logger.info("getConfig:", mergedConfig);

    return mergedConfig;
  }
};

export const setConfig = (newConfig) => {
  const existingConfig = getConfig();
  const combinedConfig = merge({}, defaultConfig, existingConfig, newConfig);

  if (newConfig.keys) {
    combinedConfig.keys = newConfig.keys;
  } else {
    combinedConfig.keys = existingConfig.keys;
  }

  return setConfigNoMerge(combinedConfig);
};

export const setConfigNoMerge = (config) => {
  if (!window || !window.localStorage) {
    throw new Error("setConfig: No access to local storage API");
  }

  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

  logger.info("setConfigNoMerge => config: ", config);

  return config;
};
