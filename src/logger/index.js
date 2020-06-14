/* eslint-disable no-undef */
/* eslint-disable no-console */
const DEVELOPMENT_ENV = "development";

const currentEnv = process.env.WEBPACK_ENV;

const info = (...args) => {
  if (currentEnv === DEVELOPMENT_ENV) {
    console.log(...args);
  }
};

const logger = { info };

export default logger;
