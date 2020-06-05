import $ from "jquery";

const initKeySelection = (action, modalId) => {
  const Button = document.querySelector(`button[data-action="${action}"]`);
  const Modal = document.getElementById(modalId);

  if (!Button || !Modal)
    throw new Error(
      "Couldnt find everything needed for key selection in the DOM"
    );

  Button.onclick = () => {
    const Modal = $("#" + modalId);
    console.log(Modal);
    Modal.show();
  };

  // console.log(HotModuleReplacementPlugin);
};

export default initKeySelection;
