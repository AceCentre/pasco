import BasePage from './BasePage'
import {
  RedirectPageException, ErrorMessage, NotFoundError
} from '../lib/exceptions'
import {
  getXScaleClassFromSizePercent, copyObject,
} from '../helpers/common'
import { findElementFromParents } from '../helpers/DOMHelpers'
import lodashTemplate from '../helpers/lodashTemplate'
import EventManager from '../helpers/EventManager'
import PascoNativeBridge from '../lib/PascoNativeBridge'
import PascoCore from '../lib/PascoCore'
import PascoTree from '../lib/PascoTree'
import PascoEngine from '../lib/PascoEngine'
import PascoNavigationButtons from '../lib/internal/PascoNavigationButtons'
import PascoMainEditMode from '../lib/internal/PascoMainEditMode'
import MainDebugTools from '../lib/internal/MainDebugTools'

export default class PascoMain extends BasePage {
  constructor (document) {
    super(document)
    this._style_elements = []
    this._state = null
    this._pengine = null
    this._event_manager = new EventManager()
    this._$ = this._document.querySelector.bind(this._document)
    this._$a = this._document.querySelectorAll.bind(this._document)
    this._active_hi_listeners = []
  }
  async init () {
    let base_url = location+''
    this._core = new PascoCore(this._document, base_url)
    await this._core.init()
    this._fmanager = this._core.getFileManager()
    this._nbridge = this._core.getNativeBridge()
    this._config_url = this._core.resolveUrl(this._core.getEnvValue('default_config_file'))
    await this.loadConfig(this._config_url)
    let config = this._config
    if(!config.__did_quick_setup) {
      throw new RedirectPageException('intro.html')
    }
    this._locale = config.locale || this._core.getEnvValue('default_locale')
    this._localizer = this._core.getLocalizer()
    // prepare the tree
    this._tree = new PascoTree(this._core)
    this._root_node_element = this._$('#tree')
    this._tree_wrp_element = this._$('#tree-wrp')
    {
      let tmp = this._$('#tree-node-template');
      if(tmp) {
        this._node_content_template = lodashTemplate(tmp.innerHTML);
      }
    }
    if(!this._root_node_element || !this._tree_wrp_element || !this._node_content_template) {
      throw new ErrorMessage("Could not find one or more of the following elements:  #tree, #tree-wrp, #tree-node-template")
    }
    let tree_url = config.tree ?
      this._core.resolveUrl(config.tree, this._config_url) : 
      this._core.resolveUrl(this._core.getEnvValue('default_tree_file'))
    // parallel init localization & init tree
    await Promise.all([
      this._localizer.load(this._locale)
        .catch((err) => {
          console.warn(err) // pass localize error
        }),
      this.initTreeFromFile(tree_url),
    ])
    this._localizer.localize()
    this._initUI()

    // debug tools
    this._main_debug_tools = new MainDebugTools(this)
    await this._main_debug_tools.init()

    this._pengine = new PascoEngine(this._core, this)
    this._event_manager.addNodeListenerFor(this._pengine, 'error', this.onError.bind(this))

    this._edit_mode_enabled = false
    if (config.can_edit) {
      let tmp
      tmp = this._$('#edit-mode-btn')
      this._event_manager.addDOMListenerFor(tmp, 'click', this.onClickEditMode.bind(this), false)
      tmp = this._$('#edit-mode-save-btn')
      this._event_manager.addDOMListenerFor(tmp, 'click', this.onClickSaveEdit.bind(this), false)
      tmp = this._$('#edit-mode-cancel-btn')
      this._event_manager.addDOMListenerFor(tmp, 'click', this.onClickCancelEdit.bind(this), false)
    }
    this._editmode = new PascoMainEditMode(this)
    this._editmode.toggleEditButtons(this._edit_mode_enabled)

    await this.startEngine()
  }
  async destroy () {
    this._core.destroy()
    if (this._state && this._edit_mode_enabled && this._root_node) {
      editor_helper.on_restore(this._root_node)
    }
    this._event_manager.removeAllListeners()
    for (let style of this._style_elements) {
      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
    }
    this._style_elements = []
    if (this._pengine) {
      await this._pengine.destroy()
      this._pengine = null
    }
    this._navbtns.destroy()
    if (this._edit_mode_enabled) {
      this._editmode.destroy()
    }
    if (this._main_debug_tools) {
      await this._main_debug_tools.destroy()
    }
    await this._removeExistingKeyCommands()
  }

