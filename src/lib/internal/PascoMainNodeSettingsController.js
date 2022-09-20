import EventManager from '../../helpers/EventManager'
import lodashTemplate from '../../helpers/lodashTemplate'
import $ from 'jquery'
import { fsFriendlyName, mkRand } from '../../helpers/common'

export default class PascoMainNodeSettingsController {
  constructor (main) {
    this._main = main
    this._pengine = main.getEngine()
    this._document = main.getDocument()
    this._core = main.getCore()
    this._native_bridge = this._core.getNativeBridge()
    this._speech_synthesizer = this._core.getSpeechSynthesizer()
    this._fmanager = this._core.getFileManager()
    this._event_manager = new EventManager()
    this._audio_meta_list = [
      {
        title: 'Both',
        name: 'both',
        suffix: '',
        target_meta: 'audio'
      },
      {
        title: 'main',
        name: 'main',
        suffix: 'main',
        target_meta: 'main-audio'
      },
      {
        title: 'cue',
        name: 'cue',
        suffix: 'cue',
        target_meta: 'cue-audio'
      },
    ]
  }
  init (node) {
    if (this._initialized) {
      this.destroy()
    }
    this._initialized = true

    this._audio_save_dirname = this._main.getTree().getAudioDir()
    this._tree_url = this._main.getTreeUrl()

    this._node = node

    let record_btn = this._document.getElementById('node-record-btn')
    let audio_tbody = this._document.getElementById('node-audio-tbody')
    this._event_manager.addDOMListenerFor(record_btn, 'mousedown', this.onHoldRecordButton.bind(this), false)
    this._event_manager.addDOMListenerFor(record_btn, 'touchstart', this.onHoldRecordButton.bind(this), false)
    this._event_manager.addDOMListenerFor(this._document, 'mouseup', this.onPointerRelease.bind(this), false)
    this._event_manager.addDOMListenerFor(this._document, 'touchend', this.onPointerRelease.bind(this), false)
    this._event_manager.addDOMListenerFor(audio_tbody, 'click', this.onClickAudioTBody.bind(this), false)

    let audio_td_template_elm = this._document.getElementById('node-audio-td-template')
    if (!audio_td_template_elm) {
      throw new Error('Could not find #node-audio-td-template')
    }
    this._audio_td_template = lodashTemplate(audio_td_template_elm.innerHTML)

    this.initAudioTable(node)
  }
  destroy () {
    this._initialized = false
    this.stopAudioPlayback()
    this._event_manager.removeAllListeners()
  }

  /**** START audio functions ****/
  async playAudio (node, audio_name) {
    try {
      let audio_meta = this.getAudioMetaByName(audio_name)
      let src = node.meta[audio_meta.target_meta]
      if (!src) {
        throw new Error("Audio source not found!")
      }
      this.stopAudioPlayback()
      this._playing_audio_name = audio_name
      this.toggleAudioButton(audio_name, true)
      await this._speech_synthesizer.playAudio(this._core.resolveUrl(src, this._tree_url))
    } finally {
      this.toggleAudioButton(audio_name, false)
      delete this._playing_audio_name;
    }
  }
  async removeAudio (node, audio_name) {
    let audio_meta = this.getAudioMetaByName(audio_name)
    let src = node.meta[audio_meta.target_meta]
    let reverts = node._more_meta.audio_reverts = node._more_meta.audio_reverts || {}
    let has_revert = !!reverts[audio_meta.target_meta]
    if (!has_revert && src) {
      reverts[audio_meta.target_meta] = src
    }
    if (src && has_revert) {
      try {
        await this._fmanager.deleteFile(this._core.resolveUrl(src, this._tree_url))
      } catch (err) {
        console.warn('Could not delete: ' + src)
      }
    }
    this.removeAudioRecord(audio_name)
    delete node.meta[audio_meta.target_meta]
  }
  stopAudioPlayback () {
    if (this._playing_audio_name) {
      this.toggleAudioButton(this._playing_audio_name, false)
    }
    this._speech_synthesizer.stopAudio()
  }
  /**** END audio functons ****/

