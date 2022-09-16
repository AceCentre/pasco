import * as EventEmitter from 'events'
import { deferredPromise, copyObject } from '../helpers/common'
import EventManager from '../helpers/EventManager'
import { NotFoundError } from './exceptions'
import PascoNode from './PascoNode'
import * as dynModulesIndex from './dyn-modules'
const dynModules = dynModulesIndex.modules
import * as delay from 'delay'
import MoveManager from './internal/engine/MoveManager'
import DynNodeGenerator from './internal/engine/DynNodeGenerator'

/** constants **/
const MODES = ['auto', 'switch', 'wheel']
/*
const RTL_SWAP_KEYS_MAP = {
  "39": "37", // ArrowRight => ArrowLeft
  "37": "39", // ArrowLeft => ArrowRight
  "68": "65", // D => A
  "65": "68", // A => D
}
*/

export default class PascoEngine extends EventEmitter {
  constructor (core, uibridge) {
    super()
    this._core = core
    this._uibridge = uibridge
    this._event_manager = new EventManager()
    this._move_manager = new MoveManager(this)
    this._t = uibridge.getLocalizer().t
    this._dyngenerator = new DynNodeGenerator()
    for (let module of dynModules) {
      this._dyngenerator.addModule(new module(this))
    }
    this._actions = []
    this._keyhit_handlers = []
    this._override_actions = []
    this.initActions()
  }