  getRootNodeElement () {
    return this._root_node_element
  }
  getRootNode () {
    return this._root_node
  }
  getEngine () {
    return this._pengine
  }
  getDocument () {
    return this._document
  }
  getCore () {
    return this._core
  }
  getConfig () {
    return this._config
  }
  getConfigUrl () {
    return this._config_url
  }
  getLocalizer () {
    return this._localizer
  }
  getLocale () {
    return this._locale
  }
  getTreeUrl () {
    return this._tree_url
  }
  getTree () {
    return this._tree
  }

  async initTreeFromFile (tree_url) {
    await this._tree.initAndReadFromFile(tree_url)
    this._tree_url = this._tree.getTreeUrl()
    this._root_node = this._tree.initNodesFromTreeData()
  }
  renderNode (node) {
    if (this._root_node == node) {
      // use shortcut for root node
      this._root_node_element.innerHTML = '';
      this._tree.makeNodeElements(this._root_node, this._root_node_element, this._node_content_template)
      return
    }
    let repelm = document.createElement('li')
    let node_dom_element = node.dom_element
    let parentNode = node_dom_element.parentNode;
    this._tree.makeNodeElements(node, repelm, this._node_content_template)
    if (parentNode) {
      parentNode.insertBefore(repelm, node_dom_element);
      parentNode.removeChild(node_dom_element);
    }
  }

