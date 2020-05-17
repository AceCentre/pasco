// TODO we do have translation files so it would be good to integrate with them and not rely on a third party translation tool

import translate from "translate";

const YANADEX_API_KEY =
  "trnsl.1.1.20200513T195818Z.a370f9159a2fb040.87736e21427fe9040ee285d1c17ded54b44326ee";

const getCurrentLocale = () => {
  return navigator.language;
};

const getElements = () => document.querySelectorAll("[x-l10n]");

const translateElement = async (element, locale) => {
  const translatedString = await translateString(element.textContent, locale);

  element.textContent = translatedString;
};

const translateString = async (stringToTranslate, currentLocale) => {
  return translate(stringToTranslate, {
    to: currentLocale,
    engine: "yandex",
    key: YANADEX_API_KEY,
  });
};

const localizeDom = () => {
  const currentLocale = getCurrentLocale();

  // Bail early if the user is on an english locale
  if (currentLocale.includes("en")) {
    return;
  }

  const elementList = getElements();

  const promises = [];

  // TODO Mutating all of the elements is not a good idea but
  for (const element of elementList) {
    promises.push(translateElement(element, currentLocale));
  }

  return Promise.all(promises);
};

export default localizeDom;