  /**** START audio table functions ****/
  initAudioTable (node) {
    let tbody = this._document.getElementById('node-audio-tbody')
    tbody.innerHTML = ''
    for (let audio_meta of this._audio_meta_list) {
      if (node.meta[audio_meta.target_meta]) {
        this.addAudioRecord(audio_meta)
      }
    }
  }
  addAudioRecord (audio_meta) {
    this.removeAudioRecord(audio_meta.name)
    let tmp = document.createElement('tbody')
    tmp.innerHTML = this._audio_td_template({ audio_meta: audio_meta })
    for (let cnode of tmp.childNodes) {
      if (cnode && cnode.nodeName == 'TR') {
        let tbody = document.getElementById('node-audio-tbody')
        tbody.appendChild(cnode)
        break
      }
    }
  }
  removeAudioRecord (name) {
    let tbody = document.getElementById('node-audio-tbody')
    let elm = tbody.querySelector(':scope > [data-name="'+name+'"]')
    if (elm) {
      tbody.removeChild(elm)
    }
  }  
  /**** END audio table functions ****/


  /**** START event handlers ****/
  onClickAudioTBody (evt) {
    let node = this._node
    let btn, row_elm
    {
      let tmp = evt.target
      while (tmp) {
        if (tmp.nodeName == 'BUTTON') {
          btn = tmp
        } else if (tmp.hasAttribute('data-name')) {
          row_elm = tmp
          break
        }
        tmp = tmp.parentNode
      }
    }
    if (!btn || !row_elm) {
      return
    }
    ;(async () => {
      try {
        if (btn.classList.contains('remove-btn')) {
          await this.removeAudio(node, row_elm.getAttribute('data-name'))
        } else if (btn.classList.contains('play-btn')) {
          await this.playAudio(node, row_elm.getAttribute('data-name'))
        } else if (btn.classList.contains('stop-btn')) {
          this.stopAudioPlayback()
        }
      } catch (err) {
        this._main.displayError(err)
      }
    })()
  }
  onHoldRecordButton (evt) {
    let record_for_elm = document.getElementById('node-record-for')
    let audio_name = record_for_elm.value
    if (audio_name) {
      this.onStartRecording(audio_name)
    }
  }
  onPointerRelease (evt) {
    // check for end recording triggers
    if (!this._record_promise) {
      return
    }
    let record_btn = document.getElementById('node-record-btn')
    // check target
    let in_bound = false
    {
      let tmp = evt.target
      while (tmp != null) {
        if(tmp == record_btn) {
          in_bound = true
          break
        }
        tmp = tmp.parentNode
      }
    }
    if (in_bound) {
      let offset = $(record_btn).offset()
      let x = evt.pageX - offset.left
      let y = evt.pageY - offset.top
      if (x < 0 || y < 0 || x > $(record_btn).outerWidth() || y > $(record_btn).outerHeight()) {
        in_bound = false
      }
    }
    if (in_bound) {
      let min_time = 500
      if (new Date().getTime() - this._record_start_time < min_time) {
        this.onCancelRecord()
      } else {
        this.onSaveRecord()
      }
    } else {
      this.onCancelRecord()
    }
  }
  /**** END event handlers ****/


