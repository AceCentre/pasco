import rangesliderJs from "rangeslider-js";

export const initSlider = (elementName, initialValue, opts, callback) => {
  const rangeEl = document.querySelector(
    `input[data-dependent="#${elementName}"]`
  );

  const numberInput = document.getElementById(elementName);
  numberInput.setAttribute("value", initialValue);

  const onSlide = (value) => {
    numberInput.value = value;
  };

  const onSlideEnd = (value) => callback(value);

  numberInput.onchange = (event) => {
    const { target } = event;
    rangeEl["rangeslider-js"].update({ value: target.value });
    callback(Number(target.value));
  };

  rangesliderJs.create(rangeEl, {
    ...opts,
    value: initialValue,
    onSlide,
    onSlideEnd,
  });
};
