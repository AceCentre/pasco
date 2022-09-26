import BasePage from './BasePage'
import PascoCore from '../lib/PascoCore'
import PascoTree from '../lib/PascoTree'
import {
  RedirectPageException, ErrorMessage, NotFoundError
} from '../lib/exceptions'
import {
  getXScaleClassFromSizePercent, getRuntimeEnv,
  LocalStorageTokens, TokenHandler,
} from '../helpers/common'
import { init_range_slider } from '../helpers/uicommon'
import lodashTemplate from '../helpers/lodashTemplate'
import EventManager from '../helpers/EventManager'
import lodashEscape from 'lodash/escape'
import $ from 'jquery'
import { createElementFromHTML, findElementFromParents } from '../helpers/DOMHelpers'
import { findURLRelativePath } from '../helpers/URLHelpers'
import delay from 'delay'
import ConfigureActionsModal from '../lib/internal/edit-config/ConfigureActionsModal'
import VoiceByLocaleModal from '../lib/internal/edit-config/VoiceByLocaleModal'
import VoiceSelectionController from '../lib/internal/edit-config/VoiceSelectionController'
import TreeEditor from '../lib/internal/edit-config/TreeEditor'
import ConfigFormController from '../lib/internal/edit-config/ConfigFormController'
import CustomNodeEditor from '../lib/internal/edit-config/CustomNodeEditor'
import SubMenuController from '../lib/internal/edit-config/SubMenuController'
import CollapsibleContainersController from '../lib/internal/edit-config/CollapsibleContainersController'
import PascoDropboxSync from '../lib/PascoDropboxSync'
import DropboxSyncConfigUI from '../lib/internal/edit-config/DropboxSyncConfigUI'
/* helpers/zip is a copy of static/zipjs/zip.js, It's not an ideal setup, It'd be better if It's replaced with a superior module. */
import zip from '../helpers/zip'