  /**** START OF INIT UI
     These functions are part of init function and they do not
     have a full destroy capability, Though calling destroy/init
     in sequence will do what is expected.
  ****/
  _initUI () {
    // ios specific
    let html = this._$('html')
    if (html.classList.contains('ios')) {
      html.classList.add('with-fake-scroll');
    }
    this._event_manager.addDOMListenerFor(window, 'resize', this.setTreeNeedsResize.bind(this), false)
    // set tree font-size
    if (this._config.tree_content_size_percentage) {
      this.setTreeContentSize(this._config.tree_content_size_percentage)
    }
    // set theme class
    if (this._config.theme) {
      this._document.body.classList.add('theme-' + this._config.theme);
    }
    this.initDefaultUIEventHandlers()
    this.initMessageBar()
    this._navbtns = new PascoNavigationButtons(this._document, this._config)
    this._event_manager.addNodeListenerFor(this._navbtns, 'config-changed', async (change) => {
      Object.assign(this._config, change)
      try {
        await this.saveConfig()
      } catch (err) {
        this.onError(err)
      }
    })
    this._navbtns.init() // on-screen navigation
  }
  setTreeContentSize (size_percent) {
    for (let elm of this._$a(".resizable-content")) {
      elm.style.fontSize = size_percent + '%'
      // re-set xscale
      var xscale = getXScaleClassFromSizePercent(size_percent, 50)
      for(var i = 0; i < elm.classList.length;) {
        var name = elm.classList.item(i)
        if(name.startsWith('contentsize-')) {
          elm.classList.remove(name)
        } else {
          i++
        }
      }
      elm.classList.add(`contentsize-${xscale}x`)
    }
  }
  initMessageBar () {
    // message bar close handler
    for (let btn of this._$a('#message-bar-close-btn')) {
      this._event_manager.addDOMListenerFor(btn, 'click', (event) => {
        event.stopPropagation()
        event.preventDefault()
        let wrp = this._$('#message-bar-wrp')
        if (wrp) {
          wrp.classList.add('hide')
        }
      }, 'init-ui')
    }
    // set message bar custom height
    if (this._config.message_bar_have_custom_height &&
        this._config.message_bar_height > 0 &&
        this._config.message_bar_height <= 100) {
      let html = this._$('html')
      let topbar_offset = 50 + (html.classList.contains('ios') ? 30 : 0)
      let msgbar_wrp = this._$('#message-bar-wrp')
      if (msgbar_wrp) {
        msgbar_wrp.style.height = 'calc(' + this._config.message_bar_height + 'vh - ' + topbar_offset + 'px)'
      }
    }
    // set message bar font size
    if (this._config.message_bar_font_size_percentage > 0) {
      let msgbar_wrp = this._$('#message-bar-wrp')
      if (msgbar_wrp) {
        msgbar_wrp.style.fontSize = this._config.message_bar_font_size_percentage + '%'
      }
    }
  }
  initDefaultUIEventHandlers () {
    // ios specific
    this._event_manager.addDOMListenerFor(this._document, 'touchmove', (evt) => {
      var html = this._$('html')
      if(html.classList.contains('ios') && !html.classList.contains('has-fake-scroll')) {
        // prevent scrolling
        evt.preventDefault()
      }
    }, false)
  }
  /**** END OF INIT UI ****/

  
  /**** START UI OPERATIONS ****/
  displayPopupMessage (msg) {
    let popup = this._$('#popup-message-wrp')
    let popup_mtext = popup ? popup.querySelector('.main-text') : null
    if(popup && popup_mtext) {
      popup_mtext.textContent = msg
      popup.classList.remove('hide')
      setTimeout(function() {
        popup.classList.add('visible')
      }, 10)
    }
  }
  hidePopupMessage () {
    let popup = this._$('#popup-message-wrp')
    let popup_mtext = popup ? popup.querySelector('.main-text') : null
    if (popup && popup.classList.contains('visible')) {
      popup.classList.remove('visible')
      setTimeout(function() {
        if(popup_mtext) {
          popup_mtext.textContent = ""
        }
        popup.classList.add('hide')
      }, 500) // wait for hide transition 
    }
  }
  doResizeTree () {
    this.updateActivePositions()
  }
  setTreeNeedsResize () {
    if (this._needs_resize_timeout != null) {
      clearTimeout(this._needs_resize_timeout)
    }
    this._needs_resize_timeout = setTimeout(() => {
      this._needs_resize_timeout = null
      this.doResizeTree()
    }, 500)
  }
  updateMessageBar (params) {
    let { type, content } = params || {}
    var wrp = this._$('#message-bar-wrp');
    let msgbar = this._$('#message-bar')
    if (msgbar == null || wrp == null) {
      return
    }
    let show = false
    msgbar.innerHTML = ''
    switch (type) {
      case 'text': {
        show = true
        let elm = this._document.createElement('div')
        elm.classList.add('text')
        elm.textContent = content+''
        msgbar.appendChild(elm)
        break
      }
      case 'spell': {
        if (!content) {
          break
        }
        show = true
        var idx = 0
        let words = content.split(' ')
        for (let word of words) {
          if (idx + 1 == words.length) {
            for (let letter of word.split('')) {
              let elm = this._document.createElement('div')
              elm.classList.add('text')
              elm.textContent = letter
              msgbar.appendChild(elm)
            }
          } else {
            var elm = this._document.createElement('div')
            elm.classList.add('text')
            elm.textContent = word
            msgbar.appendChild(elm)
          }
          idx++
        }
        this.setTreeNeedsResize()
        break
      }
    }
    // update visibility
    if (show && wrp.classList.contains('hide')) {
      wrp.classList.remove('hide');
    } else if (!show && !wrp.classList.contains('hide')) {
      wrp.classList.add('hide');
    }
  }

