import BaseModal from './BaseModal'
import lodashTemplate from '../../../helpers/lodashTemplate'
import { createElementFromHTML } from '../../../helpers/DOMHelpers'
import EventManager from '../../../helpers/EventManager'
import lodashEscape from 'lodash/escape'
import { findElementFromParents } from '../../../helpers/DOMHelpers'

export default class VoiceByLocaleModal extends BaseModal {
  constructor (document, idprefix, core) {
    super(document, idprefix)
    this._core = core
    this._event_manager = new EventManager()
  }
  async init (voice_id, label, data, locale_info_list) {
    if (this._initialized) {
      this.destroy()
    }
    this._initialized = true
    this._label = label
    this._locale_info_list = locale_info_list
    this._data = data
    this._voice_id = voice_id

    let idprefix = this._idprefix
    let ss = this._core.getSpeechSynthesizer()
    this._voice_list = await ss.getVoices()
    for (let elm of this._$a(`#${idprefix}-title-suffix`)) {
      elm.textContent = `(${label})`
    }
    let vidname = (ss.isNative() ? '' : 'alt_') + 'voiceId'
    let tmpl
    {
      let tmpl_elm = this._$('#' + idprefix + '-vid-template')
      if (!tmpl_elm) {
        throw new Error('#' + idprefix + '-vid-template not found!')
      }
      tmpl = lodashTemplate(tmpl_elm.innerHTML)
    }
      
    let list_elm = this._$(`#${idprefix}-list`)
    if (!list_elm) {
      throw new Error(`#${idprefix}-list not found`)
    }
    // init existing state
    list_elm.innerHTML = data.voices.map((voice) => {
      var linfo = this._locale_info_list.find((a) => a.locale == voice.locale)
      var vlabel = linfo ? linfo.label : voice.locale
      return tmpl({
        locale: voice.locale,
        value: voice[vidname],
        label: vlabel,
        options: this._mkVBLVoiceTMPLOptions(voice.locale),
      })
    }).join('\n')
    let evtid = `${idprefix}-vid`
    this._event_manager.removeListenersById(evtid)
    for (let elm of this._$a(`#${idprefix}-modal`)) {
      this._event_manager.addDOMListenerFor(elm, 'change', this.modalDidTriggerChange.bind(this), false, evtid)
      this._event_manager.addDOMListenerFor(elm, 'click', this.modalDidTriggerClick.bind(this), false, evtid)
    }
    for (let btn of this._$a(`#${idprefix}-add-btn`)) {
      this._event_manager.addDOMListenerFor(btn, 'click', (evt) => {
        let add_elm = this._$(`#${idprefix}-add`)
        let locale = add_elm ? add_elm.value : null
        if (!locale) {
          throw new Error("No locale!")
        }
        let options = this._mkVBLVoiceTMPLOptions(locale)
        if (options.length == 0) {
          this.alertWithNotice({
            type: 'failure',
            error: new Error('No option found for this locale!'),
          })
          return
        }
        let linfo = this._locale_info_list.find((a) => a.locale == locale)
        let vlabel = linfo ? linfo.label : locale
        let voice = { locale }
        voice[vidname] = options[0] ? options[0].value : ''
        data.voices.push(voice)
        let child_elm = createElementFromHTML(tmpl({
          locale: voice.locale,
          value: voice[vidname],
          label: vlabel,
          options: options,
        }))
        if (child_elm) {
          list_elm.appendChild(child_elm)
        }
        this.updateLocaleList()
        this.modalDidTriggerChange()
      }, false, evtid)
    }
    this.updateLocaleList()
  }
  getVoiceId () {
    return this._voice_id
  }
  destroy () {
    this._initialized = false
  }
  modalDidTriggerClick (evt) {
    { // remove-btn
      let btn = findElementFromParents(evt.target, (a) => a.classList.contains('remove-btn'), this._key_list_elm)
      if (btn) {
        return this.didClickRemoveBtn(btn)
      }
    }
  }
  didClickRemoveBtn (remove_btn) {
    let locale = remove_btn.getAttribute('data-locale')
    if (locale) {
      let vbl_elm = findElementFromParents(remove_btn, (a) => a.classList.contains('voice-by-locale-vid'))
      if (vbl_elm) {
        let idx = this._data.voices.findIndex((a) => a.locale == locale)
        if (idx != -1) {
          this._data.voices.splice(idx, 1)
        }
        if (vbl_elm.parentNode) {
          vbl_elm.parentNode.removeChild(vbl_elm)
        }
        this.updateLocaleList()
        this.modalDidTriggerChange()
      }
    }
  }
  modalDidTriggerChange () {
    let ss = this._core.getSpeechSynthesizer()
    let vidname = (ss.isNative() ? '' : 'alt_') + 'voiceId'
    let voices = Array.from(this._$a('#' + this._idprefix + '-modal .' + this._idprefix + '-vid select'))
        .map((elm) => {
          let locale = elm.name.indexOf('voice-id-of-') == 0 ?
              elm.name.slice('voice-id-of-'.length) : null
          if (!locale) {
            return null
          }
          let found_voice = this._data.voices.find((a) => a.locale == locale)
          if (found_voice == null) {
            return null
          }
          let ret = Object.assign({}, found_voice)
          ret[vidname] = elm.value
          return ret
        })
        .filter((a) => !!a)
    this.emit('change', { voices })
  }
  updateLocaleList () {
    let add_wrp_elm = this._$('#' + this._idprefix + '-add-wrp')
    let add_elm = this._$('#' + this._idprefix + '-add')
    if (add_elm) {
      add_elm.innerHTML = this._locale_info_list.map((linfo) => {
        let target_voice = this._data.voices.find((ex) => {
          // cmp of a locale and existing locale
          // en-GB, en => false (not match)
          // en, en-GB => true
          // en-Gb, en-GB => true
          return !(linfo.locale.indexOf('-') != -1 && ex.locale.indexOf('-') == -1) &&
            linfo.locale.split('-')[0] == ex.locale.split('-')[0]
        })
        if (target_voice) {
          return '' // skip, option already added
        }
        return '<option value="' + lodashEscape(linfo.locale) + '">' + lodashEscape(linfo.label) + '</option>'
      }).join("\n")
    }
    if (add_wrp_elm) {
      add_wrp_elm.classList[add_elm.innerHTML.trim() == '' ? 'add' : 'remove']('hidden')
    }
  }
  _mkVBLVoiceTMPLOptions (locale) {
    let vlist = this._voice_list.filter((v) => v.locale == locale)
    if (vlist.length == 0) {
      vlist = this._voice_list.filter((v) => (v.locale+"").split('-')[0] == locale.split('-')[0])
    }
    return vlist.map((v) => ({ value: v.id, label: v.label }))
  }
}
