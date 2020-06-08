const KEY_TEMPLATE = ({ keyCode, keyIndex, keyLabel }) => `
  <div class="key-wrp" data-key="${keyCode}" data-id="${keyIndex}">
    <div class="key-btn-wrp">
        <button type="button" class="key-btn btn btn-default" oncontextmenu="return false">
          <span class="key-text">${keyLabel}</span><span class="waiting-text" x-l10n="">Waiting for key event</span>
        </button>
      </div>
    <div>
      <button type="button" class="remove-btn btn btn-danger">
        <span class="glyphicon glyphicon-remove">
        </span>
      </button>
    </div>
  </div>`;

const initKeySelection = (action, modal, initialKeys = []) => {
  const Button = document.querySelector(`button[data-action="${action}"]`);
  const KeyListContainer = document.getElementById("configure-action-key-list");

  if (!Button || !KeyListContainer)
    throw new Error(
      "Couldnt find everything needed for key selection in the DOM"
    );

  Button.onclick = () => {
    modal.open();

    KeyListContainer.innerHTML = "";

    initialKeys.forEach((key, keyIndex) => {
      const KeyItem = KEY_TEMPLATE({
        keyCode: key.keyCode,
        keyIndex,
        keyLabel: key.label,
      });
      KeyListContainer.innerHTML += KeyItem;
    });
  };
};

export default initKeySelection;