  /**** START TREE OPERATIONS ****/
  runOnNextUpdateActivePositions (callable) {
    this.once('update-active-positions', callable)
  }
  selectNode (node) {
    if(node.content_element) {
      node.content_element.classList.add('selected' || this._config.selected_class);
    }
  }
  doUpdateActivePositions () {
    let state = this._pengine.getState()
    if (!state || !state.positions) {
      return
    }
    let pstate = this._active_positions_state
    if (!this._active_positions_state) {
      pstate = this._active_positions_state = {
        elements: [],
        highlight_elements: [],
      }
    }
    let dom_elements = state.positions.map((pos) => pos.node.dom_element)
    for (let i = 0; i < pstate.elements.length; ) {
      let ael = pstate.elements[i];
      ael.classList.remove('current');
      if (dom_elements.indexOf(ael) == -1) {
        ael.classList.remove('active');
        pstate.elements.splice(i, 1);
        if(ael.classList.contains('no-transition')) {
          ael.classList.remove('no-transition');
        }
      } else {
        i++;
      }
    }
    for (let i = 0, len = dom_elements.length; i < len; ++i) {
      let ael = dom_elements[i];
      if (!ael.classList.contains('active')) {
        // new element
        ael.classList.add('no-transition');
        ael.classList.add('active');
        pstate.elements.push(ael);
      } else {
        if(ael.classList.contains('no-transition')) {
          ael.classList.remove('no-transition');
        }
      }
      if(i + 1 == len && !ael.classList.contains('current')) {
        ael.classList.add('current');
      }
    }
    // update highlight postition
    let elm;
    while ((elm = pstate.highlight_elements.pop())) {
      elm.classList.remove(this._config.highlight_class || 'highlight');
    }
    if (state.positions.length > 0) {
      let curpos = state.positions[state.positions.length - 1]
      if (curpos.node.child_nodes[curpos.index]) {
        let node = curpos.node.child_nodes[curpos.index]
        if (node && node.content_element) {
          node.content_element.classList.add(this._config.highlight_class || 'highlight');
          pstate.highlight_elements.push(node.content_element);
        }
      }
    }
    this.updateTreeActivePositions(state.positions)
  }
  updateActivePositions () {
    this.emit('update-active-positions')
    this.doUpdateActivePositions()
    // perform the update several times, It helps with the transition
    let update_count = 3
    let rate = 180
    let initUpdateStepper = () => {
      let onStep = () => {
        if (update_count-- <= 0) {
          return
        }
        this._update_active_position_tree_timeout = setTimeout(() => {
          delete this._update_active_position_tree_timeout
          this.doUpdateActivePositions()
          onStep()
        }, rate)
      }
      onStep()
    }
    if (this._update_active_position_tree_timeout != null) {
      clearTimeout(this._update_active_position_tree_timeout)
    }
    initUpdateStepper()
  }
  updateTreeActivePositions (positions) {
    // center all
    let widthSum = 0;
    let topSum = 0;
    for (let pos of positions) {
      let node = pos.index == -1 ?
          (pos.node.child_nodes.length > 0 ? pos.node.child_nodes[0] : null) :
          pos.node.child_nodes[pos.index]
      let ul = pos.node.child_nodes_ul_dom_element
      let el = node ? node.dom_element : null
      let height = el ? el.offsetHeight : 0
      let offY = el ? el.offsetTop : 0
      let pheight = this._root_node_element.offsetHeight
      let top = ((pheight / 2.0 - height / 2.0) - offY - topSum)
      if (ul) {
        ul.style.top = top + 'px';
      }
      topSum += top;
      widthSum += ul.offsetWidth
    }
    if(window.icu && window.icu.rtl) {
      this._root_node_element.style.marginLeft = '';
      if(widthSum - window.innerWidth > 0) {
        this._root_node_element.style.marginRight = (-widthSum + window.innerWidth) + 'px';
      } else {
        this._root_node_element.style.marginRight = '0px';
      }
    } else {
      this._root_node_element.style.marginRight = '';
      if(widthSum - window.innerWidth > 0) {
        this._root_node_element.style.marginLeft = (-widthSum + window.innerWidth) + 'px';
      } else {
        this._root_node_element.style.marginLeft = '0px';
      }
    }
  }
  insertNodeBefore (node, parent_node, other_node) {
    return this._tree.insertNodeBefore(node, parent_node, other_node, this._node_content_template)
  }
  removeNodeFromParent (node) {
    return this._tree.removeNodeFromParent(node)
  }
  async changeTreeByName (name) {
    let trees_info_url = this._core.resolveUrl(this._core.getEnvValue('default_trees_info_file'))
    let trees_info = await this._fmanager.loadFileJson(trees_info_url)
    let name_lc = name.toLowerCase()
    var tree_info = trees_info.list.find((a) => (a.name+'').toLowerCase() == name_lc)
    if (tree_info) {
      let tree_url = this._core.resolveUrl(tree_info.tree_fn, trees_info_url)
      let node = this._pengine.getCurrentNode()
      await this._changeTreeSubrout(node, tree_url)
    } else {
      throw new NotFoundError()
    }
  }
  async changeTreeFromFile (tree_fn) {
    let node = this._pengine.getCurrentNode()
    await this._changeTreeSubrout(node, this._core.resolveUrl(tree_fn, this._tree_url))
  }
  async _changeTreeSubrout (node, tree_url) {
    this._tree = new PascoTree(this._core)
    await this.initTreeFromFile(tree_url)
    this.restartEngine()
  }

