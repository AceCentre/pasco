const reverseKeysAndValues = (obj) => {
  return Object.entries(obj).reduce((ret, entry) => {
    const [key, value] = entry;
    ret[value] = key;
    return ret;
  }, {});
};

export const keyInputByCode = {
  "13": "RETURN",
  "32": "SPACE",
  "39": "RIGHT",
  "37": "LEFT",
  "38": "UP",
  "40": "DOWN",

  "192": "`",
  "48": "0",
  "49": "1",
  "50": "2",
  "51": "3",
  "52": "4",
  "53": "5",
  "54": "6",
  "55": "7",
  "56": "8",
  "57": "9",

  "173": "-",
  "61": "=",
  "219": "[",
  "221": "]",
  "220": "\\",
  "59": ";",
  "222": "'",
  "188": ",",
  "190": ".",
  "191": "/",

  "81": "q",
  "87": "w",
  "69": "e",
  "82": "r",
  "84": "t",
  "89": "y",
  "85": "u",
  "73": "i",
  "79": "o",
  "80": "p",
  "65": "a",
  "83": "s",
  "68": "d",
  "70": "f",
  "71": "g",
  "72": "h",
  "74": "j",
  "75": "k",
  "76": "l",
  "90": "z",
  "88": "x",
  "67": "c",
  "86": "v",
  "66": "b",
  "78": "n",
  "77": "m",
};

export const keyCodeByInput = reverseKeysAndValues(keyInputByCode);
