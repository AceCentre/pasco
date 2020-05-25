export const initCheckbox = (name, initValue, callback) => {
  const checkboxElement = document.querySelector(`input[name="${name}"]`);
  checkboxElement.checked = initValue;

  checkboxElement.onchange = (event) => {
    const { target } = event;
    callback(target.checked);
  };
};