  async restartEngine () {
    // stop current running tree
    await this._pengine.destroy()
    await this.startEngine()
  }
  async startEngine () {
    let initial_state = {
      config_url: this._config_url,
      tree_url: this._tree_url,
      edit_mode: this._edit_mode_enabled,
    }
    await this._pengine.init(this._config, this._root_node, initial_state)
    await this._pengine.start()
  }

  /**** END TREE OPERATIONS ****/

  /**** START HIEVENT HANDLERS ****/
  getActiveHIListeners () {
    return copyObject(this._active_hi_listeners)
  }
  _onToggleHIEventType (name, enabled) {
    let idx = this._active_hi_listeners.findIndex((a) => a.name == name)
    if (idx != -1) {
      this._active_hi_listeners.splice(idx, 1)
    }
    if (enabled) {
      this._active_hi_listeners.push({ name })
    }
    this.emit('active-human-input-listeners-change', copyObject(this._active_hi_listeners))
  }
  enableWheelCapture () {
    this._onToggleHIEventType('wheel-capture', true)
    let evtid = 'wheel-capture'
    let html = this._$('html')
    if (html.classList.contains('with-fake-scroll')) {
      // ios has fake-scroll adjust scroll state according to that
      html.classList.add('has-fake-scroll')
      window.scrollTo(60, 60)
      this._last_scroll_x = window.scrollX
      this._last_scroll_y = window.scrollY
      this._event_manager.addDOMListenerFor(this._document, 'scroll', this.onScroll.bind(this), false, evtid)
    } else {
      this._event_manager.addDOMListenerFor(this._document, 'wheel', this.onWheel.bind(this), false, evtid)
    }
  }
  disableWheelCapture () {
    this._onToggleHIEventType('wheel-capture', false)
    var html = this._$('html')
    if (html.classList.contains('with-fake-scroll')) {
      html.classList.remove('has-fake-scroll')
      window.scrollTo(0, 0)
    }
    this._event_manager.removeListenersById('wheel-capture')
  }
  async _removeExistingKeyCommands () {
    if (this._added_key_commands) {
      let promises = []
      for (let input of this._added_key_commands) {
        promises.push(this._nbridge.remove_key_command(input))
      }
      this._added_key_commands = null
      await Promise.all(promises)
    }
  }
  async _addKeyHitHandlerKeyCommands () {
    let handlers = this._pengine.getKeyhitHandlers()
    let promises = []
    this._added_key_commands = this._added_key_commands || []
    for (let handler of handlers) {
      let input = PascoNativeBridge.keyInputByCode[handler.code]
      if(input && this._added_key_commands.indexOf(input) == -1) {
        this._added_key_commands.push(input)
        promises.push(this._nbridge.add_key_command(input, {
          repeatable: !!this._config.ios_keycommand_repeatable,
        }))
      }
    }
    await Promise.all(promises)
  }
  async _onKeyHitHandlersChange () {
    if (this._nbridge.available && !this._config.use_keyboard_events_instead_of_keycommand) {
      await this._removeExistingKeyCommands()
      await this._addKeyHitHandlerKeyCommands()
    }
  }
  async enableKeyboardCapture () {
    this._onToggleHIEventType('keyboard-capture', true)
    let evtid = 'keyboard-capture'
    this._event_manager.addNodeListenerFor(this._pengine, 'keyhit-handlers-change', this._onKeyHitHandlersChange.bind(this), evtid)
    if (this._nbridge.available && !this._config.use_keyboard_events_instead_of_keycommand) {
      await this._addKeyHitHandlerKeyCommands()
      this._event_manager.addDOMListenerFor(this._document, 'x-keycommand', this.onKeyCommand.bind(this), false, evtid)
    } else {
      this._event_manager.addDOMListenerFor(window, 'keydown', this.onKeyDown.bind(this), false, evtid)
    }
  }
  async disableKeyboardCapture () {
    this._onToggleHIEventType('keyboard-capture', false)
    this._event_manager.removeListenersById('keyboard-capture')
    if (this._nbridge.available && !this._config.use_keyboard_events_instead_of_keycommand) {
      await this._removeExistingKeyCommands()
    }
  }
  enableMouseCapture () {
    this._onToggleHIEventType('mouse-capture', true)
    this._event_manager.addDOMListenerFor(this._tree_wrp_element, 'click', this.onTreeClick.bind(this), false, 'mouse-capture')
  }
  disableMouseCapture () {
    this._onToggleHIEventType('mouse-capture', false)
    this._event_manager.removeListenersById('mouse-capture')
  }

