import BasePage from './BasePage'
import PascoCore from '../lib/PascoCore'
import PascoTree from '../lib/PascoTree'
import DOMLocalizer from '../lib/DOMLocalizer'
import { RedirectPageException, ErrorMessage } from '../exceptions'
import lodashTemplate from './helpers/lodashTemplate'
import PascoDynNodeGenerator from '../PascoDynNodeGenerator'
import PascoEngine from '../lib/PascoEngine'


class PascoMain extends BasePage {
  constructor (document) {
    this._document = document
    this._style_elements = []
    this._event_handlers_list = []
    this._state = null
    this._pengine = null
  }
  async init () {
    this._core = new PascoCore(this._document)
    await this._core.init()
    this._native_bridge = new PascoNativeBridge();
    this._speech_synthesizer = new PascoSpeechSynthesizer(this._native_bridge)
    await this._speech_synthesizer.init();
    this.enableDebugTools()
    this._config_url = this._core.resolveUrl(this._core.getEnvValue('default_config_file'))
    await this.loadConfigFile(this._config_url)
    let config = this._config
    this.evalConfig(config)
    if(!config.__did_quick_setup) {
      throw new RedirectPageException('intro.html')
    }
    let locale = config.locale || this._core.getEnvValue('default_locale')
    this._localizer = new DOMLocalizer('/l10n', this._document)
    // prepare the tree
    this._tree = new PascoTree(this._core)
    this._root_node_element = this._document.querySelector('#tree')
    this._tree_wrp_element = this._document.querySelector('#tree-wrp')
    if(!this._root_node_element || !this._tree_wrp_element) {
      throw new ErrorMessage("Cannot find #tree and/or #tree-wrp element")
    }
    let tree_url = config.tree ?
      this._core.resolveUrl(config.tree, this._config_url) : 
      this._core.resolveUrl(this._core.getEnvValue('default_tree_file'))
    // parallel init localization & init tree
    await Promise.all([
      this._localizer.load(locale)
        .catch((err) => {
          console.warn(err) // pass localize error
        }),
      this.initTreeFromFile(tree_url),
    ])
    this._localizer.localize()
    this.initDebugEventHandlers()
    this.initUI()

    this._edit_mode_enabled = false
    if (config.can_edit) {
      let tmp
      tmp = document.querySelector('#edit-mode-btn')
      this._addEventListenerFor(tmp, 'click', _on_edit_mode, false)
      tmp = document.querySelector('#edit-mode-save-btn')
      this._addEventListenerFor(tmp, 'click', _on_edit_save, false)
      tmp = document.querySelector('#edit-mode-cancel-btn')
      this._addEventListenerFor(tmp, 'click', _on_edit_cancel, false)
    }
    _edit_mode_toggle(this._edit_mode_enabled, false)

    this._pengine = new PascoEngine()
    // start pasco
    await this.start()
  }
  async destroy () {
    if (this._speech_synthesizer) {
      this._speech_synthesizer.destroy()
    }
    if (this._state && this._edit_mode_enabled && this._root_node) {
      editor_helper.on_restore(this._root_node)
    }
    for (let { obj, name, handler, capture } of this._event_handlers_listthis._event_handlers_list) {
      obj.removeEventListener(name, handler, capture)
    }
    this._event_handlers_list = []
    for (let style of this._style_elements) {
      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
    }
    this._style_elements = []
  }
  stop () {
    
  }
  _resetState () {
    
  }
  getCore () {
    return this._core
  }
  async initTreeFromFile (tree_url) {
    await this._tree.initFromFile(tree_url)
    this._tree_url = this._tree.getTreeUrl()
    await this._editor_helper.init({
      tree_url: this._tree_url,
      audio_dirname: this._tree.getAudioDir(),
    })
  }
  renderNode (node) {
    if (this._root_node == node) {
      // use shortcut for root node
      this._root_node_element.innerHTML = '';
      this.makeNodeElements(this._root_node, this._root_node_element, node_content_template)
      return
    }
    var node_content_template;
    {
      let tmp = this._document.querySelector('#tree-node-template');
      if(tmp) {
        node_content_template = lodashTemplate(tmp.innerHTML);
      }
    }
    var repelm = document.createElement('li')
    let node_dom_element = node.dom_element
    let parentNode = node_dom_element.parentNode;
    this.makeNodeElements(node, repelm, node_content_template)
    if (parentNode) {
      parentNode.insertBefore(repelm, node_dom_element);
      parentNode.removeChild(node_dom_element);
    }
  }

