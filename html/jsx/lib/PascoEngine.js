import * as EventEmitter from 'events'
import PascoTreeNode from './PascoTreeNode'
import { modules: dynModules } from './dyn-modules' 

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
    this._core = core
    this._uibridge = uibridge
    this._t = uibridge.getLocalizer()._
    this._dyngenerator = new PascoDynNodeGenerator()
    for (let module of dynModules) {
      this._dyngenerator.addModule(module)
    }
    this._actions = []
    this._keyhit_handlers = []
    this._move_in_override_actions = []
    this._move_out_override_actions = []
    this.initActions()
    this.initKeyHandlers()

    // 
    this.addToFrontOfOverrideMoveInAction({

    })
  }

  /**** START OF INIT IMPL ****/
  async init (config, root_node, state) {
    if (this._started) {
      throw new Error('Cannot init when engine is started!')
    }
    this._config = config
    this._state = state
    await this.installRootNode(root_node)
    let mode = this._config.mode || 'auto'
    if (mode == 'wheel') {
      this._uibridge.enableWheelCapture()
    } else {
      this._uibridge.disableWheelCapture()
    }
    if ((this._config._onscreen_navigation || this._state.edit_mode)) {
      this._uibridge.enableNavigationButtons()
    } else {
      this._uibridge.disableNavigationButtons()
    }
    this._uibridge.enableKeyboardCapture()
  }
  initKeyHandlers () {
    for (let [key, value] = Object.entries(this._config.keys || this._getDefaultKeys())) {
      let action_name = value.action || value.func
      let action = this._actions.find((a) => a.name == action_name)
      if (!action) {
        throw new Error('Action not found for key: ' + key + ', action: ' + value)
      }
      this.addKeyhitHandler(key, () => action.handler())
    }
  }
  initActions () {
    this.addAction('tree_go_in', this.actionMoveIn.bind(this))
    this.addAction('tree_go_out', this.actionMoveOut.bind(this))
    this.addAction('tree_go_previous', this.actionMovePrevious.bind(this))
    this.addAction('tree_go_next', this.actionMoveNext.bind(this))
  }
  _installSubInsertBackHelper (node) {
    for (let cnode of node.child_nodes) {
      if(!cnode.is_leaf) {
        var insert_pos = null;
        if (config.helper_back_option == 'start') {
          insert_pos = 0;
        }
        // expecting the following properties in data (_more_meta, meta, text)
        cnode._back_node = new PascoTreeNode({
          _more_meta: {
            istmp: true
          },
          meta: {
            'back-n-branch': '1',
            'auditory-cue': config.helper_back_option_cue_text || this._t('Back'),
            'back-n-branch-notify': config.helper_back_option_notify ? 'true' : 'false',
            'main-audio': config.helper_back_option_main_audio ? get_file_url(config.helper_back_option_main_audio, config_fn) : null,
            'cue-audio': config.helper_back_option_cue_audio ? get_file_url(config.helper_back_option_cue_audio, config_fn) : null,
          },
          text: config.helper_back_option_main_text || this._t('Back'),
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
        _helper_add_stay_in_branch_for_all(cnode)
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
      await this.generateDyn(root_node, { skip_render: true })
    }
    this._uibridge.renderNode(root_node)
  }
  /**** END OF INIT IMPL ****/

  destroy () {
    this._uibridge.disableWheelCapture()
    this._uibridge.disableNavigationButtons()
    this._uibridge.enableKeyboardCapture()
  }

  addAction (name, action) {
    this._actions.push({ name, handler })
  }
  addKeyhitHandler (key, handler) {
    this._keyhit_handlers.push({ key, handler })
  }
  getKeyhitHandlers () {
    return this._keyhit_handlers
  }

  start (options) {
    if (this._started) {
      throw new Error('Already started!')
    }
    this._started = true
    // start if _state is given acts as continue
    // modes [auto,switch]
    // diff, auto iterates through nodes <-> switch iteration is manual
    // mode controls the work flow, start handles mode
    // positions are no longer saved between start/stop
    let state = this._state = {
      can_move: true,
      mode: this._config.mode || 'auto',
      select_path: [],
      _active_elements: [],
      _highlighted_elements: [],
      _auto_next_rem_loops: this._config.auto_next_loops || 0,
      _wheel_delta: [ 0, 0 ],
      _paused: false,
    }
    if (MODES.indexOf(state.mode) == -1) {
      throw new Error("Unknown mode " + state.mode)
    }
    if (tree.nodes.length == 0) {
      throw new Error('Tree has zero length')
    }
    {
      await _before_changeposition()
      if (state.positions[state.positions.length - 1].index != -1) {
        _scan_move()
      } else {
        _update_active_positions()
      }
      this.emit('select-path-change')
    }
    // operation starts
    if (state.mode == 'auto') {
      state.auto_next_start = auto_next
      state.auto_next_dead = false
      this._autoNextStep()
    }
  }
  async _autoNextStep () {
    let state = this._state
    if(state._stopped || state._auto_active_timeout != null) {
      return // stop the loop
    }
    let run = async () => {
      try {
        if (state._stopped || state._paused) {
          return // stop the loop
        }
        if (state._running_move != null) {
          await state._running_move
        } else {
          var position = this.getCurrentPosition()
          if (position.index + 1 == position.tree.nodes.length) {
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
          await this.actionMoveNext()
        }
        this._autoNextStep()
      } catch (err) {
        this.emit('handle-error', err)
      }
    }
    let runWithDelay = (delay) => {
      let clearListeners = () => {
        this.removeListener('move', onMove)
        this.removeListener('stop', clearListeners)
        if (state._auto_active_timeout != null) {
          clearTimeout(state._auto_active_timeout)
          delete state._auto_active_timeout
        }
      }
      let onNewMove = () => {
        clearListeners()
        run()
      }
      this.addListener('move', onMove)
      this.addListener('stop', clearListeners)
      state._auto_active_timeout = setTimeout(() => {
        delete state._auto_active_timeout
        clearListener()
        run()
      }, delay)
    }
    state.auto_next_dead = false
    state._auto_active_timeout = setTimeout(() => {
      delete state._auto_active_timeout
      let position = this.getCurrentPosition()
      if (position.index == -1 && this._config.auto_next_atfirst_delay) {
        // delay auto_next for next entry

        runWithDelay(this._config.auto_next_atfirst_delay)
      } else if (position.index + 1 == position.tree.nodes.length) {
        runWithDelay(this._config.auto_next_recycle_delay || 0)
      } else {
        run()
      }
    }, (this._isFirstRun() && !!this._config.auditory_cue_first_run_voice_options ?
        this._config.auto_next_first_run_delay : null) || this._config.auto_next_delay || 500)
  }
  async stop () {
    if(!this._started) {
      throw new Error('Engine is not running!')
    }
    this._started = false
    _before_new_move() // stop speech and highlights
    if(this._state._active_timeout) {
      clearTimeout(this._state._active_timeout);
      delete this._state._active_timeout;
    }
    this.emit('stop')
  }
  async pause () {
    let state = this._state
    if (!state || state._stopped) {
      throw new Error('state is not initialized!')
    }
    state._paused = true
    if (state._auto_active_timeout != null) {
      clearTimeout(state._auto_active_timeout)
      state._auto_active_timeout = null
    }
  }
  async resume () {
    let state = this._state
    if (!state || state._stopped) {
      throw new Error('state is not initialized!');
    }
    state._paused = false;
    await _before_changeposition()
    if(state.positions[state.positions.length - 1].index != -1) {
      _scan_move();
    } else {
      _update_active_positions();
    }
    _on_update_select_path();
    if(state.mode == 'auto' && state._auto_active_timeout == null) {
      state.auto_next_start();
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
      _active_elements: [],
      _highlighted_elements: [],
      _auto_next_rem_loops: this._config.auto_next_loops || 0,
      _wheel_delta: [ 0, 0 ],
      _paused: false,
      auto_next_dead: false,
    })
  }

  getState () {
    return this._state
  }
  getCore () {
    return this._core
  }
  _isFirstRun () {
    // check if the current cycle is the first one
    return this._state._auto_next_rem_loops == this._config.auto_next_loops
  }


  /**** START OF ACTIONS ****/
  async actionMoveIn () {
    if(!this._started || !this._state.can_move) {
      return
    }
    
  }
  async actionMoveOut () {
    if(!this._started || !this._state.can_move) {
      return
    }

  }
  async actionMovePrevious () {
    if(!this._started || !this._state.can_move) {
      return
    }

  }
  async actionMoveNext () {
    if(!this._started || !this._state.can_move) {
      return
    }

  }
  async actionMoveSteps () {
    if(!this._started || !this._state.can_move) {
      return
    }

  }
  addToBackOfOverrideMoveInAction (override_action) {
    this._move_in_override_actions.push(override_action)
  }
  addToFrontOfOverrideMoveInAction (override_action) {
    this._move_in_override_actions.unshift(override_action)
  }
  addToBackOfOverrideMoveOutAction (override_action) {
    this._move_out_override_actions.push(override_action)
  }
  addToFrontOfOverrideMoveOutAction (override_action) {
    this._move_out_override_actions.unshift(override_action)
  }
  /**** END OF ACTIONS ****/

  /**** START OF DYN ****/
  revertDyn (node, options) {
    options = options || {}
    if (node.__dynrevert_data) {
      this._revertDynSub(node.__dynrevert_data)
      if (options.skip_render) {
        this._uibridge.renderNode(node)
      }
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
    node.__dynrevert_data = {
      node,
      child_nodes_data: node.is_leaf ? null : node.child_nodes.map(this.getDynRevertData.bind(this)),
    }
  }
  async generateDyn (node, options) {
    options = options || {}
    this.revertDyn(node, { skip_render: true })
    this._generateDynRevertData(node)
    await this._dyngenerator.generate(node)
    if (!options.skip_render) {
      let onrender = () => {
        this._uibridge.renderNode(node)
      }
      if (options.changing_position) {
        this.runOnNextUpdateActivePositions(onrender)
      } else {
        onrender()
      }
    }
  }
  /**** END OF DYN ****/

  /**** START OF EVENT HANDLERS ****/
  didHitNavigationButton (event) {
    switch (event.name) {
      case 'nav-upbtn':
        call = _tree_go_previous;
        break;
      case 'nav-downbtn':
        call = _tree_go_next;
        break;
      case 'nav-leftbtn':
        if(window.icu && icu.rtl) {
          call = _tree_go_in;
        } else {
          call = _tree_go_out;
        }
        break;
      case 'nav-rightbtn':
        if(window.icu && icu.rtl) {
          call = _tree_go_out;
        } else {
          call = _tree_go_in;
        }
        break;
    }
  }
  didMoveWheel (event) {
    let { deltaX, deltaY } = event
    // clear wheel delta after 3s
    if (state._wheel_timeout != null) {
      clearTimeout(state._wheel_timeout);
    }
    state._wheel_timeout = setTimeout(function () {
      state._wheel_delta = [ 0, 0 ];
      state._wheel_timeout = null;
    }, 3000);
    state._wheel_delta = [ state._wheel_delta[0] + deltaX,
                           state._wheel_delta[1] + deltaY ];
    var x_threshold = this._config.wheel_x_threshold || 30;
    if (Math.abs(state._wheel_delta[0]) > x_threshold) {
      (state._wheel_delta[0] > 0 && !this._config.wheel_x_reverse ?
       _tree_go_in() : _tree_go_out())
        .catch(handle_error);
      state._wheel_delta = [ 0, 0 ];
    }
    var y_threshold = this._config.wheel_y_threshold || 30;
    if (Math.abs(state._wheel_delta[1]) > y_threshold) {
      var n = Math[state._wheel_delta[1] < 0 ? "ceil" : "floor"](state._wheel_delta[1] / y_threshold) * (this._config.wheel_y_reverse ? -1 : 1);
      _tree_go_n_steps(n)
        .catch(handle_error);
      state._wheel_delta = [ 0, 0 ];
    }
  }
  didHitKey (event) {
    if (!this._started || this._state._keyhit_off) {
      return
    }
    let code = event.code
    let keyhit_handler = this._keyhit_handlers.find((a) => a.key == code)
    if (keyhit_handler) {
      keyhit_handler.handler(event)
    }
  }
  /**** END OF EVENT HANDLERS ****/

}