export default class EditConfigPage extends BasePage {
  constructor (document) {
    super(document)
    this._$ = document.querySelector.bind(document)
    this._$a = document.querySelectorAll.bind(document)
    this._event_manager = new EventManager()
    this._voice_selection_list = [
      {
        name: 'auditory_main_voice_options',
        select_id: '_main_voice_id',
        playback_wrapper_selector: '#auditory-main-playback-wrp',
        label: 'Main Voice',
      },
      {
        name: 'auditory_cue_voice_options',
        select_id: '_cue_voice_id',
        playback_wrapper_selector: '#auditory-cue-playback-wrp',
        label: 'Cue Voice',
      },
      {
        name: 'auditory_cue_first_run_voice_options',
        select_id: '_cue_first_run_voice_id',
        playback_wrapper_selector: '#auditory-cue-first-run-playback-wrp',
        label: 'Cue First Run Voice',
      },
    ]
    this._locale_info_list = [
      { locale: "en-GB", label: "English (UK)" },
      { locale: "de", label: "German" },
      { locale: "fr-FR", label: "French" },
      { locale: "es-ES", label: "Spanish" },
      { locale: "ar", label: "Arabic" },
      { locale: "gu", label: "Gujarati" },
      { locale: "cy", label: "Welsh" },
    ]
    this._custom_node_editor_list = []
  }
  async init () {
    let base_url = location+''
    this._core = new PascoCore(this._document, base_url)
    await this._core.init()
    this._fmanager = this._core.getFileManager()
    this._nbridge = this._core.getNativeBridge()
    this._speech_synthesizer = this._core.getSpeechSynthesizer()
    await this._loadVoices()
    await this._prepareJSZip()

    let config_url = this._core.resolveUrl(this._core.getEnvValue('default_config_file'))
    await this.loadConfig(config_url)

    let config = this._config
    this._locale = config.locale || this._core.getEnvValue('default_locale')
    this._localizer = this._core.getLocalizer()
    this._t = this._localizer.t
    let tree_url = config.tree ?
      this._core.resolveUrl(config.tree, this._config_url) : 
      this._core.resolveUrl(this._core.getEnvValue('default_tree_file'))

    // load trees_info
    let trees_info_url = this._core.resolveUrl(this._core.getEnvValue('default_trees_info_file'))
    try {
      await this.loadTreesInfo(trees_info_url)
    } catch (error) {
      console.warn("Could not load trees_info file, " + trees_info_url, error);
      // create a new one
      this._trees_info_url = trees_info_url
      let tree = new PascoTree(this._core)
      await this._tree.initAndReadFromFile(tree_url)
      let current_tree_url = tree.getTreeUrl()
      let current_tree_fn = findURLRelativePath(trees_info_url, current_tree_url)
      if (!current_tree_fn) {
        current_tree_fn = current_tree_url
      }
      let trees_info = { list: [
        {
          name: 'default',
          tree_fn: current_tree_fn,
        }
      ] }
      await this.saveTreesInfo(trees_info)
    }

    // init tree editor section
    this._tree_editor = new TreeEditor(this)
    this._tree_editor.init()
    // parallel init localization & init tree
    await Promise.all([
      this._localizer.load(this._locale)
        .catch((err) => {
          console.warn(err) // pass localize error
        }),
      this._tree_editor.loadTreeFromFile(tree_url),
    ])
    this._localizer.localize()

    this._quick_setup_form = this._$('form[name=quick-setup]')
    this._edit_config_form = this._$('form[name=edit-config]')
    this._is_quick_setup = !!this._quick_setup_form
    this._auto_save_enabled = !this._is_quick_setup
    this._config_form = this._quick_setup_form ? this._quick_setup_form : this._edit_config_form

    this._config_form_controller = new ConfigFormController(this)
    this._config_form_controller.init(this._config)
    this._event_manager.addNodeListenerFor(this._config_form_controller, 'config-change', this.onConfigChange.bind(this))
    this._event_manager.addNodeListenerFor(this._config_form_controller, 'error', (error) => {
      this.onError(error)
    })

    this._initUI()
    
    if (this._is_quick_setup) {
      this.onShowQuickSetupPage()
      this._event_manager.addDOMListenerFor(this._config_form, 'submit', (evt) => {
        evt.preventDefault()
        this.onSubmitQuickSetup()
      }, false)
    } else {
      this._event_manager.addDOMListenerFor(this._config_form, 'submit', (evt) => {
        evt.preventDefault()
        this.setNeedsSaveConfig()
      }, false)
    }
  }
  async destroy () {
    if (this._is_quick_setup) {
      this.onHideQuickSetupPage()
    }
    if (this._configure_actions_modal) {
      this._configure_actions_modal.destroy()
      this._configure_actions_modal = null
    }
    if (this._voice_by_locale_modal) {
      this._voice_by_locale_modal.destroy()
      this._voice_by_locale_modal = null
    }
    if (this._tree_editor) {
      this._tree_editor.destroy()
      this._tree_editor = null
    }
    if (this._config_form_controller) {
      this._config_form_controller.destroy()
      this._config_form_controller = null
    }
    if (this._submenu_controller) {
      this._submenu_controller.destroy()
      this._submenu_controller = null
    }
    if (this._collapsible_containers_controller) {
      this._collapsible_containers_controller.destroy()
    }
    for (let controller of (this._voice_selection_controllers||[])) {
      controller.destroy()
    }
    for (let entry of this._custom_node_editor_list) {
      entry.destroy()
    }
    this._custom_node_editor_list = []
    this._event_manager.removeAllListeners()
  }


