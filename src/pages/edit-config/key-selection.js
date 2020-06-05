import $ from "jquery";

const initKeySelection = (action, modalId) => {
  const Button = document.querySelector(`button[data-action="${action}"]`);
  const Modal = document.getElementById(modalId);

  if (!Button || !Modal)
    throw new Error(
      "Couldnt find everything needed for key selection in the DOM"
    );

  Button.onclick = () => {
    const modal = $("#" + modalId);
    modal.show();

    const modalElement = modal[0];
    modalElement.classList.add("in");
  };
};

export default initKeySelection;
