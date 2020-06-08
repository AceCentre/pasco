// prettier-ignore
const KEY_TEMPLATE = ({ keyCode='', keyIndex='', keyLabel='', isWaiting = false }) => `
  <div class="key-wrp" data-key="${keyCode}" data-id="${keyIndex}">
    <div class="key-btn-wrp">
        <button type="button" class="key-btn btn btn-default ${isWaiting ? "is-waiting" : ""}" oncontextmenu="return false">
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

const stringToDomNode = (htmlString) => {
  const div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  return div.firstChild;
};

const initKeySelection = (action, modal, initialKeys = []) => {
  const Button = document.querySelector(`button[data-action="${action}"]`);
  const KeyListContainer = document.getElementById("configure-action-key-list");
  const AddKeyButton = document.getElementById("configure-action-key-add-btn");

  if (!Button || !KeyListContainer || !AddKeyButton)
    throw new Error(
      "Couldnt find everything needed for key selection in the DOM"
    );

  Button.onclick = () => {
    modal.open();

    AddKeyButton.onclick = () => {
      const NewKey = stringToDomNode(KEY_TEMPLATE({ isWaiting: true }));
      KeyListContainer.append(NewKey);
    };

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