  enableNavigationButtons () {
    this._onToggleHIEventType('navigation-buttons', true)
    let navbtns_wrp = this._$('#navbtns-wrp')
    let navbtns = this._$('#navbtns')
    if (!navbtns_wrp || !navbtns) {
      return
    }
    let evtid = 'nav-buttons-capture'
    navbtns_wrp.classList.add('navbtns-enable')
    if (window.device && window.device.platform.toLowerCase() == 'ios') {
      this._event_manager.addDOMListenerFor(navbtns, 'touchstart', this.onNavigationButtonsTouchStart.bind(this), false, evtid)
    } else {
      this._event_manager.addDOMListenerFor(navbtns, 'click', this.onClickNavigationButtons.bind(this), false, evtid)
    }
    // stop touch/mouse event propagation for these elements
    for (let elm of this._$a('#main-top-navbar,#navbtns-wrp')) {
      let actionEventHandler = (event) => {
        event.stopPropagation()
      }
      for (let event_name of [ 'click', 'touchstart', 'touchend', 'mousedown', 'mouseup' ]) {
        this._event_manager.addDOMListenerFor(elm, event_name, actionEventHandler, false, evtid)
      }
    }
  }
  disableNavigationButtons () {
    this._onToggleHIEventType('navigation-buttons', false)
    var navbtns_wrp = this._$('#navbtns-wrp')
    var navbtns = this._$('#navbtns')
    if (!navbtns_wrp || !navbtns) {
      return
    }
    navbtns_wrp.classList.remove('navbtns-enable')
    this._event_manager.removeListenersById('nav-buttons-capture')
  }
  /**** END HIEVENT HANDLERS ****/

