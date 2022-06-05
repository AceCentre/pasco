import Page from './Page'
import PascoCore from '../lib/PascoCore'
import PascoTree from '../lib/PascoTree'
import { RedirectPageException, ErrorMessage } from '../exceptions'
import lodashTemplate from './helpers/lodashTemplate'

class PascoMain extends Page {
  constructor (document) {
    this._document = document
    this._style_elements = []
    this._state = null
  }
  async init () {
    this._core = new PascoCore(this._document)
    await this._core.init()
    this.enableDebugTools()
    this.enableNavigationButtons()
    this._config_url = this._core.resolveUrl(this._core.getEnvValue('default_config_file'))
    await this.loadConfigFile(this._config_url)
    let config = this._config
    this.evalConfig(config)
    if(!config.__did_quick_setup) {
      throw new RedirectPageException('intro.html')
    }
    let locale = config.locale || this._core.getEnvValue('default_locale')
    // prepare the tree
    this._tree = new PascoTree(this._core)
    this._tree_element = this._document.querySelector('#tree')
    this._tree_wrp_element = this._document.querySelector('#tree-wrp')
    if(!this._tree_element || !this._tree_wrp_element) {
      throw new ErrorMessage("Cannot find #tree and/or #tree-wrp element")
    }
    let tree_url = config.tree ?
      this._core.resolveUrl(config.tree, this._config_url) : 
      this._core.resolveUrl(this._core.getEnvValue('default_tree_file'))
    // parallel init localization & init tree
    await Promise.all([
      this._core.initLocalization(locale) // TODO::CHANGE
        .catch((err) => {
          console.warn(err) // pass localize error
        }),
      this.initTreeFromFile(tree_url),
    ])

    
    domlocalize(this._document) // TODO::CHANGE
    
    this.initUI()
    // start pasco
    await this.start()
  }
  async destroy () {

  }
  async initTreeFromFile (tree_url) {
    await this._tree.initFromFile(tree_url)
    this._tree_url = this._tree.getTreeUrl()
    await this._editor_helper.init({
      tree_url: this._tree_url,
      audio_dirname: this._tree.getAudioDir(),
    })
  }
  _prepareForStart () {
    this._tree.initNodesFromTreeData()
    this._root_node = this._tree.getRootNode()
    // init positions
    this._state.positions = [ {
      node: this._root_node,
      index: -1
    } ];
    if (!this._state.edit_mode) {
      if (this._config.helper_back_option) {
        var content_template,
            tmp = document.querySelector('#tree-node-template');
        if(tmp) {
          content_template = loashTemplate(tmp.innerHTML);
        }
        _start_auto_insert_back(tree, content_template, this._config.helper_back_option);
      }
      if (this._config.helper_stay_in_branch_for_all) {
        _helper_add_stay_in_branch_for_all(tree);
      }
      await this.dynupdate(this._root_node)
    }
    var content_template,
        tmp = this._document.querySelector('#tree-node-template');
    if(tmp) {
      content_template = loashTemplate(tmp.innerHTML);
    }
    this._tree_element.innerHTML = ''; // clear all
    tree_mk_list_base(tree, this._tree_element, content_template); // re-create
    return tree;
  }

  start () {

  }


  addAction (name, action) {
    this._actions.push({ name, handler })
  }
  addKeyhitHandler (key, handler) {
    this._keyhits.push({ key, handler })
  }

