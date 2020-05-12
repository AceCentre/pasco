import { getConfig } from "./index";
import defaultConfig from "./default.json";

const CONFIG_STORAGE_KEY = "config_storage";

describe("getConfig", () => {
  describe("if no config exists", () => {
    it("returns default config", () => {
      window.localStorage.removeItem(CONFIG_STORAGE_KEY);

      const actualConfig = getConfig();

      expect(actualConfig).toStrictEqual(defaultConfig);
    });

    it("sets the config in storage as default config", () => {
      window.localStorage.removeItem(CONFIG_STORAGE_KEY);

      getConfig();

      const actualConfig = window.localStorage.getItem(CONFIG_STORAGE_KEY);

      expect(actualConfig).toStrictEqual(JSON.stringify(defaultConfig));
    });
  });

  describe("config exists but its an empty object", () => {
    it("returns the default config", () => {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, "{}");

      const actualConfig = getConfig();
      expect(actualConfig).toStrictEqual(defaultConfig);
    });
  });
});
