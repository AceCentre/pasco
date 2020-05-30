import defaultConfig from "./default.json";
import { merge } from "lodash";

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
    return defaultConfig;
  } else {
    const configFromStorage = JSON.parse(rawConfig);
    return { ...defaultConfig, ...configFromStorage };
  }
};

export const setConfig = (newConfig) => {
  if (!window || !window.localStorage) {
    throw new Error("setConfig: No access to local storage API");
  }

  const existingConfig = getConfig();
  const combinedConfig = merge({}, defaultConfig, existingConfig, newConfig);

  window.localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify(combinedConfig)
  );

  return combinedConfig;
};