  /***** Start UI IMPL *****/
  _initUI () {
    // init modals
    this._initModalsUI()
    // init voice options
    this._initVoiceOptions()
    // locale
    this._initLocaleSelector()
    // init back helper nodes
    this._initBackHelperNodes()
    // dropbox sync
    this._initDropboxSync()
    if (!this._is_quick_setup) {
      this._submenu_controller = new SubMenuController(this)
      this._submenu_controller.init()
      this._event_manager.addNodeListenerFor(this._submenu_controller, 'page-active', this.onPageActive.bind(this))
      this._event_manager.addNodeListenerFor(this._submenu_controller, 'page-inactive', this.onPageInactive.bind(this))
      // setup navigation controller
      this._event_manager.addDOMListenerFor(window, 'popstate', this.onUpdateLocationState.bind(this))
      // by default calls for update state after one second of init process
      setTimeout(this.onUpdateLocationState.bind(this), 1000)
    }
    // init collapsible containers
    this._collapsible_containers_controller = new CollapsibleContainersController(this._document)
    this._collapsible_containers_controller.init()
    // init custom/misc items
    this._initSaveModal()
    this._initCustomFormResponsiveFeatures()
    for (let elm of this._$a('#ios-open-route-view')) {
      this._event_manager.addDOMListenerFor(elm, 'click', async (evt) => {
        evt.preventDefault()
        if (this._nbridge.available) {
          try {
            await this._nbridge.ios_open_manage_output_audio_view()
          } catch (err) {
            console.error(err)
          }
        }
      })
    }
  }
  _initSaveModal () {
    for (let elm of this._$a('#save-file--share-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', async (evt) => {
        evt.preventDefault()
        let modal = this._$('#save-file-modal');
        if (modal.length == 0) {
          return // should never happen
        }
        try {
          let nfilepath = modal._nfilepath;
          if (!nfilepath) {
            throw new Error('No file to share!')
          }
          await (new Promise((resolve, reject) => {
            try {
              var options = {
                //message: 'tree.zip, pasco tree package',
                files: [nfilepath],
                chooserTitle: 'Share/Save the package'
              };
              var onSuccess = (result) => {
                resolve()
              }
              var onError = (msg) => {
                reject(new Error("Sharing failed, " + msg));
              }
              window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError)
            } catch(err) {
              reject(err)
            }
          }))
        } catch (error) {
          this.alertWithNotice({ type: 'failure', error })
        }
      })
    }
  }
  _initModalsUI () {
    let modals = []
    this._voice_by_locale_modal = new VoiceByLocaleModal(this._document, 'voice-by-locale', this._core)
    modals.push(this._voice_by_locale_modal)
    this._event_manager.addNodeListenerFor(this._voice_by_locale_modal, 'change', (change) => {
      let vbl_name = this._voice_by_locale_modal.getVoiceId()
      let id = this._voice_by_locale_modal.getVoiceId()
      let voice_options = this._config[vbl_name]
      voice_options.locale_voices = change.voices
      this.setNeedsSaveConfig()
    })
    for (let elm of this._$a('.vbl-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', async (evt) => {
        let vbl_name = elm.getAttribute('data-vbl')
        let voice_selobj = this._voice_selection_list.find((a) => a.name == vbl_name)
        if (!voice_selobj) {
          console.warn("no link found!")
          return
        }
        let voice_options = this._config[vbl_name]
        let label = this._t(voice_selobj.label)
        let data = {
          voices: voice_options.locale_voices || [],
        }
        await this._voice_by_locale_modal.init(vbl_name, label, data, this._locale_info_list)
        this._voice_by_locale_modal.open()
      })
    }

    this._configure_actions_modal = new ConfigureActionsModal(this._document, 'configure-action', this._core)
    modals.push(this._configure_actions_modal)
    this._event_manager.addNodeListenerFor(this._configure_actions_modal, 'change', (change) => {
      this._config.keys = change.keys
      this.setNeedsSaveConfig()
    })
    for (let elm of this._$a('.configure-actions-wrp button[data-action]')) {
      this._event_manager.addDOMListenerFor(elm, 'click', async (evt) => {
        let text = elm.textContent
        let action = elm.getAttribute('data-action')
        if (action) {
          await this._configure_actions_modal.init(this._config, action, text)
          this._configure_actions_modal.open()
        }
      })
    }
    for (let modal of modals) {
      this._event_manager.addNodeListenerFor(modal, 'error', (error) => {
        this.onError(error)
      })
    }
  }
  _initBackHelperNodes () {
    ;[
      {
        text_input_selector: '#helper_back_option_main_text',
        record_section_selector: '#helper_back_option_main_record',
        audio_dest: 'back-main.m4a',
      },
      {
        text_input_selector: '#helper_back_option_cue_text',
        record_section_selector: '#helper_back_option_cue_record',
        audio_dest: 'back-cue.m4a',
      },
    ].forEach((info) => {
      let record_section = this._$(info.record_section_selector)
      if (!record_section) {
        return
      }
      let text_input = this._$(info.text_input_selector)
      let customNodeEditor = new CustomNodeEditor(this)
      customNodeEditor.init({
        text_input,
        record_section,
        audio_dest: info.audio_dest,
        audio_dest_url: this._core.resolveUrl(info.audio_dest, this._config_url),
      })
      this._custom_node_editor_list.push(customNodeEditor)
    })
  }
  _initVoiceOptions () {
    // insert voice options
    let voice_by_id = Object.fromEntries(this._voices.map((a) => [ a.id, a ]))
    this._voice_selection_controllers = []
    for (let voice_sel of this._voice_selection_list) {
      if (this._is_quick_setup && voice_sel.name == 'auditory_cue_first_run_voice_options') {
        continue // does not exists on quick setup
      }
      let controller = new VoiceSelectionController(this)
      let voice_options = this._config_form_controller.getVoiceTypeOptions(voice_sel.name)
      controller.init(voice_sel, voice_options)
      this._voice_selection_controllers.push(controller)
    }
  }
  _initLocaleSelector () {
    for (let elm of this._$a('#locale-select')) {
      this._event_manager.addDOMListenerFor(elm, 'change', async (evt) => {
        try {
          this._locale = this._config.locale || this._core.getEnvValue('default_locale')
          await this._localizer.load(this._locale)
          this._localizer.localize()
        } catch (err) {
          this.onError(err)
        }
      }, false)
    }
  }
  _initDropboxSync () {
    let dpsync_wrp = this._document.querySelector('#dropbox-sync-wrp')
    if (dpsync_wrp) { // init DropboxSyncConfigUI
      let tokenstorage = new LocalStorageTokens()
      let tokenhandler = new TokenHandler(tokenstorage, 'dropbox')
      let dpsync = new PascoDropboxSync(this._core, tokenhandler)
      let dpsync_ui = new DropboxSyncConfigUI(this, dpsync, dpsync_wrp)
      dpsync_ui.setState({ 
        pasco_data_state: this._core.getDataState(),
        config_fn: this._config_url,
        trees_info_fn: this._trees_info_url,
      })
      dpsync_ui.init()
    }
  }
  _initRangeSlidersInContainer (container) {
    for (let elm of container.querySelectorAll('input[type="range"]')) {
      elm.__rangeslider = init_range_slider(elm)
    }
  }
  _destroyRangeSlidersInContainer (container) {
    for (let elm of container.querySelectorAll('input[type="range"]')) {
      if (elm.__rangeslider) {
        elm.__rangeslider.destroy();
        delete elm.__rangeslider;
      }
    }
  }
  _initCustomFormResponsiveFeatures () {
    // set the initial value for dependent elements, (data-collapse-toggle)
    for (let elm of this._$a('input[data-inp-collapse-toggle]')) {
      if (['checkbox','radio'].indexOf(elm.type) == -1) {
        continue
      }
      let toggle_sel = elm.getAttribute('data-inp-collapse-toggle')
      for (let toggle_elm of this._$a(toggle_sel)) {
        this._collapsible_containers_controller.toggleCollapsible(toggle_elm, elm.checked)
      }
    }
    // update collapsible based on inp-collapse-toggle
    this._event_manager.addDOMListenerFor(this._document, 'change', (evt) => {
      if (evt.target.nodeName == 'INPUT' &&
          ['checkbox','radio'].indexOf(evt.target.type) != -1) {
        let elm = evt.target
        if (elm.type == 'radio' && !elm._others_triggered) {
          // trigger change for all with same name
          let form = findElementFromParents(elm, (a) => a.nodeName == 'FORM')
          if (form) {
            for (let radio of form.querySelectorAll('input[type=radio]')) {
              if (radio.name == elm.name && elm != radio) {
                radio._others_triggered = true
                radio.dispatchEvent(new Event('change', { bubbles: true }))
                delete radio._others_triggered
              }
            }
          }
        }
        var toggle_sel = elm.getAttribute('data-inp-collapse-toggle')
        if (toggle_sel) {
          var toggle_elm = this._$(toggle_sel)
          if (toggle_elm) {
            this._collapsible_containers_controller.toggleCollapsible(toggle_elm, evt.target.checked)
          }
        }
      }
    })
    // update dependent inputs
    let _onInputDataDispUpdate = (elm, disp_selector) => {
      let value = elm.value
      for (let other of this._$a(disp_selector)) {
        other.textContent = `[${value}]`
      }
    }
    let _onDependentInputUpdate = (elm, dependent_selector) => {
      if (!elm.__dependent_disabled && dependent_selector) {
        let value = elm.value
        if (typeof value != 'number') {
          value = parseFloat(value)
        }
        if (isNaN(value)) {
          return
        }
        let others = Array.from(this._$a(dependent_selector))
        // prevent endless loops
        for (let other of others) {
          other.__dependent_disabled = true
        }
        // perform the change
        for (let other of others) {
          if (Math.abs(parseFloat(other.value) - value) < 0.001) {
            break // no need to change dependent value
          }
          let lvalue = value
          let max = other.max ? parseFloat(other.max) : NaN
          let min = other.min ? parseFloat(other.min) : NaN
          if (!isNaN(max) && lvalue > max) {
            lvalue = max
          }
          if (!isNaN(min) && lvalue < min) {
            lvalue = min
          }
          other.value = lvalue
          if (other.type == 'range' && other.__rangeslider) {
            other.__rangeslider.update({ value: other.value });
          } else {
            other.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        // remove __dependent_disabled
        for (let other of others) {
          other.__dependent_disabled = false
        }
      }
    }
    this._event_manager.addDOMListenerFor(this._document, 'input', (evt) => {
      let elm = evt.target
      if (elm.nodeName == 'INPUT' &&
          ['number','range'].indexOf(elm.type) != -1) {
        let dependent_selector = elm.getAttribute('data-dependent')
        _onDependentInputUpdate(evt.target, dependent_selector)
      }
      if (evt.target.nodeName == 'INPUT') {
        let disp_selector = elm.getAttribute('data-disp')
        if (disp_selector) {
          _onInputDataDispUpdate(evt.target, disp_selector)
        }
      }
    }, true)
    // initial sync dependent data of config form inputs
    for (let elm of this._config_form.querySelectorAll('input[type=range],input[type=number]')) {
      let input_name = elm.getAttribute('name')
      let dependent_selector = elm.getAttribute('data-dependent')
      if (input_name && dependent_selector) {
        _onDependentInputUpdate(elm, dependent_selector)
      }
    }
    // initial sync inputs with data-disp attr
    for (let elm of this._$a('input')) {
      let disp_selector = elm.getAttribute('data-disp')
      if (disp_selector) {
        _onInputDataDispUpdate(elm, disp_selector)
      }
    }
  }
  /***** END UI IMPL  *****/


  /***** START EVENT HANDLERS *****/
  onConfigChange (config) {
    this._config = config
    this.emit('config-change', config)
    if (this._auto_save_enabled) {
      this.setNeedsSaveConfig()
    }
  }
  onUpdateLocationState () {
    if (this._submenu_controller) {
      if (location.hash.indexOf('#!') == 0) {
        this._submenu_controller.openPage(location.hash.substr(2))
      } else {
        this._submenu_controller.openPage('')
      }
    }
  }
  onError (error) {
    this.displayError(error)
  }
  onPageActive (name) {
    for (let section of this._$a('.edit-config-container .page-sect')) {
      let elm_pagename = section.getAttribute('data-name')
      if (elm_pagename == name) {
        // update collapsibles
        for (let elm of section.querySelectorAll('.x-collapsible')) {
          this._collapsible_containers_controller.updateCollapsible(elm)
        }
        this._initRangeSlidersInContainer(section)
      }
    }
  }
  onPageInactive (name) {
    for (let section of this._$a('.edit-config-container .page-sect')) {
      let elm_pagename = section.getAttribute('data-name')
      if (elm_pagename == name) {
        this._destroyRangeSlidersInContainer(section)
      }
    }
  }
  onShowQuickSetupPage () {
    this._initRangeSlidersInContainer(this._config_form)
  }
  onHideQuickSetupPage () {
    this._destroyRangeSlidersInContainer(this._config_form)
  }
  async onSubmitQuickSetup () {
    let form = this.getConfigForm()
    let displayErrorInForm = (error) => {
      let alert = form.querySelector('.save-section .alert-danger')
      if (!alert) {
        this.onError(error)
      } else {
        console.error(error)
        alert.innerHTML = this._errorToHtml(error)
        alert.classList.remove('alert-hidden')
      }
    }
    try {
      let tree_select = this._$('#tree-default-select')
      if (!tree_select.value) {
        throw new Error("Please select a tree")
      }
      let tree_name = tree_select.value
      let default_tree_url = await this._tree_editor.getDefaultTreeUrl(tree_name, this._locale)
      let datastate = this._core.getDataState()
      // write default_tree
      let default_tree_info = this._trees_info.list.find((a) => a.name == 'default')
      if (!default_tree_info) {
        default_tree_info = {
          name: 'default',
          tree_fn: 'default/default.md',
        }
        this._trees_info.list.push(default_tree_info)
        await this.saveTreesInfo(this._trees_info)
      }
      let host_tree_dir_prefix = this._core.getEnvValue('host_tree_dir_prefix')
      await datastate.storeTree(default_tree_info.tree_fn, default_tree_url, new URL(host_tree_dir_prefix, location+'').href)
      this._config_form_controller.updateConfig()
      let config = this._config_form_controller.getConfig()
      config.__did_quick_setup = true;
      config.tree = default_tree_info.tree_fn
      await this.saveConfig(config)
      await this._core.updateDataState()
      window.location = 'index.html' // open index page
    } catch (error) {
      displayErrorInForm(error)
    }
  }
  /***** END EVENT HANDLERS *****/

  /***** START MAIN API *****/
  getDocument () {
    return this._document
  }
  getCore () {
    return this._core
  }
  getConfig () {
    return this._config
  }
  getLocalizer () {
    return this._localizer
  }
  getTreesInfo () {
    return this._trees_info
  }
  getTreesInfoUrl () {
    return this._trees_info_url
  }
  getConfigForm () {
    return this._config_form
  }
  isQuickSetupMode ()  {
    return this._is_quick_setup
  }
  getVoices () {
    return this._voices
  }
  getVoiceSelectionList () {
    return this._voice_selection_list
  }
  getLocale () {
    return this._locale
  }
  alertWithNotice (data) {
    let success = data.type == 'success'
    if(this.__update_alert_timeout) {
      clearTimeout(this.__update_alert_timeout)
    }
    let settings_success_alert_elm = this._$('.settings-success-alert')
    let settings_danger_alert_elm = this._$('.settings-danger-alert')
    let alert_success_elm = this._$('.settings-success-alert .alert-success')
    let alert_danger_elm = this._$('.settings-danger-alert .alert-danger')
    if (!alert_success_elm || !alert_danger_elm ||
        !settings_success_alert_elm || !settings_danger_alert_elm) {
      throw new Error('One of alertWithNotice elements not found!')
    }
    settings_success_alert_elm.classList[success ? 'add' : 'remove']('visible')
    settings_danger_alert_elm.classList[!success ? 'add' : 'remove']('visible')
    if (success) {
      let message = data.message || 'Saved!'
      let strong_elm = this._document.createElement('strong')
      strong_elm.textContent = message
      alert_success_elm.innerHTML = ''
      alert_success_elm.appendChild(strong_elm)
      alert_success_elm.classList.remove('alert-hidden')
    } else {
      if (data.error) {
        console.error(data.error)
      }
      alert_danger_elm.innerHTML = this._errorToHtml(data.error || data.message)
      alert_danger_elm.classList.remove('alert-hidden')
    }
    this.__update_alert_timeout = setTimeout(() => {
      settings_success_alert_elm.classList.remove('visible')
      settings_danger_alert_elm.classList.remove('visible')
      this.__update_alert_timeout = setTimeout(() => {
        alert_success_elm.classList.add('alert-hidden')
        alert_danger_elm.classList.add('alert-hidden')
        alert_success_elm.innerHTML = ''
        alert_danger_elm.innerHTML = ''
        delete this.__update_alert_timeout
      }, 510)
    }, 3000)
  }
  setNeedsSaveConfig () {
    if (this._save_config_timeout != null) {
      clearTimeout(this._save_config_timeout)
    }
    this._save_config_timeout = setTimeout(async () => {
      try {
        await this.saveConfig(this._config)
        this.alertWithNotice({ type: 'success', message: 'Saved!' })
      } catch (err) {
        this.onError(err)
      }
    }, 500)
  }
  async loadConfig (config_url) {
    this._config_url = config_url
    this._config = await this._fmanager.loadFileJson(config_url)
    this._fixConfig(this._config)
  }
  async saveConfig (config) {
    this._config = config
    this._fmanager.saveFileJson(this._config_url, config)
  }
  async loadTreesInfo (trees_info_url) {
    this._trees_info_url = trees_info_url
    this._trees_info = await this._fmanager.loadFileJson(trees_info_url)
  }
  async saveTreesInfo (trees_info) {
    this._trees_info = trees_info
    this._fmanager.saveFileJson(this._trees_info_url, trees_info)
  }
  async displaySaveModal (name, blob) {
    var modal = this._$('#save-file-modal')
    if (!modal) {
      return // should never happen
    }
    if (getRuntimeEnv() == 'cordova') {
      try {
        // There might be a better place to store the file for sharing, TODO:: fix it
        let legacy_dir_url = this._core.getEnvValue('user_dir_prefix')
        var filepath = legacy_dir_url + name
        await this._fmanager.saveFileData(filepath, blob)
        await (new Promise(function(resolve, reject) {
          resolveLocalFileSystemURL(filepath, (entry) => {
            modal._nfilepath = entry.toURL()
            resolve()
          }, reject)
        }))
        $(modal).modal('show')
        await delay(500)
        let share_btn = this._$('#save-file--share-btn ')
        if (share_btn) {
          share_btn.click()
        }
      } catch (err) {
        console.error(err)
        this.alertWithNotice({
          type: 'failure',
          error: new Error('Could not share file!'),
        })
      }
    } else {
      $(modal).modal('show')
		  let blobURL = URL.createObjectURL(blob)
      let file_btn = this._$('#save-file--open-btn')
      if (file_btn) {
        file_btn.href = blobURL
        file_btn.download = name
        await delay(500)
        file_btn.click()
      }
    }
  }
  /***** END MAIN API *****/

  /***** START HELPER FUNCTIONS *****/
  async _loadVoices () {
    this._voices = await this._speech_synthesizer.getVoices()
  }
  async _prepareJSZip () {
    if (getRuntimeEnv() == 'cordova') {
      zip.workerScriptsPath = null
      let zipBlobs = await Promise.all([ 'z-worker.js', 'deflate.js', 'inflate.js' ].map((fn) => {
        return new Promise((resolve, reject) => {
          var fndir = 'cdvfile://localhost/bundle/www/webpack/static/js/zipjs/'
          window.resolveLocalFileSystemURL(fndir + fn, (entry) => {
            entry.file((file) => {
              var reader = new FileReader()
              reader.onloadend = () => {
                var blob = new Blob([this.result], { type: 'application/javascript' })
                resolve(URL.createObjectURL(blob))
              }
              reader.readAsText(file)
            }, reject)
          }, reject)
        })
      }))
      zip.workerScripts = {
        deflater: [ zipBlobs[0], zipBlobs[1] ],
        inflater: [ zipBlobs[0], zipBlobs[2] ],
      }
    } else {
      zip.workerScriptsPath = 'webpack/static/js/zipjs/'
    }
  }

  _mkVBLVoiceTMPLOptions (locale) {
    let vlist = this._voices.filter((v) => v.locale == locale)
    if (vlist.length == 0) {
      vlist = this._voices.filter((v) => (v.locale+"").split('-')[0] == locale.split('-')[0])
    }
    return vlist.map((v) => ({ value: v.id, label: v.label }))
  }
  /**
   * tiny script to fix incorrect data in config
   * this function should eventually get removed once vast majority
   * of users get their config fixed
   */
  _fixConfig (cfg) {
    if (cfg.minimum_cue_time == null) {
      cfg.minimum_cue_time = 0
    }
    if(!cfg.auditory_cue_first_run_voice_options &&
       !cfg._auditory_cue_first_run_voice_options) {
      cfg._auditory_cue_first_run_voice_options =  {
        "volume": 1.0,
        "rate": "default",
        "rateMul": 1.5,
        "pitch": 1.0
      }
    }
    // by default add all choices for each voice option
    this._voice_selection_list.forEach((entry) => {
      let { name } = entry
      let voice_options = cfg[name]
      if (voice_options && !voice_options.locale_voices) {
        voice_options.locale_voices = this._locale_info_list
          .map((linfo) => {
            let opts = this._mkVBLVoiceTMPLOptions(linfo.locale)
            if (opts.length > 0) {
              let vidname = (this._speech_synthesizer.isNative() ? '' : 'alt_') + 'voiceId'
              var ret = { locale: linfo.locale }
              ret[vidname] = opts[0].value
              return ret
            }
          })
          .filter((a) => !!a)
      }
    })
    if (!cfg.keys) {
      cfg.keys = cfg.switch_keys || cfg.auto_keys || {}
      for (var key in cfg.keys) {
        if (cfg.keys.hasOwnProperty(key)) {
          var ckey = cfg.keys[key]
          if (ckey.comment) {
            ckey.label = ckey.comment
            delete ckey.comment
          }
        }
      }
      cfg.keys["66"] = { "func": "tree_go_in", "label": "b" }
    }
    if (!cfg.helper_back_option) {
      if (cfg.back_at_end) {
        cfg.helper_back_option = "end"
      } else {
        cfg.helper_back_option = ""
      }
    }
    delete cfg.back_at_end
  }
  _errorToHtml (err) {
    return '<strong>Error:</strong> ' + (err+'').replace(/^error:\s*/i, "")
  }
  /***** END HELPER FUNCTIONS *****/

}
