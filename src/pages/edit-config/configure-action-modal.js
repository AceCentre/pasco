import $ from "jquery";

class Modal {
  constructor(modalId) {
    this.modal = $("#" + modalId);

    if (!this.modal) {
      throw new Error(
        `Tried to create a modal with id ${modalId}, but modal with that ID could not be found`
      );
    }

    this.modalElement = this.modal[0];

    const closeButtons = this.modalElement.querySelectorAll(
      'button[data-dismiss="modal"]'
    );

    closeButtons.forEach((closeButton) => {
      // TODO doing a bind is pretty annoying
      closeButton.onclick = this.close.bind(this);
    });
  }

  open() {
    this.modal.show();
    this.modalElement.classList.add("in");

    const backDropElement = document.createElement("div");
    this.backDrop = backDropElement;
    backDropElement.classList.add("modal-backdrop", "fade", "in");
    document.body.appendChild(backDropElement);
  }

  close() {
    this.modal.hide();
    this.modalElement.classList.remove("in");

    if (this.backDrop) {
      this.backDrop.remove();
    }
  }
}

export const initConfigureActionModal = (modalId) => {
  const modal = new Modal(modalId);

  return modal;
};
