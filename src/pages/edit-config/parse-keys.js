export const parseKeys = (keys = []) => {
  const keysAsArray = Object.entries(keys).map(([key, value]) => ({
    keyCode: key,
    ...value,
  }));
  const goInKeys = keysAsArray.filter((key) => key.func === "tree_go_in");
  const goOutKeys = keysAsArray.filter((key) => key.func === "tree_go_out");
  const goNextKeys = keysAsArray.filter((key) => key.func === "tree_go_next");
  const goPreviousKeys = keysAsArray.filter(
    (key) => key.func === "tree_go_previous"
  );

  return { goInKeys, goNextKeys, goOutKeys, goPreviousKeys };
};