  /**** START RECORD AUDIO FEATURE ****/
  async startAudioRecording (dest) {
    let granted = await this._native_bridge.request_audio_record_permission()
    if (!granted) {
      throw new Error("Permission not granted");
    }
    // write empty file
    await this._fmanager.saveFileData(dest, '')
    return await (new Promise((resolve, reject) => {
      if (this._audio_record_media_stopped) {
        delete this._audio_record_media_stopped;
        return resolve(false);
      }
      let wrap = document.querySelector('.node-record-btn-wrap')
      let amp_circle = wrap.querySelector('.record-amp-circle')
      let circle_max_radius = 120
      let set_circle_radius = (radius) => {
        if(amp_circle) {
          amp_circle.style.width = (radius * 2) + 'px';
          amp_circle.style.height = (radius * 2) + 'px';
          amp_circle.style.borderRadius = radius + 'px';
        }
      }
      set_circle_radius(0)
      wrap.classList.add('recording')
      try {
        let onSuccess =  () => {
          delete this._audio_record_media
          wrap.classList.remove('recording')
          clearInterval(mediaTimer)
          resolve(true)
        }
        let onError = (err) => {
          delete this._audio_record_media
          wrap.classList.remove('recording')
          clearInterval(mediaTimer)
          reject(err)
        }
        // Audio player
        let media = this._audio_record_media = new window.Media(dest, onSuccess, onError)
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
      } catch (err) {
        reject(err)
      }
    }))
  }
  stopAudioRecording () {
    if (this._audio_record_media) {
      this._audio_record_media.stopRecord()
      this._audio_record_media.release()
    } else {
      this._audio_record_media_stopped = true
    }
  }
  onStartRecording (audio_name) {
    if (this._record_promise || this._record_inprogress) {
      return // skip
    }
    this._record_promise = (async () => {
      let prev_audio_behavior = await this._speech_synthesizer.getAudioBehavior()
      try {
        await this._speech_synthesizer.setAudioBehavior('playandrecord')
        let node = this._node
        let audio_meta = this.getAudioMetaByName(audio_name)
        if (!audio_meta) {
          throw new Error('audio_meta not found!')
        }
        if (!this._audio_save_dirname || !this._tree_url) {
          throw new Error('Could not save, save directory not found!')
        }
        let audio_save_dir = this._audio_save_dirname
        if (audio_save_dir && !audio_save_dir.endsWith('/')) {
          audio_save_dir += '/'
        }
        let audio_dir_url = this._core.resolveUrl(audio_save_dir, this._tree_url)
        // start recording
        let filename = await this.findUniqueFilename(audio_dir_url, fsFriendlyName(node.text + '_' + audio_name), '.m4a')
        let dest_url = audio_dir_url + filename
        let new_audio_src = audio_save_dir + filename
        this._record_start_time = new Date().getTime()
        let success = await this.startAudioRecording(dest_url)
        if (!success) {
          return [ null, null, null ]
        }
        return [ dest_url, audio_meta, new_audio_src ]
      } catch (err) {
        this._main.displayError(err)
        return [ null, null, null ]
      } finally {
        await this._speech_synthesizer.setAudioBehavior(prev_audio_behavior)
        delete this._record_promise
      }
    })()
  }
  async onCancelRecord () {
    if (this._record_inprogress) {
      return
    }
    try {
      this._record_inprogress = true
      let node = this._node
      let record_promise = this._record_promise
      this.stopAudioRecording()
      let [ dest_url, audio_meta, new_audio_src ] = await record_promise
      if (dest_url == null) {
        return
      }
      await this._fmanager.deleteFile(dest_url)
    } catch (err) {
      this._main.displayError(err)
    } finally {
      this._record_inprogress = false
    }
  }
  async onSaveRecord () {
    if (this._record_inprogress) {
      return
    }
    try {
      this._record_inprogress = true
      let node = this._node
      let record_promise = this._record_promise
      this.stopAudioRecording()
      let [ dest_url, audio_meta, new_audio_src ] = await record_promise
      if (dest_url == null) {
        return
      }
      let prev_src = node.meta[audio_meta.target_meta] ? this._core.resolveUrl(node.meta[audio_meta.target_meta], this._tree_url) : null
      let reverts = node._more_meta.audio_reverts = node._more_meta.audio_reverts || {}
      let has_revert = !!reverts[audio_meta.target_meta]
      if (!has_revert) {
        reverts[audio_meta.target_meta] = prev_src || true
      }
      if (prev_src && has_revert) {
        try {
          await this._fmanager.deleteFile(prev_src)
        } catch (err) {
          console.warn('Could not delete: ' + prev_src)
        }
      }
      node.meta[audio_meta.target_meta] = new_audio_src
      this.addAudioRecord(audio_meta)
    } catch (err) {
      this._main.displayError(err)
    } finally {
      this._record_inprogress = false
    }
  }
  /**** END RECORD AUDIO FEATURE ****/


  /**** START HELPER functions ****/
  async findUniqueFilename (dir, basename, ext) {
    let try_len = 5
    let filename = basename + ext
    let found_path = null
    let path = dir + filename
    while (try_len-- > 0) {
      let exists = await this._fmanager.fileExists(path)
      if (!exists) {
        found_path = path
        break
      }
      filename = basename + '_' + mkRand(5) + ext
      path = dir + filename
    }
    if (found_path == null) {
      throw new Error("Could not find new filename!")
    }
    return filename
  }
  getAudioMetaByName (audio_name) {
    return this._audio_meta_list.find((a) => a.name == audio_name)
  }
  toggleAudioButton (name, b) {
    let tbody = this._document.getElementById('node-audio-tbody')
    let pel = tbody.querySelector(':scope > [data-name="'+name+'"] .play-btn')
    let sel = tbody.querySelector(':scope > [data-name="'+name+'"] .stop-btn')
    pel.classList[b ? 'add' : 'remove']('hide')
    sel.classList[!b ? 'add' : 'remove']('hide')
  }
  /**** END HELPER functions ****/
  

}
