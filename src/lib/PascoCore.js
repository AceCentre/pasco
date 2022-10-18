import { getRuntimeEnv } from '../helpers/common'
import { NotFoundError } from './exceptions'
import PascoDataState from './PascoDataState'
import PascoFileManager from './PascoFileManager'
import PascoNativeBridge from './PascoNativeBridge'
import PascoSpeechSynthesizer from './PascoSpeechSynthesizer'
import DOMLocalizer from './DOMLocalizer'

const IS_CORDOVA = getRuntimeEnv() == 'cordova'

export default class PascoCore {
  constructor (document, base_url) {
    this._document = document
    this._base_url = base_url
    let host_tree_dir_prefix = 'trees/'
    this._environ = {
      'default_locale': 'en-GB',
      'default_config_file': 'config.json',
      'default_trees_info_file': 'trees-info.json',
      'host_tree_dir_prefix': host_tree_dir_prefix,
      'default_tree_file': host_tree_dir_prefix + 'default/default.md',
      'user_dir_prefix': IS_CORDOVA ? 'cdvfile://localhost/persistent/' : 'file:///',
    }
  }
  getEnvValue (name) {
    return this._environ[name]
  }
  setEnvValue (name, value) {
    this._environ[name] = value
  }
  async init () {
    this._localizer = new DOMLocalizer(new URL('l10n', this._base_url).href, this._document)
    this._native_bridge = new PascoNativeBridge();
    this._filemanager = new PascoFileManager(this._base_url)
    this._speech_synthesizer = new PascoSpeechSynthesizer(this._native_bridge, this._filemanager)
    await this._speech_synthesizer.init()
    // open url handler, pasco://
    PascoNativeBridge.addOpenURLHandler((url) => {
      let files = ['index.html','edit-config.html']
      for (let i = 0; i < files.length; i++) {
        let file = files[i]
        let prefix = 'pasco:///' + file
        if (url.indexOf(prefix) == 0 && (url.length == prefix.length || url[prefix.length] == '?')) {
          let newloc = file + url.substring(prefix.length)
          if (window.location+'' != newloc) {
            window.location = newloc
          }
        }
      }
    })
    // init datastate
    // first try to load pasco-state.json, v1
    let state_dir_url = this.getEnvValue('user_dir_prefix') + 'v1/'
    let state_url = state_dir_url + 'pasco-state.json'
    try {
      this._datastate = await PascoDataState.loadFromFile(state_url, this._filemanager)
    } catch (err) {
      if (!(err instanceof NotFoundError)) {
        throw err
      }
    }
    // modify config and trees_info if needed
    if (!this._datastate) {
      // data state is not available
      // should decide to use legacy version or create a data state
      // depending on existance of the config file
      let legacy_dir_url = this.getEnvValue('user_dir_prefix')
      let config_url = legacy_dir_url + this.getEnvValue('default_config_file')
      if (await this._filemanager.fileExists(config_url)) {
        // upgrade to v1
        let trees_info_url = legacy_dir_url + this.getEnvValue('default_trees_info_file')
        this._datastate = await PascoDataState.rebuildStateFromLegacy(config_url, trees_info_url, state_dir_url, this._filemanager)
      } else {
        // It is the first run, setup pasco-state.json
        this._datastate = new PascoDataState(state_url, this._filemanager)
        let trees_info = { list: [ ] }
        let config_src = 'config.json'
        let trees_info_src = 'trees-info.json'
        await this._filemanager.mkdirRec(this._datastate.getStateDirUrl())
        let config_data = await this._filemanager.loadFileData(this.getEnvValue('default_config_file'))
        let config = JSON.parse(config_data)
        await Promise.all([
          this._filemanager.saveFileData(this.resolveUrl(config_src), config_data),
          this._filemanager.saveFileJson(this.resolveUrl(trees_info_src), trees_info),
        ])
        await this._datastate.init(config_src, trees_info_src)
        await this._datastate.save()
      }
    }
    let data = this._datastate.getData()
    this.setEnvValue('default_config_file', this.resolveUrl(data.config))
    this.setEnvValue('default_trees_info_file', this.resolveUrl(data.trees_info))
    this.initUI()
  }
  initUI () {
    if (IS_CORDOVA) {
      // Adds the platform (ie iOS) and 'cordova' to html tag
      var html = this._document.querySelector('html')
      if(window.device) {
        html.classList.add(window.device.platform.toLowerCase());
      }
      html.classList.add('cordova');
      // Polyfill window.open to use the cordova open function instead
      if (cordova.InAppBrowser != null) {
        window.open = cordova.InAppBrowser.open
        // Anytime a link is clicked with the _blank attribute it should
        // be opened in _system instead, So the page opens outside of the app
        $('body').on('click', 'a[target="_blank"]', (evt) => {
          evt.preventDefault();
          window.open($(evt.currentTarget).attr('href'), '_system', '');
        })
      }
    }
  }
  async destroy () {
    if (this._speech_synthesizer) {
      await this._speech_synthesizer.destroy()
    }
  }
  async updateDataState () {
    if (!this._datastate) {
      return // skip
    }
    await this._datastate.reinit()
    this._datastate.save()
  }
  resolveUrl (link, base) {
    if (this._datastate) {
      return this._datastate.resolve_url(link, base)
    } else {
      return link // legacy relative links are determined by browser
    }
  }
  getFileManager () {
    return this._filemanager
  }
  getDataState () {
    return this._datastate
  }
  getNativeBridge () {
    return this._native_bridge
  }
  getSpeechSynthesizer () {
    return this._speech_synthesizer
  }
  getLocalizer () {
    return this._localizer
  }
}