  initUI () {
    // ios specific
    let html = document.querySelector('html')
    if (html.classList.contains('ios')) {
      html.classList.add('with-fake-scroll');
    }
    // set tree font-size
    if(config.tree_content_size_percentage) {
      _tree_set_contentsize(config.tree_content_size_percentage)
    }
    // set theme class
    if(config.theme) {
      this._page_element.classList.add('theme-' + config.theme);
    }
    this.initMessageBar()
  }
  initMessageBar () {
    // message bar close handler
    for (let btn of document.querySelectorAll('#message-bar-close-btn')) {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        event.preventDefault();
        var wrp = document.querySelector('#message-bar-wrp');
        if (wrp) {
          wrp.classList.add('hide');
        }
      });
    }
    // set message bar custom height
    if (this._config.message_bar_have_custom_height &&
        this._config.message_bar_height > 0 &&
        this._config.message_bar_height <= 100) {
      var html = document.querySelector('html')
      var topbar_offset = 50 + (html.classList.contains('ios') ? 30 : 0)
      var msgbar_wrp = document.querySelector('#message-bar-wrp')
      if (msgbar_wrp) {
        msgbar_wrp.style.height = 'calc(' + config.message_bar_height + 'vh - ' + topbar_offset + 'px)';
      }
    }
    // set message bar font size
    if (this._config.message_bar_font_size_percentage > 0) {
      var msgbar_wrp = document.querySelector('#message-bar-wrp')
      if (msgbar_wrp) {
        msgbar_wrp.style.fontSize = this._config.message_bar_font_size_percentage + '%';
      }
    }
  }
  enableDebugTools () {
    // some hooks
    var el = document.querySelector('#debug-clear-storage')
    if(el) {
      el.addEventListener('click', function() {
        // for cordova
        if(window.cordova) {
          Promise.all([
            delete_file(config_fn),
            tree_fn ? delete_file(tree_fn) : Promise.resolve()
          ])
            .then(function() {
              location.reload();
            })
            .catch(handle_error);
        } else {
          localStorage.clear()
        }
      }, false);
    }
    var el = document.querySelector('#debug-with-fake-scroll-toggle')
    if(el) {
      el.addEventListener('click', function() {
        stop()
          .then(function () {
            var html = document.querySelector('html');
            var active = !html.classList.contains('with-fake-scroll');
            if (active) {
              html.classList.add('with-fake-scroll');
            } else {
              html.classList.remove('with-fake-scroll');
            }
            el.innerHTML = "Wheel With Fake Scroll " + (active ? '[ON]' : '[OFF]');
            state = renew_state(state)
            start(state);
          });
      }, false);
    }
    // add debug keys in key_command watch
    if(napi.available) {
      return Promise.all([
        napi.add_key_command("p"),
        napi.add_key_command("."),
      ])
    }
  }
  enableNavigationButtons () {
    // stop touch/mouse event propagation for these elements
    _.each(document.querySelectorAll('#main-top-navbar,#navbtns-wrp'), function (elm) {
        function actionEventHandler (event) {
          event.stopPropagation()
        }
        elm.addEventListener('click', actionEventHandler, false)
        elm.addEventListener('touchstart', actionEventHandler, false)
        elm.addEventListener('touchend', actionEventHandler, false)
        elm.addEventListener('mousedown', actionEventHandler, false)
        elm.addEventListener('mouseup', actionEventHandler, false)
    })
  }
  async loadConfigFile (config_file) {
    this._config = JSON.parse(await this._core.getFileJSON(config_file))
    this.evalConfig(this.config)
  }
  insertConfigStyles (styles) {
    let style_vars = {
      "__PLATFORM__": this._core.getEnvValue('platform'),
      // window.device ? window.device.platform.toLowerCase() : "default"
    }
    for (let style_link of styles) {
      var elm = document.createElement("link")
      for(var key in style_vars) {
        style_link = style_link.replace(key, style_vars[key])
      }
      elm.setAttribute("rel", "stylesheet")
      elm.setAttribute("href", style_link)
      document.body.appendChild(elm)
      this._style_elements.push(elm)
    }
  }
  _getDefaultKeys () {
    return {
      "39": { action: 'tree_go_in' }, // ArrowRight
      "37": { action: 'tree_go_out' }, // ArrowLeft
      "38": { action: 'tree_go_previous' }, // ArrowUp
      "40": { action: 'tree_go_next' }, // ArrowDown
      "87": { action: 'tree_go_previous' }, // W
      "68": { action: 'tree_go_in' }, // D
      "83": { action: 'tree_go_next' }, // S
      "65": { action: 'tree_go_out' }, // A
      "66": { action: 'tree_go_in' }, // B
    }
  }
  async evalConfig (config) {
    for (let [key, value] = Object.entries(config.keys || this._getDefaultKeys())) {
      let action_name = value.action || value.func
      let action = this._actions.find((a) => a.name == action_name)
      if (!action) {
        throw new Error('Action not found for key: ' + key + ', action: ' + value)
      }
      this.addKeyhitHandler(key, action.handler)
    }
    this._onscreen_navigation_enabled = config.onscreen_navigation == 'enable'
    this._can_edit = !('can_edit' in config) ? true : !!config.can_edit
    this._style_list = Array.isArray(this.config.style) ? this.config.style :
      (this.config.style ? [ this.config.style ] : [])
    this.insertConfigStyles(this._style_list)
  }

}
