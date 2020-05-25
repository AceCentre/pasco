import rangesliderJs from "rangeslider-js";

export const initSlider = (
  elementId,
  initValue,
  { textDisplayId, numberInputId, ...opts },
  cb
) => {
  const sliderInputEl = document.getElementById(elementId);

  const textDisplayElement = document.getElementById(textDisplayId);
  if (textDisplayElement) textDisplayElement.textContent = `[${initValue}]`;

  const numberInput = document.getElementById(numberInputId);
  if (numberInput) {
    numberInput.setAttribute("value", initValue);
    numberInput.onchange = (event) => {
      const { target } = event;
      sliderInputEl["rangeslider-js"].update({ value: target.value });
      cb(Number(target.value));
    };
  }

  const onSlideEnd = (value) => {
    cb(value);
  };

  const onSlide = (value) => {
    if (textDisplayElement) textDisplayElement.textContent = `[${value}]`;
    if (numberInput) numberInput.value = value;
  };

  rangesliderJs.create(sliderInputEl, {
    ...opts,
    value: initValue,
    onSlideEnd,
    onSlide,
  });
};
