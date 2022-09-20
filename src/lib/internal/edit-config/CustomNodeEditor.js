import { fsFriendlyName } from '../../../helpers/common'
import EventManager from '../../../helpers/EventManager'
import PascoTree from '../../PascoTree'
import * as EventEmitter from 'events'
import * as bootbox from 'bootbox'

export default class CustomNodeEditor extends EventEmitter {
  constructor (editConfigPage) {
    super()
    this._editConfigPage = editConfigPage
    this._core = this._editConfigPage.getCore()
    this._fmanager = this._core.getFileManager()
    this._t = this._core.getLocalizer().t
    this._document = this._editConfigPage.getDocument()
    this._event_manager = new EventManager()
    this._nbridge = this._core.getNativeBridge()
    this._speech_synthesizer = this._core.getSpeechSynthesizer()
  }
  init ({ text_input, record_section,
          audio_dest, audio_dest_url }) {
    this._text_input = text_input
    this._audio_dest = audio_dest
    this._audio_dest_url = audio_dest_url
    this._record_section = record_section
    if (this._record_section) {
      this._audio_input = record_section.querySelector('input')
      this._delete_audio_btn = record_section.querySelector('.delete-btn')
      this._record_btn_wrap = record_section.querySelector('.node-record-btn-wrap')
      this._record_btn = record_section.querySelector('.record-btn')
      if (this._record_btn) {
        this._event_manager.addDOMListenerFor(this._record_btn, 'mousedown', this.onRecordButtonPointerDown.bind(this), false)
        this._event_manager.addDOMListenerFor(this._record_btn, 'touchstart', this.onRecordButtonPointerDown.bind(this), false)
      }
      // on audio input change
      this._event_manager.addDOMListenerFor(this._audio_input, 'input', (evt) => {
        this._updateElementsStatus()
      }, false)
      this._event_manager.addNodeListenerFor(this._editConfigPage, 'config-change', (config) => {
        this._updateElementsStatus()
      })
    }
    if (this._delete_audio_btn) {
      this._event_manager.addDOMListenerFor(this._delete_audio_btn, 'click', this.onDeleteAudioButtonClick.bind(this), false)
    }
    this._updateElementsStatus()
  }
  destroy () {
    this._event_manager.removeAllListeners()
  }

  onRecordButtonPointerDown () {
    if (this._recording_promise) {
      return
    }
    let stopped = false
    let media = null
    this._recording_promise = (async () => {
      let prev_audio_behavior = await this._speech_synthesizer.getAudioBehavior()
      try {
        await this._speech_synthesizer.setAudioBehavior('playandrecord')
        if (stopped) {
          return
        }
        let onRecordStarted = (_media) => {
          media = _media
          this._event_manager.addDOMListenerFor(this._document, 'mouseup', this.onRecordButtonRelease.bind(this), false)
          this._event_manager.addDOMListenerFor(this._document, 'touchend', this.onRecordButtonRelease.bind(this), false)
        }
        let release_evtid = 'record-btn-onrelease'
        let success = await this._recordAudio(this._audio_dest_url, this._record_btn_wrap, onRecordStarted)
        media = null // recording ended
        if (success) {
          this._setAudioInput(this._audio_dest)
        }
      } catch (error) {
        this.emit('error', error)
      } finally {
        await this._speech_synthesizer.setAudioBehavior(prev_audio_behavior)
        this._recording_promise = null
      }
    })()
    this._recording_promise.stopRecording = () => {
      stopped = true
      if (media) {
        media.stopRecord()
        media.release()
      }
    }
  }
  onRecordButtonRelease () {
    if (this._recording_promise) {
      this._recording_promise.stopRecording()
    }
    let release_evtid = 'record-btn-onrelease'
    this._event_manager.removeListenersById(release_evtid)
  }
  onDeleteAudioButtonClick () {
    if (this._audio_input.value) {
      ;(async()=> {
        try {
          await this._fmanager.deleteFile(this._audio_dest_url)
        } catch (error) {
          this.emit('error', error)
        }
      })()
    }
    this._setAudioInput('')
  }

  _setAudioInput (value) {
    this._audio_input.value = value
    this._audio_input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  _updateElementsStatus () {
    let has_audio = this._audio_input && !!this._audio_input.value ? true : false
    if (this._text_input) {
      this._text_input.classList[has_audio ? 'add' : 'remove']('hidden')
    }
    if (this._delete_audio_btn) {
      this._delete_audio_btn.classList[!has_audio ? 'add' : 'remove']('hidden')
    }
  }
  async _recordAudio (dest, record_btn_wrap, onRecordStarted) {
    let granted = await this._nbridge.request_audio_record_permission()
    if (!granted) {
      throw new Error('Permission not granted')
    }
    // write empty file
    await this._fmanager.saveFileData(dest, '')
    return await (new Promise((resolve, reject) => {
      let amp_circle = this._record_btn_wrap.querySelector('.record-amp-circle')
      let circle_max_radius = 120
      let set_circle_radius = (radius) => {
        if(amp_circle) {
          amp_circle.style.width = (radius * 2) + 'px';
          amp_circle.style.height = (radius * 2) + 'px';
          amp_circle.style.borderRadius = radius + 'px';
        }
      }
      set_circle_radius(0)
      this._record_btn_wrap.classList.add('recording')
      try {
        let clear = () => {
          this._record_btn_wrap.classList.remove('recording')
          clearInterval(mediaTimer)
        }
        let onSuccess =  () => {
          clear()
          resolve(true)
        }
        let onError = (err) => {
          clear()
          reject(err)
        }
        // Audio player
        let media = new window.Media(dest, onSuccess, onError)
        let mediaTimer = setInterval(() => {
          // get media amplitude
          media.getCurrentAmplitude(
            // success callback
            (amp) => {
              set_circle_radius(amp * circle_max_radius)
            },
            // error callback
            (err) => {
              console.log("Error getting amp", err)
              clearInterval(mediaTimer)
            }
          )
        }, 100)
        // Record audio
        media.startRecord()
        onRecordStarted(media)
      } catch (err) {
        reject(err)
      }
    }))
  }
}

