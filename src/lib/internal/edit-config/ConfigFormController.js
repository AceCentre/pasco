import * as EventEmitter from 'events'
import { copyObject } from '../../../helpers/common'
import EventManager from '../../../helpers/EventManager'

function validate_number(v, name) {
  var ret = parseFloat(v)
  if (isNaN(ret)) {
    throw new Error(name + " should be a number")
  }
  return ret
}

export default class ConfigFormController extends EventEmitter {
  constructor (editConfigPage) {
    super()
    this._editConfigPage = editConfigPage
    this._core = this._editConfigPage.getCore()
    this._speech_synthesizer = this._core.getSpeechSynthesizer()
    this._event_manager = new EventManager()
    this._validators = {
      'number': validate_number,
    }
  }
  init (config) {
    this.setConfig(config)
    this._enableTriggerChange()
  }
  destroy () {
    this._event_manager.removeAllListeners()
  }
  setConfig (config) {
    this._config = copyObject(config)
    let form = this._editConfigPage.getConfigForm()
    for (let elm of form.querySelectorAll('input,select,textarea,radio,checkbox')) {
      if (elm.name && elm.name.length > 0 && elm.name[0] != '_') {
        let name = elm.name;
        let path = name.split('.')
        // special case for voice_options, load prefixed data if not avail
        let vo_suffix = 'voice_options';
        if (path[0].indexOf(vo_suffix) == path[0].length - vo_suffix.length) {
          if (!this._config[path[0]] && this._config['_'+path[0]]) {
            name = '_' + name;
          }
        }
        let input_info = this._parseInputInfo(name, config)
        if (input_info.value != undefined) {
          this._setInputValueFromConfig(elm, input_info.value)
        }
      }
    }
    // specific to voices
    for (let voice_sel of this._editConfigPage.getVoiceSelectionList()) {
      let propname = (this._speech_synthesizer.isNative() ? '' : 'alt_') + 'voiceId'
      let part = this._config[voice_sel.name] || this._config['_' + voice_sel.name]
      let vid = part ? part[propname] : null
      let input = form.querySelector(`[name=${voice_sel.select_id}]`)
      if (input) {
        input.value = vid || ''
      }
    }
    let cue_first_active_cb = form.querySelector('[name=_cue_first_active]')
    if (cue_first_active_cb) {
      cue_first_active_cb.checked = !!this._config.auditory_cue_first_run_voice_options
      cue_first_active_cb.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }
  onConfigChange () {
    try {
      this.updateConfig()
      this.emit('config-change', this._config)
    } catch (error) {
      this.emit('error', error)
    }
  }
  getConfig () {
    return this._config
  }
  updateConfig () {
    let config = copyObject(this._config)
    let form = this._editConfigPage.getConfigForm()
    // validate & apply input
    for (let elm of form.querySelectorAll('input,select,textarea')) {
      if (elm.name && elm.name.length > 0 && elm.name[0] != '_') {
        let validator_attr = elm.getAttribute('data-validator')
        let validator = validator_attr ? this._validators[validator_attr] : null
        if (validator_attr && !validator) {
          throw new Error('Validator not found ' + validator_attr + ' for ' + elm.name)
        }
        let value = validator ? validator(elm.value, elm.name) : elm.value
        let input_info = this._parseInputInfo(elm.name, config, true)
        this._setConfigValueFromInput(elm, input_info, value)
      } 
    }
    // special cases, mainly voice_options
    for (let voice_sel of this._editConfigPage.getVoiceSelectionList()) {
      let inp = form.querySelector(`[name=${voice_sel.select_id}]`)
      if (!inp) {
        continue
      }
      let propname = (this._speech_synthesizer.isNative() ? '' : 'alt_') + 'voiceId'
      let str = inp.value
      if (!config[voice_sel.name]) {
        config[voice_sel.name] = {}
      }
      if(str) {
        config[voice_sel.name][propname] = str
      } else {
        delete config[voice_sel.name][propname]
      }
    }
    if (!this._editConfigPage.isQuickSetupMode()) {
      // save cue_first_run voice options when it is not active
      let cue_first_active_checkbox = form.querySelector('[name=_cue_first_active]')
      if (!cue_first_active_checkbox || !cue_first_active_checkbox.checked) {
        config._auditory_cue_first_run_voice_options = config.auditory_cue_first_run_voice_options
        delete config.auditory_cue_first_run_voice_options
      } else {
        delete config._auditory_cue_first_run_voice_options
      }
    }
    this._config = config
  }

  _enableTriggerChange () {
    let onChange = (evt) => {
      if (evt && evt.target && !evt.target.name) {
        return;
      }
      this.onConfigChange()
    }
    let form = this._editConfigPage.getConfigForm()
    let evtid = 'trigger-change'
    this._event_manager.removeListenersById(evtid)
    this._event_manager.addDOMListenerFor(form, 'input', onChange, false, evtid)
    this._event_manager.addDOMListenerFor(form, 'change', (evt) => {
      if (evt.target.nodeName == 'select' ||
          (evt.target.nodeName == 'input' &&
           ['checkbox', 'radio', 'range'].indexOf(evt.target.type) != -1)) {
        onChange(evt)
      }
    }, false, evtid)
    // rangeslider emits change event programmatically, Thus require capture
    // parameter of event listener to be true
    this._event_manager.addDOMListenerFor(form, 'input', (evt) => {
      if (evt.target.__rangeslider && evt.target.nodeName == 'INPUT' &&
          evt.target.type == 'range' && evt.target.name) {
        let input_info = this._parseInputInfo(evt.target.name, this._config)
        let preval = input_info.value
        let val = parseFloat(evt.target.value)
        if (input_info.target == null ||
            (!isNaN(val) && !isNaN(preval) && Math.abs(preval - val) < 0.0001)) {
          return // ignore
        }
        onChange(evt)
      }
    }, true, evtid)
  }
  /***** START HELPER FUNCTIONS *****/
  _parseInputInfo (name, config, mkobjr) {
    let path = name.split('.')
    let tmp = config
    // travese parents in the path
    for (let key of path.slice(0, path.length - 1)) {
      if (tmp[key] == null) {
        if (mkobjr) {
          tmp[key] = {}
        } else {
          return {
            path,
            target: null,
            name: path[path.length - 1],
            value: undefined,
          }
        }
      }
      tmp = tmp[key]
    }
    // get the item if It's available
    let key = path[path.length - 1]
    return {
      path,
      target: tmp,
      value: tmp[key],
      name: key,
    }
  }
  _setInputValueFromConfig (element, value) {
    if (['radio','checkbox'].indexOf(element.type) != -1) {
      if (element.type == 'checkbox' && typeof value == 'boolean') {
        element.checked = value
      } else {
        element.checked = element.value == value+''
      }
      element.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      element.value = value+'';
    }
    if (['text','number','range'].indexOf(element.type) != -1) {
      // element with data-dependent cannot receive the event unless
      // dispatchEvent with CustomEvent is used
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  _setConfigValueFromInput (element, info, value) {
    if (element.type == 'checkbox') {
      if (!element.value || element.value.toLowerCase() == 'on') {
        // is boolean
        info.target[info.name] = element.checked
      } else {
        if (element.checked) {
          info.target[info.name] = value
        } else {
          delete info.target[info.name]
        }
      }
    } else if (element.type == 'radio') {
      if (element.checked) {
        info.target[info.name] = value
      }
    } else {
      info.target[info.name] = value;
    }
  }
  /***** END HELPER FUNCTIONS *****/
}