  async _prepareForStart () {
    this._tree.initNodesFromTreeData()
    this._root_node = this._tree.getRootNode()
    let node_content_template
    let tmp = document.querySelector('#tree-node-template');
    if(tmp) {
      node_content_template = lodashTemplate(tmp.innerHTML);
    }
    // init positions
    this._state.positions = [ {
      node: this._root_node,
      index: -1
    } ];
    if (!this._state.edit_mode) {
      if (this._config.helper_back_option) {
        _start_auto_insert_back(tree, node_content_template, this._config.helper_back_option);
      }
      if (this._config.helper_stay_in_branch_for_all) {
        _helper_add_stay_in_branch_for_all(tree);
      }
      await this.dynupdate({ skip_render_elements: true })
    }
    // clear all & create tree elements
    this._root_node_element.innerHTML = '';
    this.makeNodeElements(this._root_node, this._root_node_element, node_content_template)
  }

  generateDynRevertData (node) {
    node.__dynrevert_data = {
      node,
      child_nodes_data: node.is_leaf ? null : node.child_nodes.map(this.getDynRevertData.bind(this)),
    }
  }

  revertDyn (node) {
    if (node.__dynrevert_data) {
      this._revertDynSub(node.__dynrevert_data)
    }
  }
  _revertDynSub ({ node, child_nodes_data }) {
    if (!node.is_leaf && child_nodes_data) {
      delete node.__dynrevert_data
      node.child_nodes = child_nodes_data.map((a) => a.node)
      child_nodes_data.forEach(this._revertDynSub.bind(this))
    }
  }

  async generateDyn (node, options) {
    options = options || {}
    this.revertDyn(node)
    this.generateDynRevertData(node)
    await this._dyngenerator.generate(node)
    if (options.skip_render_elements) {
      return
    }
    var node_content_template;
    {
      let tmp = document.querySelector('#tree-node-template');
      if(tmp) {
        node_content_template = lodashTemplate(tmp.innerHTML);
      }
    }
    var repelm = document.createElement('li')
    let node_dom_element = node.dom_element
    let parentNode = node_dom_element.parentNode;
    this.makeNodeElements(node, repelm, node_content_template)
    if (options.changing_position) {
      this.runOnNextUpdateActivePositions(onend)
    } else {
      onend();
    }
    function onend () {
      if (parentNode) {
        parentNode.insertBefore(repelm, node_dom_element);
        parentNode.removeChild(node_dom_element);
      }
    }
  }


  async dynupdate2 (node, options) {
    options = options || {}
    // this._resetFromStaticRootNode()
    let cloned_node = node.__static_node.clone()
    {
      let idx = this._state.positions.findIndex((a) => a.node == node)
      if (idx != -1) {
        this._state.positions = this._state.positions.slice(0, idx)
        this._state.positions.push({
          node: cloned_node,
          index: -1,
        })
      }
    }
    if (node.parent_node) {
      let idx = node.parent_node.child_nodes.indexOf(node)
      if (idx == -1) {
        throw new Error('node does not contain in parent_node')
      }
      node.parent_node.child_nodes.splice(idx, 1, cloned_node)
    }
    await this._dyngenerator.generate(node)
    if (options.skip_render_elements) {
      return
    }
    var node_content_template;
    {
      let tmp = document.querySelector('#tree-node-template');
      if(tmp) {
        node_content_template = lodashTemplate(tmp.innerHTML);
      }
    }
    var repelm = document.createElement('li')
    let node_dom_element = node.dom_element
    let parentNode = node_dom_element.parentNode;
    this.makeNodeElements(node, repelm, node_content_template)
    if (options.changing_position) {
      this.runOnNextUpdateActivePositions(onend)
    } else {
      onend();
    }
    function onend () {
      if (parentNode) {
        parentNode.insertBefore(repelm, node_dom_element);
        parentNode.removeChild(node_dom_element);
      }
    }
  }