  async saveConfig () {
    this._fmanager.saveFileJson(this._config_url, this._config)
  }
  async loadConfig (config_file) {
    this._config = await this._fmanager.loadFileJson(config_file)
    this.evalConfig()
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
  async evalConfig () {
    // NOT USED
    // this._can_edit = !('can_edit' in this._config) ? true : !!this._config.can_edit
    this._style_list = Array.isArray(this._config.style) ? this._config.style :
      (this._config.style ? [ this._config.style ] : [])
    this.insertConfigStyles(this._style_list)
  }

  onError (error) {
    this.displayError(error)
  }

  async onClickEditMode (evt) {
    evt.preventDefault()
    if (this._edit_mode_enabled) {
      return
    }
    try {
      this._edit_mode_enabled = true
      await this.initTreeFromFile(this._tree_url)
      this._editmode.init()
      await this.startEngine()
    } catch (err) {
      this.onError(err)
    }
  }
  async onClickSaveEdit (evt) {
    evt.preventDefault()
    if (!this._edit_mode_enabled) {
      return
    }
    try {
      this._edit_mode_enabled = false
      this._root_node = await this._editmode.save()
      this._editmode.destroy()
      await this._pengine.destroy()
      await this.startEngine()
    } catch (err) {
      this.onError(err)
    }
  }
  async onClickCancelEdit (evt) {
    evt.preventDefault()
    if (!this._edit_mode_enabled) {
      return
    }
    try {
      this._edit_mode_enabled = false
      this._root_node = await this._editmode.restore()
      this._editmode.destroy()
      await this._pengine.destroy()
      await this.startEngine()
    } catch (err) {
      this.onError(err)
    }
  }

  onNavigationButtonsTouchStart (evt) {
    let target = evt.touches[0].target
    let btns_name = [ 'nav-upbtn', 'nav-downbtn', 'nav-leftbtn', 'nav-rightbtn' ]
    let navbtns = this._$('#navbtns')
    let btn = findElementFromParents(target, (a) => btns_name.indexOf(a.id) != -1, navbtns)
    if (btn) {
      evt.preventDefault()
      let name = btn.id
      this.emit('hievent', { name: 'navbtn', summary: `<touchstart>, name = ${name}` })
      this._pengine.didHitNavigationButton({ name })
    }
  }
  onClickNavigationButtons (evt) {
    let btns_name = [ 'nav-upbtn', 'nav-downbtn', 'nav-leftbtn', 'nav-rightbtn' ]
    let navbtns = this._$('#navbtns')
    let btn = findElementFromParents(evt.target, (a) => btns_name.indexOf(a.id) != -1, navbtns)
    if (btn) {
      evt.preventDefault()
      let name = btn.id
      this.emit('hievent', { name: 'navbtn', summary: `<click>, name = ${name}` })
      this._pengine.didHitNavigationButton({ name })
    }
  }
  onKeyCommand (evt) {
    let input = evt.detail.input
    let code = PascoNativeBridge.keyCodeByInput.hasOwnProperty(input) ?
        PascoNativeBridge.keyCodeByInput[input] : null
    let curtime = new Date().getTime()
    if (this._config.ignore_second_hits_time > 0 && this._last_keydown_time &&
        curtime - this._last_keydown_time < this._config.ignore_second_hits_time) {
      this.emit('hievent', { name: 'keyhit', summary: `<keycommand>, code = ${code}, input = ${input} [IGNORED, second hit]` })
      return // ignore second hit
    }
    this._last_keydown_time = curtime
    // config.ignore_key_release_time is not applicable
    if (code != null) {
      this.emit('hievent', { name: 'keyhit', summary: `<keycommand>, code = ${code}, input = ${input}` })
      this._pengine.didHitKey({ code })
    } else {
      this.emit('hievent', { name: 'keyhit', summary: `<keycommand>, code = ${code}, input = ${input}, [UNKNOWN_INPUT]` })
    }
  }
  onTreeClick (evt) {
    let code = evt.button == 0 ? 'LeftClick' :
        (evt.button == 2 ? 'RightClick' : null)
    if (code != null) {
      let key_event = { code }
      if (this._pengine.willHitKeyHandle(key_event)) {
        evt.preventDefault()
        this.emit('hievent', { name: 'keyhit', summary: `<click>, code = ${code}` })
        this._pengine.didHitKey(key_event)
      }
    }
  }
  onKeyDown (down_ev) {
    let downcode = down_ev.charCode || down_ev.keyCode
    let key_event = { code: downcode }
    let curtime = new Date().getTime()
    if (this._config.ignore_second_hits_time > 0 && this._last_keydown_time &&
        curtime - this._last_keydown_time < this._config.ignore_second_hits_time) {
      this.emit('hievent', { name: 'keyhit', summary: `<keydown>, code = ${downcode} [IGNORED, second hit]` })
      return // ignore second hit
    }
    this._last_keydown_time = curtime
    this._keydown_time = curtime
    if (this._pengine.willHitKeyHandle(key_event)) {
      down_ev.preventDefault()
    }
    if (!this._config.ignore_key_release_time) {
      // no need to wait for release
      this.emit('hievent', { name: 'keyhit', summary: `<keydown>, code = ${downcode}` })
      this._pengine.didHitKey(key_event)
    } else {
      // follow delegate rules
      /* DISABLED, flip of keys in rtl mode can be source for confusion.
         if(window.icu && icu.rtl && _keys_for_rtl.hasOwnProperty(downcode+'')) {
         downcode = _keys_for_rtl[downcode]
         }
      */
      let keyup_evtid = 'keyup4keyhit'
      this._event_manager.removeListenersById(keyup_evtid)
      this._event_manager.addDOMListenerFor(window, 'keyup', (ev) => {
        var upcode = ev.charCode || ev.keyCode
        /* DISABLED, flip of keys in rtl mode can be source for confusion.
           if(window.icu && icu.rtl && _keys_for_rtl.hasOwnProperty(upcode+'')) {
           upcode = _keys_for_rtl[upcode]
           }
        */
        if (upcode != 0 && upcode != downcode) {
          this.emit('hievent', { name: 'keyhit', summary: `<keyup>, code = ${downcode} [IGNORED, multi key detected]` })
          return // LIMIT:: single key at a time
        }
        let keyup_time = new Date().getTime()
        let keydown_time = this._keydown_time
        this._event_manager.removeListenersById(keyup_evtid)
        this._keydown_time = null
        if (keyup_time - keydown_time < this._config.ignore_key_release_time) {
          this.emit('hievent', { name: 'keyhit', summary: `<keyup>, code = ${downcode} [IGNORED, keyup was too soon]` })
          return // ignore it, release time should be more
        }
        this.emit('hievent', { name: 'keyhit', summary: `<keyup>, code = ${downcode}` })
        this._pengine.didHitKey(key_event)
      }, false, keyup_evtid)
    }
  }
  onScroll (evt) {
    if (this._wheel_off) {
      return
    }
    let deltaX = window.scrollX - this._last_scroll_x
    let deltaY = window.scrollY - this._last_scroll_y
    this.emit('hievent', { name: 'wheel-move', summary: `<scroll>, delta = [${deltaX},${deltaY}]` })
    this._pengine.didMoveWheel({ deltaX, deltaY })
    // lock-the scroll
    let scrollX = window.scrollX > 110 || window.scrollX < 10 ? 60 : window.scrollX
    let scrollY = window.scrollY > 110 || window.scrollY < 10 ? 60 : window.scrollY
    this._wheel_off = true
    window.scrollTo(scrollX, scrollY)
    if (scrollX != window.scrollX) {
      window.scrollX = scrollX
    }
    if (scrollY != window.scrollY) {
      window.scrollY = scrollY
    }
    this._last_scroll_x = scrollX
    this._last_scroll_y = scrollY
    setTimeout(() => {
      this._wheel_off = false
    }, 10)
  }
  onWheel (evt) {
    if (this._wheel_off) {
      return
    }
    let deltaX = evt.deltaX
    let deltaY = evt.deltaY
    this.emit('hievent', { name: 'wheel-move', summary: `<wheel>, delta = [${deltaX},${deltaY}]` })
    this._pengine.didMoveWheel({ deltaX, deltaY })
  }

}
