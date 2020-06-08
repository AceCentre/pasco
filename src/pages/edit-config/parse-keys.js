export const parseKeys = (keys = []) => {
  const keysAsArray = keysToArray(keys);
  const goInKeys = keysAsArray.filter((key) => key.func === "tree_go_in");
  const goOutKeys = keysAsArray.filter((key) => key.func === "tree_go_out");
  const goNextKeys = keysAsArray.filter((key) => key.func === "tree_go_next");
  const goPreviousKeys = keysAsArray.filter(
    (key) => key.func === "tree_go_previous"
  );

  return { goInKeys, goNextKeys, goOutKeys, goPreviousKeys };
};

const keysToArray = (keys) =>
  Object.entries(keys).map(([key, value]) => ({
    keyCode: key,
    ...value,
  }));

const keysToObject = (keys) => {
  let keysObject = {};

  keys.forEach(({ keyCode, ...currentKey }) => {
    keysObject[keyCode] = currentKey;
  });

  return keysObject;
};

export const removeKey = (keys, deletedKey) => {
  const keysAsArray = keysToArray(keys);

  const filteredKeys = keysAsArray.filter(
    (currentKey) =>
      !(
        currentKey.func === deletedKey.func &&
        currentKey.label === deletedKey.label
      )
  );

  return keysToObject(filteredKeys);
};