  async start () {
    await this._prepareForStart()
    
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
    // init on-screen navigation
    navbtns_init();
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

  enableWheelCapture () {
    var html = document.querySelector('html');
    if (html.classList.contains('with-fake-scroll')) {
      // ios has fake-scroll adjust scroll state according to that
      html.classList.add('has-fake-scroll');
      window.scrollTo(60, 60);
      window._last_scroll_x = window.scrollX;
      window._last_scroll_y = window.scrollY;
      document.addEventListener('scroll', _on_scroll, false);
    } else {
      document.addEventListener('wheel', _on_wheel, false);
    }
  }
  disableWheelCapture () {
    if (state._wheel_timeout != null) {
      clearTimeout(state._wheel_timeout);
      state._wheel_timeout = null;
    }
    var html = document.querySelector('html');
    if (html.classList.contains('with-fake-scroll')) {
      html.classList.remove('has-fake-scroll');
      window.scrollTo(0, 0);
      document.removeEventListener('scroll', _on_scroll, false);
    } else {
      document.removeEventListener('wheel', _on_wheel, false);
    }
  }

  enableKeyboardCapture () {
    document.addEventListener('x-keycommand', _on_xkeycommand, false)
    window.addEventListener('keydown', _on_keydown, false)

    if(this._native_bridge.available) {
      var handlers = this._pengine.getKeyhitHandlers();
      var promises = [];
      this._added_key_commands = this._added_key_commands || [];
      for(var handler of handlers) {
        var input = PascoNativeBridge.keyInputByCode[handler.key];
        if(input && !this._added_key_commands.indexOf(input) == -1) {
          this._added_key_commands.push(input)
          promises.push(napi.add_key_command(input, '', {
            repeatable: !!this._config.ios_keycommand_repeatable,
          }))
        }
      }
      await Promise.all(promises);
    }
  }
  disableKeyboardCapture () {
    document.removeEventListener('x-keycommand', _on_xkeycommand, false)
    window.removeEventListener('keydown', _on_keydown, false)

    if(this._native_bridge.available && this._added_key_commands) {
      var promises = [];
      for (let input of this._added_key_commands) {
        promises.push(this._native_bridge.remove_key_command(input));
      }
      await Promise.all(promises)
    }
  }

  enableMouseCapture () {
    tree_wrp_element.addEventListener('click', _tree_on_click, false);
  }
  disableMouseCapture () {
    tree_wrp_element.removeEventListener('click', _tree_on_click, false);
  }

  enableNavigationButtons () {
    var navbtns_wrp = this._document.querySelector('#navbtns-wrp');
    var navbtns = this._document.querySelector('#navbtns')
    if (!navbtns_wrp || !navbtns) {
      return
    }
    let navbtns_event_id = 'NAV_BUTTONS'
    navbtns_wrp.classList.add('navbtns-enable');
    if (window.device && window.device.platform.toLowerCase() == 'ios') {
      this._addEventListenerFor(navbtns, 'touchstart', _on_navbtns_tstart, false, navbtns_event_id)
    } else {
      this._addEventListenerFor(navbtns, 'click', _on_navbtns_click, false, navbtns_event_id)
    }
    // stop touch/mouse event propagation for these elements
    for (let elm of document.querySelectorAll('#main-top-navbar,#navbtns-wrp')) {
      let actionEventHandler = (event) => {
        event.stopPropagation()
      }
      for (let event_name of [ 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup' ]) {
        this._addEventListenerFor(event_name, actionEventHandler, false, navbtns_event_id)
      }
    }
  }
  disableNavigationButtons () {
    var navbtns_wrp = this._document.querySelector('#navbtns-wrp');
    var navbtns = this._document.querySelector('#navbtns')
    if (!navbtns_wrp || !navbtns) {
      return
    }
    navbtns_wrp.classList.remove('navbtns-enable');
    this._removeEventListenersById('NAV_BUTTONS')
  }

  initDebugEventHandlers () {
    //
    this._addEventListenerFor(window, 'x-keycommand', (ev) => {
      if(!state || state._keyhit_off ||
         !PascoNativeBridge.keyCodeByInput.hasOwnProperty(ev.detail.input)) {
        return
      }
      var code = PascoNativeBridge.keyCodeByInput[ev.detail.input]
      ev.charCode = code
      // look for delegate calls
      var delegate = _debug_keys[code]
      if(delegate) {
        if(delegate.preventDefault === undefined ||
           delegate.preventDefault) {
          ev.preventDefault()
        }
        var ret = delegate.func(ev)
        if(ret && ret.catch) {
          ret.catch(handle_error)
        }
      }
    }, false)
    this._addEventListenerFor('keydown', (ev) => {
      if(!state || state._keyhit_off) {
        return
      }
      var code = ev.charCode || ev.keyCode
      // look for delegate calls
      var delegate = _debug_keys[code]
      if(delegate) {
        if(delegate.preventDefault === undefined ||
           delegate.preventDefault) {
          ev.preventDefault()
        }
        var ret = delegate.func(ev)
        if(ret && ret.catch) {
          ret.catch(handle_error)
        }
      }
    }, false)
    // ios specific
    this._addEventListenerFor(this._document, 'touchmove', (evt) => {
      var html = document.querySelector('html')
      if(html.classList.contains('ios') && !html.classList.contains('has-fake-scroll')) {
        // prevent scrolling
        evt.preventDefault()
      }
    }, false)
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
    // add debug keys
    let debug_keys = {
      '80': { handler: () => { // P (toggle play)
        if (this._state._stopped) {
          this._resetState()
          this.start(state)
        } else {
          this.stop()
        }
      } },
      '190': { handler: (ev) => { // . dot (toggle debug mode)
        this._state.debug_mode = !this._state.debug_mode
        if (this._state.debug_mode) {
          this._document.body.classList.add('debug-mode')
        } else {
          this._document.body.classList.remove('debug-mode')
        }
      } }
    }
    for (let key of Object.keys(debug_keys)) {
      this.addKeyhitHandler(key, debug_keys[key].handler) 
    }
    if(napi.available) {
      return Promise.all([
        napi.add_key_command("p"),
        napi.add_key_command("."),
      ])
    }
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
      var elm = this._document.createElement("link")
      for(var key in style_vars) {
        style_link = style_link.replace(key, style_vars[key])
      }
      elm.setAttribute("rel", "stylesheet")
      elm.setAttribute("href", style_link)
      this._document.body.appendChild(elm)
      this._style_elements.push(elm)
    }
  }
  async evalConfig (config) {
    this._onscreen_navigation_enabled = config.onscreen_navigation == 'enable'
    this._can_edit = !('can_edit' in config) ? true : !!config.can_edit
    this._style_list = Array.isArray(this.config.style) ? this.config.style :
      (this.config.style ? [ this.config.style ] : [])
    this.insertConfigStyles(this._style_list)
  }

  _addEventListenerFor (obj, name, handler, capture, id) {
    obj.addEventListener(name, handler, capture)
    this._event_handlers_list.push({ obj, name, handler, capture, id })
  }
  _removeEventListenersById (id) {
    let idx
    while ((idx = this._event_handlers_list.findIndex((a) => a.id == id)) != -1) {
      let { obj, name, handler, capture } = this._event_handlers_list[idx]
      obj.removeEventListener(name, handler, capture)
      this._event_handlers_list.splice(idx, 1)
    }
  }


  __onNavigationButtonsTouchStart (evt) {
    if(evt.touches.length == 1) {
      var elem = evt.touches[0].target;
      switch(elem.id) {
        case 'nav-upbtn':
        case 'nav-downbtn':
        case 'nav-leftbtn':
        case 'nav-rightbtn': {
          evt.preventDefault();
          this._pengine.onHitNavigationButton({ name: elem.id })
          break;
        }
      }
    }
  }
  __onClickNavigationButtons (evt) {
    var elem = evt.target;
    switch(elem.id) {
      case 'nav-upbtn':
      case 'nav-downbtn':
      case 'nav-leftbtn':
      case 'nav-rightbtn': {
        evt.preventDefault()
        this._pengine.didHitNavigationButton({ name: elem.id })
        break;
      }
    }
  }
  __onKeyCommand (evt) {
    var curtime = new Date().getTime()
    if (config.ignore_second_hits_time > 0 && state._last_keydown_time &&
        curtime - state._last_keydown_time < config.ignore_second_hits_time) {
      return; // ignore second hit
    }
    state._last_keydown_time = curtime
    // config.ignore_key_release_time is not applicable
    if(evt.detail && PascoNativeBridge.keyCodeByInput.hasOwnProperty(evt.detail.input)) {
      evt.charCode = PascoNativeBridge.keyCodeByInput[evt.detail.input];
      this._pengine.didHitKey({ code: PascoNativeBridge.keyCodeByInput[evt.detail.input] })
    }
  }
  __onTreeClick (evt) {
    let code = evt.button == 0 ? 'LeftClick' :
        (evt.button == 2 ? 'RightClick' : null)
    if (code != null) {
      evt.preventDefault()
      this._pengine.didHitKey({ code })
    }
    /*
    var delegate;
    if ("Click" in config._keyhit_delegates && evt.button == 0) {
      delegate = config._keyhit_delegates.Click;
    } else if ("RightClick" in config._keyhit_delegates && evt.button == 2) {
      delegate = config._keyhit_delegates.RightClick;
    }
    if(delegate) {
      evt.preventDefault();
      var ret = delegate.func(evt);
      if(ret && ret.catch)
        ret.catch(handle_error);
    }
    */
  }
  __onKeyDown (down_ev) {
    var curtime = new Date().getTime()
    if(config.ignore_second_hits_time > 0 && state._last_keydown_time &&
       curtime - state._last_keydown_time < config.ignore_second_hits_time) {
      return; // ignore second hit
    }
    state._last_keydown_time = curtime
    state._keydown_time = curtime
    var downcode = down_ev.charCode || down_ev.keyCode;
    if(!config.ignore_key_release_time) {
      // no need to wait for release
      this._pengine.didHitKey({ code: down_ev.charCode || down_ev.keyCode })
    } else {
      // follow delegate rules
      /* DISABLED, flip of keys in rtl mode can be source for confusion.
         if(window.icu && icu.rtl && _keys_for_rtl.hasOwnProperty(downcode+'')) {
         downcode = _keys_for_rtl[downcode];
         }
      */
      var delegatemap = config._keyhit_delegates;
      var delegate = delegatemap[downcode+''];
      if(delegate) {
        if(delegate.preventDefault)
          down_ev.preventDefault();
      }
      if(state._next_keyup)
        window.removeEventListener('keyup', state._next_keyup, false);
      state._next_keyup = function(ev) {
        var upcode = ev.charCode || ev.keyCode;
        /* DISABLED, flip of keys in rtl mode can be source for confusion.
           if(window.icu && icu.rtl && _keys_for_rtl.hasOwnProperty(upcode+'')) {
           upcode = _keys_for_rtl[upcode];
           }
        */
        if(upcode != 0 && upcode != downcode) {
          return; // LIMIT:: single key at a time
        }
        var keyup_time = new Date().getTime(),
            keydown_time = state._keydown_time;
        window.removeEventListener('keyup', state._next_keyup, false);
        state._next_keyup = null;
        state._keydown_time = null;
        if(keyup_time - keydown_time < config.ignore_key_release_time) {
          return; // ignore it, release time should be more
        }
        this._pengine.didHitKey({ code: down_ev.charCode || down_ev.keyCode })
      }
    }
    window.addEventListener('keyup', state._next_keyup, false);
  }
  __onScroll (evt) {
    if (this._wheel_off) {
      return;
    }
    let deltaX = window.scrollX - this._last_scroll_x;
    let deltaY = window.scrollY - this._last_scroll_y;
    this._pengine.onWheel({ deltaX, deltaY });
    // lock-the scroll
    let scrollX = window.scrollX > 110 || window.scrollX < 10 ? 60 : window.scrollX
    let scrollY = window.scrollY > 110 || window.scrollY < 10 ? 60 : window.scrollY
    this._wheel_off = true;
    window.scrollTo(scrollX, scrollY);
    if (scrollX != window.scrollX) {
      window.scrollX = scrollX;
    }
    if (scrollY != window.scrollY) {
      window.scrollY = scrollY;
    }
    this._last_scroll_x = scrollX;
    this._last_scroll_y = scrollY;
    setTimeout(() => {
      this._wheel_off = false;
    }, 10);
  }
  __onWheel (evt) {
    if (this._wheel_off) {
      return
    }
    this._pengine.onWheel({ deltaX: evt.deltaX, deltaY: evt.deltaY });
  }

}
