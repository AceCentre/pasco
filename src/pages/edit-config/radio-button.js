export const initRadioButtons = (radioButtonName, initialValue, callback) => {
  const initiallySellected = document.querySelector(
    `input[name="${radioButtonName}"][value="${initialValue}"]`
  );

  initiallySellected.checked = true;

  const radioButtons = document.querySelectorAll(
    `input[name="${radioButtonName}"]`
  );

  for (const radioButton of radioButtons) {
    radioButton.onclick = (event) => {
      const {
        target: { value },
      } = event;
      callback(value);
    };
  }
};
