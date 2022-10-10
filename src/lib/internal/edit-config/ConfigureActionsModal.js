import BaseModal from './BaseModal'
import lodashTemplate from '../../../helpers/lodashTemplate'
import { createElementFromHTML } from '../../../helpers/DOMHelpers'
import EventManager from '../../../helpers/EventManager'
import PascoNativeBridge from '../../PascoNativeBridge'
import { findElementFromParents } from '../../../helpers/DOMHelpers'

export default class ConfigureActionsModal extends BaseModal {
  constructor (document, idprefix, core) {
    super(document, idprefix)
    this._core = core
    this._nbridge = this._core.getNativeBridge()
    this._event_manager = new EventManager()
  }
  async init (config, action, label) {
    if (this._initialized) {
      this.destroy()
    }
    this._initialized = true
    this._action = action
    this._label = label
    this._config = config
    this._initial_config_keys = Object.assign({}, config.keys)
    let idprefix = this._idprefix
    for (let elm of this._$a('#' + idprefix + '-title-suffix')) {
      elm.textContent = '(' + this._label + ')'
    }
    {
      let tmp = this._$('#' + idprefix + '-key-template')
      if (!tmp) {
        throw new Error('#' + idprefix + '-key-template not found')
      }
      this._key_tmpl = lodashTemplate(tmp.innerHTML)
    }
    this._key_list_elm = this._$('#' + idprefix + '-key-list')
    if (!this._key_list_elm) {
      throw new Error('#' + idprefix + '-key-list not found')
    }
    this._keys = []
    let id = 1
    let config_keys = config.keys || {}
    for (let key in config_keys) {
      if (config_keys.hasOwnProperty(key)) {
        let ckey = config_keys[key]
        if (ckey.action == action) {
          delete this._initial_config_keys[key]
          this._keys.push({
            key: key,
            label: ckey.label,
            id: (id++)+'',
          })
        }
      }
    }
    this.updateKeyList()
    this._event_manager.addDOMListenerFor(this._key_list_elm, 'click', this.didClickKeyList.bind(this))
    for (let elm of this._$a('#' + idprefix + '-key-add-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', (evt) => {
        try {
          let nextid = 1
          this._keys.forEach((a) => nextid = nextid <= a.id ? a.id+1 : nextid)
          let key_obj = {
            key: '',
            label: '',
            id: nextid+'',
          }
          this._keys.push(key_obj)
          let keywrp = createElementFromHTML(this._key_tmpl(key_obj))
          this._key_list_elm.appendChild(keywrp)
          let keybtn = keywrp.querySelector('.key-btn')
          if (keybtn) {
            this.didClickKeyBtn(keybtn)
          }
        } catch (err) {
          this.emit('error', err)
        }
      })
    }
    for (let elm of this._$a('#' + idprefix + '-save-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', (evt) => {
        var config_keys = Object.assign({}, this._initial_config_keys)
        this._keys.forEach((key_obj) => {
          config_keys[key_obj.key+''] = {
            action,
            label: key_obj.label,
          }
        })
        this.emit('change', { keys: config_keys })
        this.close()
      })
    }
  }
  destroy () {
    this._initialized = false
    this._event_manager.removeAllListeners()
    this.close()
  }
  didClickKeyList (evt) {
    { // key-btn
      let btn = findElementFromParents(evt.target, (a) => a.classList.contains('key-btn'), this._key_list_elm)
      if (btn) {
        return this.didClickKeyBtn(btn)
      }
    }
    { // remove-btn
      let btn = findElementFromParents(evt.target, (a) => a.classList.contains('remove-btn'), this._key_list_elm)
      if (btn) {
        this.didClickRemoveBtn(btn)
      }
    }
  }
  didClickRemoveBtn (remove_btn) {
    let parentElm = findElementFromParents(remove_btn, (a) => !!a.getAttribute('data-id'))
    if (!parentElm) {
      throw new Error('No parent element with data-id')
    }
    let id = parentElm.getAttribute('data-id')
    let index = this._keys.findIndex((a) => id == a.id)
    if (index != -1) {
      this._keys.splice(index, 1)
      this.updateKeyList()
    }
  }
  didClickKeyBtn (key_btn) {
    let parentElm = findElementFromParents(key_btn, (a) => !!a.getAttribute('data-id'))
    if (!parentElm) {
      throw new Error('No parent element with data-id')
    }
    if (key_btn.classList.contains('is-waiting')) {
      return
    }
    key_btn.classList.add('is-waiting')
    let id = parentElm.getAttribute('data-id')
    this.startListeningToKey(id)
  }
  async startListeningToKey (id) {
    this._listening_key_id = id
    if (this._nbridge.available && !this._config.use_keyboard_events_instead_of_keycommand) {
      await this.napiAddKeyCommand()
    }
    let evtid = 'listen-to-key'
    this._event_manager.addDOMListenerFor(this._document, 'mousedown', this.onKeyMouseDown.bind(this), true, evtid)
    if (this._nbridge.available) {
      this._event_manager.addDOMListenerFor(this._document, 'x-keycommand', this.onKeyCommand.bind(this), true, evtid)
    } else {
      this._event_manager.addDOMListenerFor(this._document, 'keydown', this.onKeyDown.bind(this), true, evtid)
      this._event_manager.addDOMListenerFor(this._document, 'keyup', this.onKeyup.bind(this), true, evtid)
    }
  }
  async stopListeningToKey () {
    if (this._nbridge.available && !this._config.use_keyboard_events_instead_of_keycommand) {
      await this.napiRemoveKeyCommand()
    }
    delete this._listening_key_id
    let evtid = 'listen-to-key'
    this._event_manager.removeListenersById(evtid)
  }
  napiAddKeyCommand () {
    let promises = []
    for (let key in PascoNativeBridge.keyInputByCode) {
      if (PascoNativeBridge.keyInputByCode.hasOwnProperty(key)) {
        let input = PascoNativeBridge.keyInputByCode[key]
        if(input) {
          promises.push(this._nbridge.add_key_command(input))
        }
      }
    }
    return Promise.all(promises)
  }
  napiRemoveKeyCommand () {
    let promises = []
    for(let key in PascoNativeBridge.keyInputByCode) {
      if (PascoNativeBridge.keyInputByCode.hasOwnProperty(key)) {
        let input = PascoNativeBridge.keyInputByCode[key]
        if(input) {
          promises.push(this._nbridge.remove_key_command(input))
        }
      }
    }
    return Promise.all(promises)
  }
  onKeyMouseDown (evt) {
    evt.preventDefault()
    let key, label
    if (evt.button == 0) {
      key = "Click"
      label = "Click"
    } else if (evt.button == 2) {
      key = "RightClick"
      label = "Right Click"
    }
    this._registerKey(key, label)
  }
  onKeyDown (evt) {
    evt.preventDefault()
    let label = evt.key.toUpperCase()
    let substitute_labels = {
      " ": "Space",
    }
    if (label in substitute_labels) {
      label = substitute_labels[label]
    }
    this._registerKey((evt.charCode || evt.keyCode || evt.code)+'', label)
  }
  onKeyup (evt) {
    evt.preventDefault()
  }
  onKeyCommand (evt) {
    if(!PascoNativeBridge.keyCodeByInput.hasOwnProperty(evt.detail.input)) {
      return
    }
    let code = PascoNativeBridge.keyCodeByInput[evt.detail.input]
    this._registerKey(code, evt.detail.input)
  }
  async _registerKey (key, label) {
    let id = this._listening_key_id
    delete this._listening_key_id
    let key_obj = this._keys.find((a) => id == a.id)
    if (key_obj != null) {
      key_obj.key = key
      key_obj.label = label
      this.updateKeyList() // simple update
    }
    await this.stopListeningToKey()
  }
  updateKeyList () {
    this._key_list_elm.innerHTML = this._keys.map((obj) => this._key_tmpl(obj)).join('\n')
  }
}
