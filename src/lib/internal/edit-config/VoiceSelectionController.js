import locales from '../../../data/locales.json'
import EventManager from '../../../helpers/EventManager'

export default class VoiceSelectionController {
  constructor (editConfigPage) {
    this._editConfigPage = editConfigPage
    this._core = this._editConfigPage.getCore()
    let document = this._document = this._editConfigPage.getDocument()
    this._$ = document.querySelector.bind(document)
    this._$a = document.querySelectorAll.bind(document)
    this._event_manager = new EventManager()
    this._speech_synthesizer = this._core.getSpeechSynthesizer()
  }
  init (voice_selection, initial_voice_options) {
    this._form = this._editConfigPage.getConfigForm()
    this._voice_selection = voice_selection
    let wrpelm = this._$(voice_selection.playback_wrapper_selector)
    if (!wrpelm) {
      throw new Error(`"${voice_selection.playback_wrapper_selector}" not found`)
    }
    this._options = {}
    /* voice playback */
    for (let elm of wrpelm.querySelectorAll('.play-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', this.didClickPlaySampleAudio.bind(this), false)
    }
    for (let elm of wrpelm.querySelectorAll('.stop-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', this.didClickStopPlayingSampleAudio.bind(this), false)
    }
    this._makeVoiceOptions()
    { // set initial value for voiceId input
      let inp = this._form.querySelector(`[name=${voice_selection.select_id}]`)
      if (inp) {
        let propname = (this._speech_synthesizer.isNative() ? '' : 'alt_') + 'voiceId'
        inp.value = (initial_voice_options ? initial_voice_options[propname] : null) || ''
      }
    }
  }
  destroy () {
    this._event_manager.removeAllListeners()
  }
  async didClickPlaySampleAudio () {
    let vsel = this._voice_selection
    let text = "Quiet people have the loudest minds. Pasco at your service."
    let pbwrp = this._$(vsel.playback_wrapper_selector)
    let opts = {}
    pbwrp.querySelector('.play-btn').classList.add('hide')
    pbwrp.querySelector('.stop-btn').classList.remove('hide')
    try {
      { // get voiceId
        let inp = this._form.querySelector(`[name=${vsel.select_id}]`)
        if (inp.value) {
          let propname = (this._speech_synthesizer.isNative() ? '' : 'alt_') + 'voiceId'
          opts.voice = {}
          opts.voice[propname] = inp.value
        }
      }
      { // get volume
        let inp = this._form.querySelector(`[name="${vsel.name}.volume"]`)
        if (inp && parseFloat(inp.value) >= 0) {
          opts.volume = parseFloat(inp.value)
        }
      }
      { // get rate
        opts.rate = "default"
        let inp = this._form.querySelector(`[name="${vsel.name}.rateMul"]`)
        if (inp && parseFloat(inp.value) > 0) {
          opts.rateMul = parseFloat(inp.value)
        }
      }
      { // get pitch
        let inp = this._form.querySelector(`[name="${vsel.name}.pitch"]`)
        if (inp && !isNaN(parseFloat(inp.value))) {
          opts.pitch = parseFloat(inp.value)
        }
      }
      { // get delay
        let inp = this._form.querySelector(`[name="${vsel.name}.delay"]`)
        if (inp  && parseFloat(inp.value) >= 0) {
          opts.delay = parseFloat(inp.value)
        }
      }
      { // get override_to_speaker
        let inp = this._form.querySelector(`[name="${vsel.name}.override_to_speaker"]`)
        if (inp) {
          opts.override_to_speaker = !!inp.checked
        }
      }
      await this._speech_synthesizer.startUtterance(text, opts)
    } catch (err) {
      this._editConfigPage.onError(err)
    } finally {
      pbwrp.querySelector('.play-btn').classList.remove('hide')
      pbwrp.querySelector('.stop-btn').classList.add('hide')
    }
  }
  didClickStopPlayingSampleAudio () {
    let vsel = this._voice_selection
    let pbwrp = this._$(vsel.playback_wrapper_selector)
    pbwrp.querySelector('.play-btn').classList.remove('hide')
    pbwrp.querySelector('.stop-btn').classList.add('hide')
    this._speech_synthesizer.stop()
  }
  _makeVoiceOptions () {
    let vsel = this._voice_selection
    let voices_by_locale = Object.fromEntries(locales.map((a) => [ a.mr.replace('_','-').toLowerCase(), Object.assign({ opts: [] }, a) ]))
    let unlabled_voices = [ { label: 'Default', id: '' } ]
    // build voices_by_locale options
    for (let voice of this._editConfigPage.getVoices()) {
      var locale = voice.locale.toLowerCase()
      var vbl = null
      if (locale in voices_by_locale) {
        vbl = voices_by_locale[locale]
      } else if (locale.split('-')[0] in voices_by_locale) {
        vbl = voices_by_locale[locale.split('-')[0]]
      } else if (!!locale) {
        vbl = voices_by_locale[locale] =
            (voices_by_locale[locale] ?
             voices_by_locale[locale] : { opts: [], mr: locale, Marathi: locale })
      }
      if (vbl) {
        vbl.opts.push(voice)
      } else {
        unlabled_voices.push(voice)
      }
    }
    // build option groups
    var optgroups = Object.values(voices_by_locale).filter((a) =>a.opts.length > 0)
        .sort(function (a, b) {
          if (a.Marathi < b.Marathi) {
            return -1
          }
          if (a.Marathi > b.Marathi) {
            return 1
          }
          return 0
        })
    let inp = this._form.querySelector(`[name=${vsel.select_id}]`)
    var grp = this._document.createElement('optgroup')
    grp.setAttribute('label', '')
    unlabled_voices.forEach((voice) => {
      var opt = this._document.createElement('option')
      opt.value = voice.id
      opt.textContent = voice.label
      grp.appendChild(opt)
    })
    inp.appendChild(grp)
    for (let optgroup of optgroups) {
      var grp = this._document.createElement('optgroup')
      grp.setAttribute('label', optgroup.Marathi)
      optgroup.opts.forEach((voice) => {
        var opt = this._document.createElement('option')
        opt.value = voice.id
        opt.textContent = voice.label
        grp.appendChild(opt)
      })
      inp.appendChild(grp)
    }
  }

}
