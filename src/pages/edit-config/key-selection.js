const initKeySelection = (action, modal) => {
  const Button = document.querySelector(`button[data-action="${action}"]`);

  if (!Button)
    throw new Error(
      "Couldnt find everything needed for key selection in the DOM"
    );

  Button.onclick = () => {
    modal.open();
  };
};

export default initKeySelection;