  /**** START OF INIT IMPL ****/
  async init (config, root_node, state) {
    if (this._initialized) {
      await this.destroy()
    }
    if (this._initializing) {
      throw new Error('Initialization is in progress')
    }
    if (this._started) {
      throw new Error('Cannot init when engine is started!')
    }
    this._initializing = true
    this._config = config
    this._state = state || {}
    await this.installRootNode(root_node)
    let mode = this._config.mode || 'auto'
    if (mode == 'wheel') {
      this._uibridge.enableWheelCapture()
    } else {
      this._uibridge.disableWheelCapture()
      if (this._wheel_timeout != null) {
        clearTimeout(this._wheel_timeout)
        this._wheel_timeout = null
      }
    }
    let config_onscreen_navigation = this._config.onscreen_navigation == 'enable'
    if ((config_onscreen_navigation || this._state.edit_mode)) {
      this._uibridge.enableNavigationButtons()
    } else {
      this._uibridge.disableNavigationButtons()
    }
    this._uibridge.enableKeyboardCapture()
    this._uibridge.enableMouseCapture()
    this._event_manager.addNodeListenerFor(this, 'select-path-change', this.onUpdateMessageBar.bind(this))
    this.initKeyHandlers()
    this._initialized = true
    this._initializing = false
  }
  clearKeyHandlers () {
    this._keyhit_handlers = []
  }
  initKeyHandlers () {
    for (let [key, value] of Object.entries(this._config.keys || this._getDefaultKeys())) {
      let action_name = value.action || value.func
      let action = this._actions.find((a) => a.name == action_name)
      if (!action) {
        throw new Error('Action not found for key: ' + key + ', action: ' + value)
      }
      this.addKeyhitHandler(key, () => action.handler())
    }
  }
  initActions () {
    let moveTriggeredOnPause = () => {
      if (this._state && this._state._rerun_on_next_move_event) {
        this.onRerun()
      }
    }
    this.addAction({
      name: 'tree_go_in',
      getArguments () {
        return [ this.getCurrentNode() ]
      },
      handler: this.actionMoveIn.bind(this),
      shouldIgnore (node) {
        if(!this._state.can_move || node == null) {
          return true
        }
      },
      triggeredOnPause: moveTriggeredOnPause,
    })
    this.addAction({
      name: 'move_steps',
      getArguments (...action_args) {
        return action_args
      },
      handler: this.actionMoveSteps.bind(this),
      shouldIgnore (node) {
        if (!this._state.can_move || node == null) {
          return true
        }
      },
      triggeredOnPause: moveTriggeredOnPause,
    })
    this.addAction({
      name: 'tree_go_in',
      getArguments () {
        return [ this.getCurrentNode() ]
      },
      handler: this.actionMoveIn.bind(this),
      shouldIgnore (node) {
        if (!this._state.can_move || node == null) {
          return true
        }
      },
      triggeredOnPause: moveTriggeredOnPause,
    })
    this.addAction({
      name: 'tree_go_out',
      handler: this.actionMoveOut.bind(this),
      getArguments () {
        return [ this.getCurrentNode() ]
      },
      shouldIgnore (node) {
        if (!this._state.can_move || node == null) {
          return true
        }
      },
      triggeredOnPause: moveTriggeredOnPause,
    })
    this.addAction({
      name: 'tree_go_previous',
      handler: this.actionMovePrevious.bind(this),
      getArguments () {
        return [ this.getCurrentPosition() ]
      },
      shouldIgnore () {
        if (!this._state.can_move) {
          return true
        }
      },
      triggeredOnPause: moveTriggeredOnPause,
    })
    this.addAction({
      name: 'tree_go_next',
      handler: this.actionMoveNext.bind(this),
      getArguments () {
        return [ this.getCurrentPosition() ]
      },
      shouldIgnore () {
        if  (!this._state.can_move) {
          return true
        }
      },
      triggeredOnPause: moveTriggeredOnPause,
    })

    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: (node) => node.is_leaf && !isNaN(node.readMetaAsInt('back-n-branch', null)),
      apply: this.actionMoveBackNBranches.bind(this),
    })
    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: (node) => node.is_leaf && !!node.meta['change-tree'] || !!node.meta['change-tree-by-name'],
      apply: this.actionChangeTree.bind(this),
    })
    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: (node) => node.is_leaf && !!node.meta['webhook'],
      apply: this.actionWebhookRequest.bind(this),
    })
    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: (node) => node.is_leaf && node.readMetaAsBoolean('spell-delchar'),
      apply: this.actionSpellDelChar.bind(this),
    })
    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: (node) => node.is_leaf && node.readMetaAsBoolean('spell-finish'),
      apply: this.actionSpellFinish.bind(this),
    })
    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: (node) => node.is_leaf && !!node.getMetaFromTree('spell-branch').node,
      apply: this.actionSpellSelect.bind(this),
    })
    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: (node) => node.is_leaf && !!node.meta['select-utterance'],
      apply: this.actionSelectUtterance.bind(this),
    })
    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: (node) => node.is_leaf && !!node.getMetaFromTree('stay-in-branch').node,
      apply: this.actionSelectAndStayInBranch.bind(this),
    })
    // re-enable auto start on next action when auto_next_dead is true
    let shouldApplyRenableAutoNext = (node) => {
      return !this._state.edit_mode && this._state.mode == 'auto' && this._state.auto_next_dead
    }
    let renableAutoNext = async () => {
      this._state._auto_next_rem_loops = this._config.auto_next_loops || 0
      this._autoNextStep()
    }
    this.addToOverrideOnAction({
      action: 'tree_go_in',
      shouldApply: shouldApplyRenableAutoNext,
      apply: renableAutoNext,
    })
    this.addToOverrideOnAction({
      action: 'tree_go_out',
      shouldApply: shouldApplyRenableAutoNext,
      apply: renableAutoNext,
    })
  }
  _installSubInsertBackHelper (node) {
    for (let cnode of node.child_nodes) {
      if(!cnode.is_leaf) {
        var insert_pos = null;
        if (this._config.helper_back_option == 'start') {
          insert_pos = 0;
        }
        // expecting the following properties in data (_more_meta, meta, text)
        cnode._back_node = new PascoNode({
          _more_meta: {
            istmp: true
          },
          meta: {
            'back-n-branch': '1',
            'auditory-cue': this._config.helper_back_option_cue_text || this._t('Back'),
            'back-n-branch-notify': this._config.helper_back_option_notify ? 'true' : 'false',
            'main-audio': this._config.helper_back_option_main_audio ? this._core.resolveUrl(this._config.helper_back_option_main_audio, this._state.config_url) : null,
            'cue-audio': this._config.helper_back_option_cue_audio ? this._core.resolveUrl(this._config.helper_back_option_cue_audio, this._state.config_url) : null,
          },
          text: this._config.helper_back_option_main_text || this._t('Back'),
        });
        this._uibridge.insertNodeBefore(cnode._back_node, cnode, insert_pos)
        this._installSubInsertBackHelper(cnode)
      }
    }
  }
  _installSubAddStayInBranch (node) {
    for (let cnode of node.child_nodes) {
      if (!cnode.is_leaf) {
        if (!('stay-in-branch' in cnode.meta)) {
          cnode._helper_stay_in_branch_added = true
          cnode.meta['stay-in-branch'] = 'true'
        }
        this._installSubAddStayInBranch(cnode)
      }
    }
  }
  async installRootNode (root_node) {
    this._root_node = root_node
    // init positions
    this._state.positions = [ {
      node: this._root_node,
      index: -1
    } ];
    if (!this._state.edit_mode) {
      if (this._config.helper_back_option) {
        this._installSubInsertBackHelper(root_node)
      }
      if (this._config.helper_stay_in_branch_for_all) {
        this._installSubAddStayInBranch(root_node)
      }
      await this.generateDyn(root_node)
    }
    this._uibridge.renderNode(root_node)
  }
  /**** END OF INIT IMPL ****/

  async destroy () {
    if (this._started) {
      await this.stop()
    }
    this._uibridge.disableWheelCapture()
    if (this._wheel_timeout != null) {
      clearTimeout(this._wheel_timeout)
      this._wheel_timeout = null
    }
    this._uibridge.disableNavigationButtons()
    this._uibridge.disableKeyboardCapture()
    this._uibridge.disableMouseCapture()
    this._event_manager.removeAllListeners()
    this.clearKeyHandlers()
  }

  callAction (name, ...args) {
    let action = this._actions.find((a) => a.name == name)
    if (!action) {
      throw new Error('Action not found: ' + name)
    }
    return action.handler(...args)
  }

  addAction ({ name, handler, shouldIgnore, getArguments, triggeredOnPause }) {
    this._actions.push({
      name,
      handler: async (...action_args) => {
        if (!this._started) {
          return
        }
        if (this._state._paused) {
          if (triggeredOnPause) {
            triggeredOnPause.apply(this)
          }
          return
        }
        let args = typeof getArguments == 'function' ? getArguments.apply(this, action_args) : action_args
        if (typeof shouldIgnore == 'function' && shouldIgnore.apply(this, args)) {
          return
        }
        for (let override_action of this._override_actions.filter((a) => a.action == name)) {
          let shouldApply = override_action.shouldApply.apply(this, args)
          if (shouldApply) {
            return await override_action.apply.apply(this, args)
          }
        }
        return await handler.apply(this, args)
      },
    })
  }
  addKeyhitHandler (code, handler) {
    this._keyhit_handlers.push({ code: code+'', handler })
  }
  removeKeyhitHandlerByCode (code) {
    code = code+''
    this._keyhit_handlers = this._keyhit_handlers.filter((a) => a.code != code)
  }
  getKeyhitHandlers () {
    return this._keyhit_handlers
  }
  willHitKeyHandle () {
    if (!this._started) {
      return false
    }
    let code = event.code+''
    let keyhit_handler = this._keyhit_handlers.find((a) => a.code == code)
    return !!keyhit_handler
  }

  async start (options) {
    if (this._started) {
      throw new Error('Already started!')
    }
    this._started = true
    // start if _state is given acts as continue
    // modes [auto,switch]
    // diff, auto iterates through nodes <-> switch iteration is manual
    // mode controls the work flow, start handles mode
    // positions are no longer saved between start/stop
    let state = Object.assign(this._state, {
      can_move: true,
      mode: this._config.mode || 'auto',
      positions: [ {
        node: this._root_node,
        index: -1
      } ],
      select_path: [],
      _auto_next_rem_loops: this._config.auto_next_loops || 0,
      _wheel_delta: [ 0, 0 ],
      _paused: false,
    })
    if (MODES.indexOf(state.mode) == -1) {
      throw new Error("Unknown mode " + state.mode)
    }
    if (this._root_node.child_nodes.length == 0) {
      throw new Error('Root node has no child_nodes')
    }
    // trigger change in position to refresh
    await this._beforeUpdateInPositionsAsync()
    this._updateSelectPath()
    await this.doUpdatePositions()
    // operation starts
    if (!state.edit_mode && state.mode == 'auto') {
      this._autoNextStep()
    }
  }
  async _autoNextStep () {
    let state = this._state
    if(!this._started || state._paused) {
      return // stop the loop
    }
    let run = async () => {
      try {
        if (!this._started || state._paused) {
          return // stop the loop
        }
        let running_move_controller = this._move_manager.getRunningMoveController()
        if (running_move_controller) {
          await running_move_controller.getRunPromise()
        } else {
          var position = this.getCurrentPosition()
          if (position.node.child_nodes && position.index + 1 == position.node.child_nodes.length) {
            // at re-cycle
            if (Math.abs(--state._auto_next_rem_loops) < 1) {
              // stop the loop
              state.auto_next_dead = true
              // start at begining next time
              var pos = state.positions[state.positions.length - 1]
              pos.index = -1
              return
            }
          }
          await this.actionMoveNext(position)
        }
        if (this._state != state) {
          return // state has changed, exit
        }
        this._autoNextStep()
      } catch (err) {
        this.emit('error', err)
      }
    }
    let runWithDelay = (delay) => {
      let clearListeners = () => {
        this.removeListener('move', onMove)
        this.removeListener('stop', clearListeners)
        if (this._auto_active_timeout != null) {
          clearTimeout(this._auto_active_timeout)
          this._auto_active_timeout = null
        }
      }
      let onMove = () => {
        // auto move interrupted, reset remained loop
        clearListeners()
        this._state._auto_next_rem_loops = this._config.auto_next_loops || 0
        run()
      }
      this._event_manager.addNodeListenerFor(this, 'move', onMove)
      this._event_manager.addNodeListenerFor(this, 'stop', clearListeners)
      this._auto_active_timeout = setTimeout(() => {
        this._auto_active_timeout = null
        clearListeners()
        run()
      }, delay)
    }
    state.auto_next_dead = false
    this._auto_active_timeout = setTimeout(() => {
      this._auto_active_timeout = null
      let position = this.getCurrentPosition()
      if (position.index == -1 && this._config.auto_next_atfirst_delay) {
        // delay auto_next for next entry
        runWithDelay(this._config.auto_next_atfirst_delay)
      } else if (position.index + 1 == position.node.child_nodes.length) {
        runWithDelay(this._config.auto_next_recycle_delay || 0)
      } else {
        run()
      }
    }, (this.isFirstAutoNextRun() && !!this._config.auditory_cue_first_run_voice_options ?
        this._config.auto_next_first_run_delay : null) || this._config.auto_next_delay || 500)
  }
  async stop () {
    if (!this._started) {
      throw new Error('Engine is not running!')
    }
    this._started = false
    let running_move_controller = this._move_manager.getRunningMoveController()
    if (running_move_controller) {
      running_move_controller.abort()
    }
    if (this._auto_active_timeout) {
      clearTimeout(this._auto_active_timeout)
      this._auto_active_timeout = null
    }
    this.emit('stop')
  }
  async pause () {
    if (!this._started) {
      throw new Error('Engine is not running!')
    }
    let state = this._state
    state._paused = true
    if (this._auto_active_timeout != null) {
      clearTimeout(this._auto_active_timeout)
      this._auto_active_timeout = null
    }
  }
  async resume () {
    if (!this._started) {
      throw new Error('Engine is not running!')
    }
    let state = this._state
    state._paused = false;
    // trigger change in position to refresh
    await this._beforeUpdateInPositionsAsync()
    this._updateSelectPath()
    await this.doUpdatePositions()
    if (!this._state.edit_mode && this._state.mode == 'auto' && this._auto_active_timeout == null) {
      this._autoNextStep()
    }
  }
  async resetState () {
    Object.assign(this._state, {
      can_move: true,
      mode: this._config.mode || 'auto',
      positions: [ {
        node: this._root_node,
        index: -1
      } ],
      select_path: [],
      _auto_next_rem_loops: this._config.auto_next_loops || 0,
      _wheel_delta: [ 0, 0 ],
      _paused: false,
      _rerun_on_next_move_event: false
    })
  }
  /**
   *  This function should get called once an entry is added or removed in positions
   */
  _updateSelectPath () {
    // update select_path
    this._state.select_path = this._state.positions.slice(0, this._state.positions.length - 1)
    this.emit('select-path-change')
  }

  /**
   *  This function encapsulates the moves needed to happen on an update
   *  on positions or it will update the state of ui instead of performing
   *  the moves depending on given parameters
   */
  async doUpdatePositions () {
    let node = this.getCurrentNode()
    if (node == null) {
      this._uibridge.updateActivePositions()
    } else {
      await this._move_manager.performScanMove()
    }
  }

  getState () {
    return this._state
  }
  getUIBridge () {
    return this._uibridge
  }
  getConfig () {
    return this._config
  }
  getCore () {
    return this._core
  }
  getConfigUrl () {
    if (!this._state || !this._state.config_url) {
      throw new Error('config_url is not defined in the state!')
    }
    return this._state.config_url
  }
  getTreeUrl () {
    if (!this._state || !this._state.tree_url) {
      throw new Error('tree_url is not defined in the state!')
    }
    return this._state.tree_url
  }
  isFirstAutoNextRun () {
    // check if the current cycle is the first one
    return this._state._auto_next_rem_loops == this._config.auto_next_loops
  }

  getCurrentPosition () {
    if(!this._started) {
      throw new Error('Engine is not running!')
    }
    return this._state.positions[this._state.positions.length - 1]
  }
  getCurrentNode () {
    let pos = this.getCurrentPosition()
    if (pos.index == -1) {
      return null
    }
    return pos.node.child_nodes[pos.index]
  }

  /**** START OF ACTIONS ****/
  async actionMoveIn (node) {
    if (node == null) {
      return
    }
    if (node.is_leaf) {
      // for edit_mode do nothing
      if (this._state.edit_mode) {
        return
      }
      return await this.actionSelectUtterance(node)
    } else {
      if (node.child_nodes.length == 0) {
        return // has no leaf, nothing to do
      }
      await this._beforeUpdateInPositionsAsync()
      this._state.positions.push({
        node: node,
        index: 0
      });
      this._updateSelectPath()
      await this._move_manager.performNotifyMove(node)
    }
  }
  async actionMoveOut () {
    await this._beforeUpdateInPositionsAsync()
    if (this._state.positions.length > 1) {
      await this._beforePopFromPositionsAsync(1)
      this._state.positions.pop();
      this._updateSelectPath()
    } else {
      // no more way, start at top (reset)
      this._state.positions[0].index = 0;
    }
    await this._move_manager.performScanMove()
  }
  async actionMovePrevious (position) {
    await this._beforeUpdateInPositionsAsync()
    position.index -= 1;
    if (position.index < 0) {
      position.index = position.node.child_nodes.length - 1;
    }
    await this._move_manager.performScanMove()
  }
  async actionMoveNext (position) {
    position.index += 1;
    if (position.index >= position.node.child_nodes.length) {
      position.index = position.index % position.node.child_nodes.length;
    }
    await this._move_manager.performScanMove()
  }
  async actionMoveBackNBranches (node) {
    var count = node.readMetaAsInt('back-n-branch')
    if (count == null || !(count > 0)) {
      console.warn('back-n-branch is not a valid number: ', node.meta['back-n-branch'])
      return // not an acceptable number
    }
    await this._beforeUpdateInPositionsAsync()
    await this._beforePopFromPositionsAsync(count)
    if (this._state.positions.length <= count + 1) {
      count = this._state.positions.length - 1
    }
    this._state.positions.splice(this._state.positions.length - count, count)
    this._updateSelectPath()
    if (node.readMetaAsBoolean('back-n-branch-notify', false)) {
      await this._move_manager.performNotifyMove(node)
    } else {
      await this._move_manager.performScanMove()
    }
  }
  async actionChangeTree (node) {
    try {
      if (node.meta['change-tree']) {
        await this._uibridge.changeTreeFromFile(node.meta['change-tree'])
      } else if (node.meta['change-tree-by-name']) {
        await this._uibridge.changeTreeFromFile(node.meta['change-tree-by-name'])
      }
    } catch (err) {
      let msg = ''
      if (err instanceof NotFoundError) {
        msg = this._t("Could not find tree with this name")
      } else {
        msg = this._t("Could not change to this tree")
        console.error(err)
      }
      await this._move_manager.performNotifyMove(node, {
        main_override_msg: msg,
      })
    }
  }
  async actionWebhookRequest (node) {
    try {
      let url = node.meta['webhook']
      let method = node.meta['webhook-method'] || 'POST'
      let contenttype = node.meta['webhook-content-type'] || 'application/json'
      let body = node.meta['webhook-body']
      let success_msg = node.meta['webhook-success-message']
      let skip_validating_response = node.readMetaAsBoolean('webhook-skip-validating-response')
      let modify_headers = node.readMetaAsBoolean('webhook-modify-headers')
      if (contenttype == 'application/json') {
        try {
          if (!body) {
            body = '{}'
          }
          // validate json body
          JSON.parse(body)
        } catch (err) {
          err.utter_message = 'Could not parse request body as json'
          throw err
        }
      }
      let headers = {};
      if (['HEAD','GET'].indexOf(method) == -1) {
        if (modify_headers) {
          headers['Content-Type'] = contenttype;
        }
      } else {
        contenttype = null;
      }
      let resp
      try {
        resp = await window.fetch(url, {
          method: method,
          headers: headers,
          body: contenttype ? body : null,
        })
      } catch (err) {
        err.utter_message = this._t('Request failed');
        reject(err);
      }
      if (!skip_validating_response) {
        let respdata
        try {
          respdata = await resp.json()
        } catch (err) {
          err.utter_message = 'Unexpected response, Expecting json data'
          throw err;
        }
        if ((respdata.status+'').toLowerCase() != 'success') {
          let err = new Error('webhook request was not successful: ' + JSON.stringify(respdata))
          err.utter_message = this._t('Request failed');
          throw err;
        }
      }
      await this._selectUtteranceWithMessage(success_msg)
    } catch (err) {
      console.error(err)
      let errmsg = err.utter_message || 'Unknown error';
      await this._move_manager.performNotifyMove(node, {
        main_override_msg: errmsg
      })
    }
  }
  async actionSelectAndStayInBranch (node) {
    let { node: stay_in_branch_node } = node.getMetaFromTree('stay-in-branch')
    let position_idx = this._state.positions.findIndex((a) => a.node == stay_in_branch_node)
    if (position_idx == -1) {
      throw new Error("Corrupt tree!");
    }
    let pop_count = this._state.positions.length - position_idx - 1
    await this._beforeUpdateInPositionsAsync()
    if (pop_count > 0) {
      await this._beforePopFromPositionsAsync(pop_count)
      this._state.positions = this._state.positions.slice(0, position_idx + 1);
      this._state.positions[this._state.positions.length - 1] = 0
      this._updateSelectPath()
    } else {
      this._state.positions[this._state.positions.length - 1] = 0
    }
    await this._move_manager.performNotifyMove(node)
  }
  async actionSelectUtterance (node) {
    try {
      this.onBeforeSelect()
      await this._move_manager.performSelectMove()
    } catch (err) {
      // pass errors
      console.warn(err)
    } finally {
      this.onSelect(node)
    }
  }
  async _selectUtteranceWithMessage (message) {
    try {
      this.onBeforeSelect()
      await this._move_manager.performSelectMove({ override_msg: spell_text })
    } catch (err) {
      // pass errors
      console.warn(err)
    } finally {
      this.onSelect(node)
    }
  }


  /**
   * override_action is an object containing (shouldApply, apply, action)
   *  - `shouldApply` is a function that returns a boolean indicating if it should get applied instead of the main action
   *  - `apply` is the substitute function for the action
   *  - `action` is the name of the target action
   */
  addToOverrideOnAction (override_action) {
    this.addToBackOfOverrideOnAction(override_action)
  }
  addToBackOfOverrideOnAction (override_action) {
    this._override_actions.push(override_action)
  }
  addToFrontOfOverrideOnAction (override_action) {
    this._override_actions.unshift(override_action)
  }
  /**** END OF ACTIONS ****/

  async onRerun () {
    await this.pause()
    this.resetState()
    this._uibridge.hidePopupMessage()
    // update dyn, before start again
    await this.generateDyn(this._root_node)
    this._uibridge.renderNode(this._root_node)
    await this.resume()
  }

  onBeforeSelect () {
    this.pause()
  }
  onSelect (node) {
    this._state._rerun_on_next_move_event = true
  }

  async actionMoveSteps (amount) {
    var position = this.getCurrentPosition();
    position.index += amount;
    if (position.index >= position.node.child_nodes.length) {
      position.index = position.index % position.node.child_nodes.length;
    } else if (position.index < 0) {
      position.index = Math.ceil(Math.abs(position.index) / position.node.child_nodes.length) * position.node.child_nodes.length + position.index;
    }
    await this._move_manager.performScanMove()
  }
  buildNodePositions (node) {
    let positions = []
    let tmp = node
    while (tmp.parent_node) {
      let idx = tmp.parent_node.child_nodes.indexOf(tmp)
      if(idx == -1) {
        throw new Error("Corrupt tree!");
      }
      positions.unshift({
        node: tmp.parent_node,
        index: idx,
      })
      tmp = tmp.parent_node
    }
    return positions
  }
  async changeCurrentNode (node, options) {
    let { silent } = options || {}
    await this._beforeUpdateInPositionsAsync()
    let positions = this.buildNodePositions(node)
    if (positions.length == 0) {
      throw new Error("the node should belong to a tree");
    }
    this._state.positions = positions
    this._updateSelectPath()
    if (!silent) {
      await this._move_manager.performScanMove()
    } else {
      this.emit('move', node)
      this._uibridge.updateActivePositions()
    }
  }
  
  /**** START SPELL IMPL ****/
  _addToSpellTextOnSelect (selected_node) {
    let spell_positions = this._state.positions.filter((a) => 'spell-branch' in a.node.meta)
    if (spell_positions.length == 0) {
      throw new Error("Not in a spell-branch!");
    }
    let spell_position = spell_positions[spell_positions.length - 1]
    let content = spell_position._spell_content
    if (!spell_position._spell_content) {
      content = spell_position._spell_content = []
    }
    if (selected_node.meta['spell-word']) {
      // spell-word replaces existing letters until last word
      var last_word_idx = content.lastIndexOf(' ');
      if (last_word_idx == -1) {
        content.splice(0, content.length); // empty the list
      } else if (last_word_idx + 1 != content.length) {
        content.splice(last_word_idx, content.length - last_word_idx, ' ');
      }
      content.push(selected_node.meta['spell-word'])
      content.push(' ');
    } else {
      let letter = selected_node.meta['spell-letter'] || selected_node.text
      content.push(letter)
    }
  }
  async actionSpellFinish (node) {
    let { node: spell_branch_node } = node.getMetaFromTree('spell-branch')
    if (spell_branch_node == null) {
      throw new Error('spell-finish is not inside a spell-branch node')
    }
    if (node.meta['spell-letter'] || node.meta['spell-word']) {
      this._addToSpellTextOnSelect(node)
    }
    let spell_text = this.getCurrentSpellText()
    if (!spell_text) {
      spell_text = this._t("Nothing selected")
    }
    this._uibridge.displayPopupMessage(spell_text)
    try {
      this.onBeforeSelect()
      await this._move_manager.performSelectMove({ override_msg: spell_text })
    } catch (err) {
      // pass errors
      console.warn(err)
    } finally {
      this.onSelect(node)
    }
  }
  async actionSpellSelect (node) {
    let { node: spell_branch_node } = node.getMetaFromTree('spell-branch')
    if (spell_branch_node == null) {
      throw new Error('The node is not in a spell-branch')
    }
    let spell_position = this._state.positions.find((a) => a.node == spell_branch_node)
    if (spell_position == null) {
      throw new Error("Corrupt positions!");
    }
    this._addToSpellTextOnSelect(node)
    if (spell_branch_node.readMetaAsBoolean('spell-update-dyn-onchange')) {
      spell_position._dyndirty = true
    }
    await this._beforeUpdateInPositionsAsync()
    this._updatePositionForSpellBranch(node)
    this._updateSelectPath()
    let msg = this.getUtteranceMessageFromCurrentSpellText()
    await this._move_manager.performNotifyMove(node, {
      main_override_msg: msg,
    })
  }
  async actionSpellDelChar (node) {
    let { node: spell_branch_node } = node.getMetaFromTree('spell-branch')
    if (spell_branch_node == null) {
      throw new Error('The node is not in a spell-branch')
    }
    let spell_position = this._state.positions.find((a) => a.node == spell_branch_node)
    if (spell_position == null) {
      throw new Error("Corrupt positions!");
    }
    let content = spell_position._spell_content
    if (!content) {
      content = spell_position._spell_content = []
    }
    // keep removing from content until the piece is not a space
    let piece;
    while ((piece = content.pop()) == ' ') {
      // pass
    }
    if (spell_branch_node.readMetaAsBoolean('spell-update-dyn-onchange')) {
      spell_position._dyndirty = true
    }
    let msg = this.getUtteranceMessageFromCurrentSpellText()
    this._updatePositionForSpellBranch(node)
    this._updateSelectPath()
    await this._move_manager.performNotifyMove(node, {
      main_override_msg: msg,
    })
  }
  getUtteranceMessageFromCurrentSpellText () {
    if (!this._started) {
      throw new Error('Engine is not running!')
    }
    let msg = ''
    let spell_position = this._state.positions.find((a) => !!a._spell_content)
    if (spell_position != null) {
      let content = spell_position._spell_content
      let idx = content.lastIndexOf(' ');
      if (idx != -1) {
        msg = content.slice(0, idx).join('') + ' ' +
          content.slice(idx + 1).join(' ');
      } else {
        msg = content.join(' ');
      }
    }
    return msg
  }
  getCurrentSpellText () {
    if (!this._started) {
      return '' //
    }
    let txt = ''
    let tmp = this._state.positions.filter((a) => !!a._spell_content)
    if(tmp.length > 0) {
      txt = tmp[tmp.length-1]._spell_content.join('')
    }
    return txt
  }
  getCurrentSpellWord () {
    let txt = this.getCurrentSpellText().split(' ')
    return txt[txt.length-1]
  }
  _updatePositionForSpellBranch (node) {
    let { node: spell_branch_node } = node.getMetaFromTree('spell-branch')
    if (spell_branch_node == null) {
      throw new Error('The node is not in a spell-branch')
    }
    let spell_position = this._state.positions.find((a) => a.node == spell_branch_node)
    if (spell_position == null) {
      throw new Error("Corrupt positions!");
    }
    let { node: stay_in_branch_node } = node.getMetaFromTree('stay-in-branch')
    let spell_position_idx = this._state.positions.findIndex((a) => a == spell_position)
    let stay_in_branch_idx = this._state.positions.findIndex((a) => a.node == stay_in_branch_node)
    let keep_idx = Math.max(spell_position_idx, stay_in_branch_idx)
    if (keep_idx == -1) {
      throw new Error("Corrupt positions!");
    }
    this._state.positions.slice(0, keep_idx + 1)
    this._state.positions[this._state.positions.length - 1].index = 0
  }
  /**** STOP SPELL IMPL ****/

  async _beforePopFromPositionsAsync (count) {
    // At the moment there's no update on dyn nodes when positions are removed on the back event
    // This is not an ideal solution for fixign this issue
    let positions = this._state.positions
    let first_pos_with_dyn = positions.slice(Math.max(0, positions.length - count)).find((a) => !!a.node.meta['dyn'])
    if (first_pos_with_dyn) {
      let dynnode = first_pos_with_dyn.node
      await this.generateDyn(dynnode)
      this._uibridge.runOnNextUpdateActivePositions(() => {
        this._uibridge.renderNode(dynnode)
      })
    }
  }
  async _beforeUpdateInPositionsAsync () {
    if (this._state.edit_mode) {
      return
    }
    let root_dirtydyn_node
    for (let pos of this._state.positions) {
      if (!root_dirtydyn_node && pos._dyndirty) {
        root_dirtydyn_node = pos.node
      }
      delete pos._dyndirty
    }
    if (root_dirtydyn_node) {
      await this.generateDyn(root_dirtydyn_node)
      this._uibridge.runOnNextUpdateActivePositions(() => {
        this._uibridge.renderNode(root_dirtydyn_node)
      })
    }
  }
  onUpdateMessageBar () {
    if(!this._started) {
      return
    }
    let should_hide = true
    if (this._config.display_message_bar_at_spell_branch) {
      let node = this.getCurrentNode()
      let spell_meta = node ? node.getMetaFromTree('spell-branch').node : null
      if (!!spell_meta) {
        should_hide = false
        this._uibridge.updateMessageBar({
          type: 'spell',
          content: (this.getCurrentSpellText()||''),
        })
      }
    }
    if (should_hide) {
      this._uibridge.updateMessageBar(null)
    }
  }

  /**** START OF DYN ****/
  revertDyn (node, options) {
    options = options || {}
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
  _generateDynRevertData (node) {
    return node.__dynrevert_data = {
      node,
      child_nodes_data: node.is_leaf ? null : node.child_nodes.map(this._generateDynRevertData.bind(this)),
    }
  }
  async generateDyn (node, options) {
    options = options || {}
    this.revertDyn(node)
    this._generateDynRevertData(node)
    await this._dyngenerator.generate(node)
  }
  /**** END OF DYN ****/

  /**** START OF EVENT HANDLERS ****/
  didHitNavigationButton (event) {
    switch (event.name) {
      case 'nav-upbtn':
        this.callAction('tree_go_previous')
        break;
      case 'nav-downbtn':
        this.callAction('tree_go_next')
        break;
      case 'nav-leftbtn':
        if(window.icu && icu.rtl) {
          this.callAction('tree_go_in')
        } else {
          this.callAction('tree_go_out')
        }
        break;
      case 'nav-rightbtn':
        if(window.icu && icu.rtl) {
          this.callAction('tree_go_out')
        } else {
          this.callAction('tree_go_in')
        }
        break;
    }
  }
  didMoveWheel (event) {
    let { deltaX, deltaY } = event
    let state = this._state
    // clear wheel delta after 3s
    if (this._wheel_timeout != null) {
      clearTimeout(this._wheel_timeout)
    }
    this._wheel_timeout = setTimeout(() => {
      state._wheel_delta = [ 0, 0 ]
      this._wheel_timeout = null
    }, 3000)
    state._wheel_delta = [ state._wheel_delta[0] + deltaX,
                           state._wheel_delta[1] + deltaY ]
    var x_threshold = this._config.wheel_x_threshold || 100
    if (Math.abs(state._wheel_delta[0]) > x_threshold) {
      if (state._wheel_delta[0] > 0 && !this._config.wheel_x_reverse) {
        this.callAction('tree_go_in')
      } else {
        this.callAction('tree_go_out')
      }
      state._wheel_delta = [ 0, 0 ]
    }
    var y_threshold = this._config.wheel_y_threshold || 100
    if (Math.abs(state._wheel_delta[1]) > y_threshold) {
      var n = Math[state._wheel_delta[1] < 0 ? "ceil" : "floor"](state._wheel_delta[1] / y_threshold) * (this._config.wheel_y_reverse ? -1 : 1)
      this.callAction('move_steps', n)
      state._wheel_delta = [ 0, 0 ]
    }
  }
  didHitKey (event) {
    if (!this._started) {
      return
    }
    let code = event.code+''
    let keyhit_handler = this._keyhit_handlers.find((a) => a.code == code)
    if (keyhit_handler) {
      keyhit_handler.handler(event)
    }
  }
  /**** END OF EVENT HANDLERS ****/

}
