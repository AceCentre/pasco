import EventManager from '../helpers/EventManager'
import { copyObject, deferredPromise, fixUrlForCordova } from '../helpers/common'

export default class PascoSpeechSynthesizer {
  constructor (native_bridge, file_manager) {
    this._nbridge = native_bridge
    this._fmanager = file_manager
    this._alt_finish_queue = []
    this._synthesizer_finish_trackers = []
    this._event_manager = new EventManager()
    this._WEB_VOICE_RATE_BY_NAME = { 'default': 1.0, 'max': 2.0, 'min': 0.5 }
  }
  isNative () {
    return this._is_native
  }
  async init () {
    if (this._nbridge.available && (await this._nbridge.has_synthesizer()) &&
        (await this._nbridge.has_audio_device())) {
      this._is_native = true
      this._nsynthesizer = await this._nbridge.init_synthesizer()
      // listen for events from native speech synthesizer
      this._event_manager.addDOMListenerFor(document, 'x-speech-synthesizer-did-start', this.nSynthesizerDidStartSpeech.bind(this))
      this._event_manager.addDOMListenerFor(document, 'x-speech-synthesizer-did-cancel', this.nSynthesizerDidCancelSpeech.bind(this))
      this._event_manager.addDOMListenerFor(document, 'x-speech-synthesizer-did-finish', this.nSynthesizerDidFinishSpeech.bind(this))
    } else { // alternative approach
      this._is_native = false
      if (!window.speechSynthesis) {
        throw new Error('SpeechSynthesis is not support')
      }
      this._voices_by_uri = {}
      for (let voice of window.speechSynthesis.getVoices()) {
        this._voices_by_uri[voice.voiceURI] = voice
      }
    }
  }
  async destroy () {
    this._event_manager.removeAllListeners()
  }
  async _nativeStartUtterance (text, opts) {
    opts = copyObject(opts)
    let audio_behavior = null
    if (typeof opts.audio_behavior != 'undefined') {
      audio_behavior = opts.audio_behavior
      delete opts.audio_behavior
    }
    if (opts.voice && opts.voice.voiceId) {
      opts.voiceId = opts.voice.voiceId
      delete opts.voice
    }
    if (typeof this._last_audio_behavior == 'undefined' || this._last_audio_behavior != audio_behavior) {
      this._last_audio_behavior = audio_behavior
      await this._nbridge.set_audio_behavior(audio_behavior)
    }
    let utterance_id = await this._nbridge.init_utterance(text, opts)
    try {
      let tracker = await this._trackFinishSpeech(utterance_id)
      await this._nbridge.speak_utterance(this._nsynthesizer, utterance_id)
      // wait for finish
      await tracker.promise
    } finally {
      await this._nbridge.release_utterance(utterance_id)
    }
  }
  async _webStartUtterance (text, opts) {
    opts = copyObject(opts)
    if (opts.rate) {
      if(opts.rate in this._WEB_VOICE_RATE_BY_NAME) {
        opts.rate = this._WEB_VOICE_RATE_BY_NAME[opts.rate]
      }
      opts.rate = opts.rate * (opts.rateMul || 1.0)
    }
    delete opts.rateMul
    let voiceId = null
    if (opts.voice && opts.voice.alt_voiceId) {
      voiceId = opts.voice.alt_voiceId
    }
    delete opts.audio_behavior
    let utterance = new SpeechSynthesisUtterance(text)
    if (voiceId in this._voices_by_uri) {
      utterance.voice = this._voices_by_uri[voiceId]
    }
    utterance.pitch = opts.pitch
    utterance.rate = opts.rate
    utterance.volume = opts.volume
    window.speechSynthesis.speak(utterance)
    await (new Promise((resolve, reject) => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        resolve()
      } else {
        let finish_handler = () => {
          utterance.removeEventListener('end', finish_handler)
          utterance.removeEventListener('error', finish_handler)
          resolve()
        }
        utterance.addEventListener('end', finish_handler)
        utterance.addEventListener('error', finish_handler)
      }
    }))
  }
  async startUtterance (text, opts) {
    if (this._audio_tag) {
      // prevent multiple audio running at same time
      this.stopAudio()
    }
    opts = Object.assign({}, opts)
    if (this._is_native) {
      await this._nativeStartUtterance(text, opts)
    } else {
      await this._webStartUtterance(text, opts)
    }
  }


  /**** START native speech synthesizer ****/
  nSynthesizerDidStartSpeech (event) {
  }
  nSynthesizerDidCancelSpeech (event) {
    if (event.detail.synthesizer_id == this._nsynthesizer) {
      this._didFinishSpeech(event.detail.utterance_id)
    }
  }
  nSynthesizerDidFinishSpeech (event) {
    if (event.detail.synthesizer_id == this._nsynthesizer) {
      this._didFinishSpeech(event.detail.utterance_id)
    }
  }
  /**** END native speech synthesizer ****/

  /**** START helper functions ****/
  async _trackFinishSpeech (utterance_id) {
    let [promise, resolve, reject] = await deferredPromise()
    let timeoutid = setTimeout(() => {
      reject(new Error('Timeout!'))
    }, 10 * 1000)
    let tracker = {
      utterance_id,
      handler: () => {
        clearTimeout(timeoutid)
        resolve()
      },
      promise,
    }
    this._synthesizer_finish_trackers.push(tracker)
    return tracker
  }
  _didFinishSpeech (utterance_id) {
    for (let i = 0; i < this._synthesizer_finish_trackers.length; ) {
      let tracker = this._synthesizer_finish_trackers[i]
      if (tracker.utterance_id == utterance_id) {
        this._synthesizer_finish_trackers.splice(i, 1)
        tracker.handler()
      } else {
        i++
      }
    }
  }
  /**** END helper functions ****/

  async stop () {
    if (this._audio_tag || this._cordova_media) {
      this.stopAudio()
    } else {
      if (this._is_native) {
        await this._nbridge.stop_speaking(this._nsynthesizer)
      } else {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel()
        }
      }
    }
  }

  async getVoices () {
    if (this._is_native) {
      return await this._nbridge.get_voices()
    } else {
      // this.responsiveVoice.getVoices()
      return await (new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            Array.from(speechSynthesis.getVoices()).map((v) => ({
              id: v.voiceURI,
              label: v.name,
              locale: v.lang || '',
            }))
          )
        }, 0)
      }))
    }
  }

  _cordovaStopAudio () {
    if(this._cordova_media) {
      this._cordova_media.stop()
      this._cordova_media.release()
      this._cordova_media = null
    }
  }

  async _cordovaPlayAudio (src, opts) {
    this._cordovaStopAudio()
    let audio_behavior = null
    if (typeof opts.audio_behavior != 'undefined') {
      audio_behavior = opts.audio_behavior
      delete opts.audio_behavior
    }
    if (typeof this._last_audio_behavior == 'undefined' || this._last_audio_behavior != audio_behavior) {
      this._last_audio_behavior = audio_behavior
      await this._nbridge.set_audio_behavior(audio_behavior)
    }
    await (new Promise((resolve, reject) => {
      src = fixUrlForCordova(src)
      let media = this._cordova_media = new Media(
        src,
        () => {
          resolve()
        },
        (err) => {
          reject("Error loading media: " + src + ", error: " + err.code)
        }
      )
      if (opts.volume) {
        media.setVolume(opts.volume)
      }
      media.play()
    }))
  }
  stopAudio () {
    if (window.cordova && window.Media) {
      // alternative approach
      this._cordovaStopAudio()
    } else if (this._audio_tag) {
      this._audio_tag.pause()
      if(this._audio_tag.parentNode) {
        this._audio_tag.parentNode.removeChild(this._audio_tag)
      }
      if(this._audio_onstop_callback) {
        this._audio_onstop_callback()
        this._audio_onstop_callback = null
      }
      this._audio_tag = null
    }
  }
  async playAudio (src, opts) {
    opts = Object.assign({}, opts)
    if (window.cordova && window.Media) {
      // alternative approach
      return await this._cordovaPlayAudio(src, opts)
    }
    this.stopAudio()
    let audio = this._audio_tag = document.createElement('audio')
    document.body.appendChild(audio)
    src = await this._fmanager.acquireFileUrl(src)
    await (new Promise((resolve, reject) => {
      if (!audio.parentNode) {
        // stopped
        this._fmanager.releaseFileUrl(src)
        return resolve()
      }
      if (opts.volume) {
        audio.setAttribute('volume', opts.volume.toFixed(2)+'')
        audio.volume = opts.volume
      }
      audio.setAttribute('preload', 'auto')
      let src_el = document.createElement('source')
      src_el.setAttribute('src', src)
      audio.appendChild(src_el)
      let stime = new Date().getTime()
      audio.addEventListener('canplay', () => {
        let diff = new Date().getTime() - stime
        if (diff >= opts.delay * 1000) {
          audio.play()
        } else {
          setTimeout(function() {
            audio.play()
          }, opts.delay * 1000 - diff)
        }
      }, false)
      audio.addEventListener('error', function() {
        reject(audio.error)
      }, false)
      function onResolve () {
        audio.pause()
        this._fmanager.releaseFileUrl(src)
        if(audio.parentNode) {
          audio.parentNode.removeChild(audio)
        }
        resolve()
      }
      audio.addEventListener('ended', function() {
        onResolve()
      }, false)
      this._audio_onstop_callback = onResolve
    }))
  }
}
