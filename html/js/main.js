var config_fn, tree_fn, config, tree, state = null, tree_element, napi, speaku,
    config_json, words_cache = {}, tree_contentsize_xstep = 50, locale,
    tree_wrp_element;
Promise.all([
  window.cordova ? NativeAccessApi.onready() : Promise.resolve(),
  new Promise(function(resolve) { // domready
    document.addEventListener('DOMContentLoaded', function() {
      document.removeEventListener('DOMContentLoaded', arguments.callee, false);
      resolve();
    }, false);
  })
])
  .then(initialize_app)
  .catch(handle_error_checkpoint())
  .then(function() {
    config_fn = default_config;
    napi = new NativeAccessApi();
    speaku = new SpeakUnit(napi);
    speaku.init();
  })
  .then(function() {
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
  })
  .then(function() {
    // ready to start, load config
    return get_file_json(config_fn)
      .then(function(_config) {
        config = _config;
        _main_fix_config(config);
        config_json = JSON.stringify(config);
        return eval_config(config);
      })
      .catch(handle_error_checkpoint());
  })
  .then(function() {
    if(!config.__did_quick_setup) {
      window.location = 'quick-setup.html'; // goto quick-setup.html page
      return new Promise(function(){ }); // hang
    }
    return prepare_tree(config.tree || window.default_tree)
      .catch(handle_error_checkpoint())
      .then(function(info) {
        tree_fn = info.tree_fn;
        editor_helper.audio_save_dir = info.audio_dir;
      });
  })
  .then(function() {
    // load tree
    tree_element = document.querySelector('#tree')
    tree_wrp_element = document.querySelector('#tree-wrp')
    if(!tree_element || !tree_wrp_element)
      return Promise.reject(new Error("Cannot find #tree and/or #tree-wrp element"));
    locale = config.locale||default_locale;
    return Promise.all([
      initl10n(locale)
        .then(function() {
          domlocalize();
        })
        .catch(function(err) {
          console.warn(err);
        }),
      load_tree(tree_element, tree_fn)
        .catch(handle_error_checkpoint())
        .then(function(_tree) { tree = _tree; })
    ]);
  })
  .then(function() {
    // set tree font-size
    if(config.tree_content_size_percentage)
      _tree_set_contentsize(config.tree_content_size_percentage)
    // set theme class
    if(config.theme)
      document.body.classList.add('theme-' + config.theme);
  })
  .then(function() {
    // deal with on-screen navigation
    var elem = document.querySelector('#navbtns-wrp');
    if(elem && config._onscreen_navigation) {
      elem.classList.add('navbtns-enable');
    }
    navbtns_init();
    document.body.classList.remove('notready');
  })
  .then(start)
  .catch(function (err) {
    document.body.classList.remove('notready');
    handle_error(err);
  });

function _main_fix_config (cfg) {
  if (!cfg.keys) {
    cfg.keys = cfg.switch_keys || cfg.auto_keys || {};
    cfg.keys["66"] = { "func": "tree_go_in", "label": "b" }
  }
  if (cfg.helper_back_option === undefined && cfg.back_at_end) {
    cfg.helper_back_option = "end";
  }
}

window.addEventListener('unload', function() {
  if(speaku && speaku.is_native && speaku.synthesizer) {
    speaku.api.release_synthesizer(speaku.synthesizer);
  }
  if(state && state.edit_mode && tree) {
    editor_helper.on_restore(tree)
  }
}, false);

/* ios related */
document.addEventListener('touchmove', function(evt) {
  if(document.querySelector('html').classList.contains('ios')) {
    // prevent scrolling
    evt.preventDefault();
  }
}, false);

/* execution code start */

var _modes = ['auto', 'switch', 'wheel'],
    _all_delegates = {
      "tree_go_in": _tree_go_in, "tree_go_out": _tree_go_out,
      "tree_go_previous": _tree_go_previous, "tree_go_next": _tree_go_next,
    },
    _debug_keys = {
      '80': { func: function() { // P (toggle play)
        if(state._stopped) {
          state = renew_state(state)
          start(state);
        } else {
          stop();
        }
      } },
      '190': { func: function(ev) { // . dot (toggle debug mode)
        state.debug_mode = !state.debug_mode
        if(state.debug_mode) {
          document.body.classList.add('debug-mode')
        } else {
          document.body.classList.remove('debug-mode')
        }
      } }
    },
    _keys_for_rtl = {
      "39": "37", // ArrowRight => ArrowLeft
      "37": "39", // ArrowLeft => ArrowRight
      "68": "65", // D => A
      "65": "68", // A => D
    };


window.addEventListener('x-keycommand', function(ev) {
  if(!state || state._keyhit_off)
    return;
  if(!NativeAccessApi.keyCodeByInput.hasOwnProperty(ev.detail.input))
    return;
  var code = NativeAccessApi.keyCodeByInput[ev.detail.input];
  ev.charCode = code;
  // look for delegate calls
  var delegate = _debug_keys[code];
  if(delegate) {
    if(delegate.preventDefault === undefined ||
       delegate.preventDefault)
      ev.preventDefault();
    var ret = delegate.func(ev);
    if(ret && ret.catch)
      ret.catch(handle_error);
  }
}, false);
window.addEventListener('keydown', function(ev) {
  if(!state || state._keyhit_off)
    return;
  var code = ev.charCode || ev.keyCode;
  // look for delegate calls
  var delegate = _debug_keys[code];
  if(delegate) {
    if(delegate.preventDefault === undefined ||
       delegate.preventDefault)
      ev.preventDefault();
    var ret = delegate.func(ev);
    if(ret && ret.catch)
      ret.catch(handle_error);
  }
}, false);

function start(_state) {
  if(state && state._start_promise)
    return state._start_promise;
  // start if _state is given acts as continue
  // modes [auto,switch]
  // diff, auto iterates through nodes <-> switch iteration is manual
  // mode controls the work flow, start handles mode
  if(tree.nodes.length == 0)
    throw new Error("Tree has zero length");
  state = _state = _state || {
    can_move: true,
    mode: config.mode || 'auto',
    positions: [ {
      tree: tree,
      index: -1
    } ],
    config: config,
    _active_elements: [],
    _highlighted_elements: [],
    _auto_next_rem_loops: config.auto_next_loops || 0,
    _stop_callbacks: [],
    _wheel_delta: [ 0, 0 ],
  };
  if(_modes.indexOf(state.mode) == -1)
    throw new Error("Unknown mode " + state.mode);
  return state._start_promise = _start_prepare()
    .then(function() {
      if ("Click" in config._keyhit_delegates ||
          "RightClick" in config._keyhit_delegates) {
        tree_wrp_element.addEventListener('click', _tree_on_click, false);
      }
      document.addEventListener('x-keycommand', _on_xkeycommand, false);
      window.addEventListener('keydown', _on_keydown, false);
      window.addEventListener('resize', _tree_needs_resize, false);
      if (state.mode == 'wheel') {
        document.addEventListener('wheel', _on_wheel, false);
      }
      var tmp = document.querySelector('#navbtns')
      if(tmp && config._onscreen_navigation) {
        if(window.device && window.device.platform.toLowerCase() == 'ios') {
          tmp.addEventListener('touchstart', _on_navbtns_tstart, false);
        } else {
          tmp.addEventListener('click', _on_navbtns_click, false)
        }
      }
      if(config.can_edit) {
        document.querySelector('#edit-mode-btn')
          .addEventListener('click', _on_edit_mode, false);
        document.querySelector('#edit-mode-save-btn')
          .addEventListener('click', _on_edit_save, false);
        document.querySelector('#edit-mode-cancel-btn')
          .addEventListener('click', _on_edit_cancel, false);
      }
      _edit_mode_toggle(!!_state.edit_mode, false)
      // operation starts
      if(state.mode == 'auto') {
        _state.auto_next_start = auto_next
        _state.auto_next_dead = false
        auto_next();
      }
      return _before_changeposition()
        .then(function () {
          if(state.positions[state.positions.length - 1].index != -1)
            _tree_position_update();
          else
            _update_active_positions();
          delete state._start_promise;
        });
    });
  function auto_next() {
    if(_state._stopped)
      return; // stop the loop
    _state.auto_next_dead = false
    _state._active_timeout = setTimeout(function() {
      delete _state._active_timeout;
      var position = _get_current_position();
      if(position.index == -1 && config.auto_next_atfirst_delay) {
        // delay auto_next for next entry
        delayrun(config.auto_next_atfirst_delay)
      } else if(position.index + 1 == position.tree.nodes.length) {
        delayrun(config.auto_next_recycle_delay || 0)
      } else {
        run()
      }
    }, (is_first_run(_state) && !!config.auditory_cue_first_run_voice_options ?
        config.auto_next_first_run_delay : null) ||
          config.auto_next_delay || 500);
    function run() {
      if(_state._stopped)
        return; // stop the loop
      if(_state._running_move != null) {
        _state._running_move.then(auto_next);
      } else {
        var position = _get_current_position();
        if(position.index + 1 == position.tree.nodes.length) {
          // at re-cycle
          if(Math.abs(--_state._auto_next_rem_loops) < 1) {
            // stop the loop
            _state.auto_next_dead = true
            // start at begining next time
            var pos = _state.positions[_state.positions.length - 1];
            pos.index = -1;
            return;
          }
        }
        _tree_go_next()
          .then(auto_next)
          .catch(handle_error);
      }
    }
    function delayrun(delay) {
      function clearListener() {
        tree_element.removeEventListener("x-new-move", on_new_move, true);
      }
      function on_new_move() {
        clearListener();
        clearTimeout(_state._active_timeout);
        delete _state._active_timeout;
        var idx = _state._stop_callbacks.indexOf(clearListener)
        if(idx != -1)
          _state._stop_callbacks.splice(idx, 1);
        run();
      }
      tree_element.addEventListener("x-new-move", on_new_move, true);
      _state._stop_callbacks.push(clearListener)
      _state._active_timeout = setTimeout(function() {
        clearListener()
        delete _state._active_timeout;
        var idx = _state._stop_callbacks.indexOf(clearListener)
        if(idx != -1)
          _state._stop_callbacks.splice(idx, 1);
        run()
      }, delay);
    }
  }
}

function _napi_add_key_command() {
  if(napi.available) {
    var delegates = config._keyhit_delegates;
    var promises = [];
    for(var key in delegates) {
      if (delegates.hasOwnProperty(key)) {
        var input = NativeAccessApi.keyInputByCode[key];
        if(input) {
          promises.push(napi.add_key_command(input))
        }
      }
    }
    return Promise.all(promises);
    /*
    var keys = Object.keys(delegates);
    return next();
    function next() {
      var key = keys.shift();
      if (!key) {
        return Promise.resolve();
      }
      var input = NativeAccessApi.keyInputByCode[key];
      if (!input) {
        return next();
      }
      console.log("add_key_command", input);
      return napi.add_key_command(input)
        .then(next);
    }
    */
  } else {
    return Promise.resolve();
  }
}

function _napi_remove_key_command() {
  if(napi.available) {
    var delegates = config._keyhit_delegates;
    var promises = [];
    for(var key in delegates) {
      if (delegates.hasOwnProperty(key)) {
        var input = NativeAccessApi.keyInputByCode[key];
        if(input) {
          promises.push(napi.remove_key_command(input));
        }
      }
    }
    return Promise.all(promises);
    /*
    var keys = Object.keys(delegates);
    return next();
    function next() {
      var key = keys.shift();
      if (!key) {
        return Promise.resolve();
      }
      var input = NativeAccessApi.keyInputByCode[key];
      if (!input) {
        return next();
      }
      console.log("remove_key_command", input);
      return napi.remove_key_command(input)
        .then(next);
    }
    */
  } else {
    return Promise.resolve();
  }
}
function _start_prepare() {
  if(!state.edit_mode && config.helper_back_option) {
    var tree = state.positions[0].tree;
    var content_template,
        tmp = document.querySelector('#tree-node-template');
    if(tmp)
      content_template = _.template(tmp.innerHTML);
    _start_auto_insert_back(tree, content_template, config.helper_back_option);
  }
  return _napi_add_key_command();
}
function _stop_prepare() {
  if(!state.edit_mode && config.back_at_end) {
    var tree = state.positions[0].tree;
    _stop_auto_remove_back(tree);
  }
  return _napi_remove_key_command();
}

function _start_auto_insert_back(tree, content_template) {
  _.each(tree.nodes, function(anode) {
    if(!anode.is_leaf) {
      let insert_pos = null;
      if (config.helper_back_option == 'start') {
        insert_pos = 0;
      }
      anode._back_node = tree_add_node(anode, insert_pos, {
        _more_meta: {
          istmp: true
        },
        meta: {
          'back-n-branch': '1'
        },
        text: _t('Back')
      }, content_template);
      _start_auto_insert_back(anode, content_template);
    }
  });
}

function _stop_auto_remove_back(tree) {
  _.each(tree.nodes, function(anode) {
    if(anode._back_node) {
      tree_remove_node_from_parent(anode._back_node);
      delete anode._back_node;
    }
    if(!anode.is_leaf) {
      _stop_auto_remove_back(anode);
    }
  });
}

/**
 * Stops the current control-flow if exists, makes it ready for next start
 */
function stop() {
  if(!state)
    return Promise.reject(new Error("stop called when, not running!"));
  if(state._stop_promise)
    return state._stop_promise;
  return state._stop_promise = _stop_prepare()
    .then(function() {
      if ("Click" in config._keyhit_delegates ||
          "RightClick" in config._keyhit_delegates) {
        tree_wrp_element.removeEventListener('click', _tree_on_click, false);
      }
      if(state._next_keyup) {
        window.removeEventListener('keyup', state._next_keyup, false);
        state._next_keyup = null
      }
      document.removeEventListener('x-keycommand', _on_xkeycommand, false);
      window.removeEventListener('keydown', _on_keydown, false);
      window.removeEventListener('resize', _tree_needs_resize, false);
      if (state.mode == 'wheel') {
        if (state._wheel_timeout != null) {
          clearTimeout(state._wheel_timeout);
          state._wheel_timeout = null;
        }
        document.removeEventListener('wheel', _on_wheel, false);
      }
      var tmp = document.querySelector('#navbtns')
      if(tmp && config._onscreen_navigation) {
        if(window.device && window.device.platform.toLowerCase() == 'ios') {
          tmp.removeEventListener('touchstart', _on_navbtns_tstart, false);
        } else {
          tmp.removeEventListener('click', _on_navbtns_click, false);
        }
      }
      if(config.can_edit) {
        document.querySelector('#edit-mode-btn')
          .removeEventListener('click', _on_edit_mode, false);
        document.querySelector('#edit-mode-save-btn')
          .removeEventListener('click', _on_edit_save, false);
        document.querySelector('#edit-mode-cancel-btn')
          .removeEventListener('click', _on_edit_cancel, false);
      }
      _edit_mode_toggle(false)
      _before_new_move(); // stop speech and highlights
      if(state._active_timeout) {
        clearTimeout(state._active_timeout);
        delete state._active_timeout;
      }
      var callback;
      while((callback = state._stop_callbacks.shift()) != null)
        callback()
      state._stopped = true;
      delete state._stop_promise;
    });
}

function is_first_run(_state) {
  // check if the current cycle is the first one
  _state = _state || state
  return state._auto_next_rem_loops == config.auto_next_loops
}

function renew_state(_state) {
  _state = Object.assign({}, _state); // copy own props
  _state._auto_next_rem_loops = config.auto_next_loops || 0
  delete _state._stopped;
  return _state;
}

function _clean_state(_state) {
  _update_active_positions(_state, []);
}

function _on_navbtns_tstart(evt) {
  var call = null;
  if(evt.touches.length == 1) {
    var elem = evt.touches[0].target;
    switch(elem.id) {
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
  if(call) {
    evt.preventDefault();
    call();
  }
}

function _on_navbtns_click(ev) {
  var elem = ev.target;
  switch(elem.id) {
  case 'nav-upbtn':
    _tree_go_previous();
    break;
  case 'nav-downbtn':
    _tree_go_next();
    break;
  case 'nav-leftbtn':
    if(window.icu && icu.rtl) {
      _tree_go_in();
    } else {
      _tree_go_out();
    }
    break;
  case 'nav-rightbtn':
    if(window.icu && icu.rtl) {
      _tree_go_out();
    } else {
      _tree_go_in();
    }
    break;
  }
}

function _on_xkeycommand(evt) {
  if(!state || state._keyhit_off)
    return;
  var curtime = new Date().getTime()
  if(config.ignore_second_hits_time > 0 && state._last_keydown_time &&
     curtime - state._last_keydown_time < config.ignore_second_hits_time) {
    return; // ignore second hit
  }
  state._last_keydown_time = curtime
  // config.ignore_key_release_time is not applicable
  if(evt.detail && NativeAccessApi.keyCodeByInput.hasOwnProperty(evt.detail.input)) {
    evt.charCode = NativeAccessApi.keyCodeByInput[evt.detail.input];
    _on_keyhit(evt);
  }
}

function _tree_on_click (evt) {
  if (state.edit_mode) {
    return; // skip
  }
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
}

function _on_keydown(down_ev) {
  if(!state || state._keyhit_off)
    return;
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
    _on_keyhit(down_ev);
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
      _on_keyhit(down_ev)
    }
  }
  window.addEventListener('keyup', state._next_keyup, false);
}

function _on_wheel (evt) {
  if(!state || state._wheel_off)
    return;
  // clear wheel delta after 3s
  if (state._wheel_timeout != null) {
    clearTimeout(state._wheel_timeout);
  }
  state._wheel_timeout = setTimeout(function () {
    state._wheel_delta = [ 0, 0 ];
    state._wheel_timeout = null;
  }, 3000);
  state._wheel_delta = [ state._wheel_delta[0] + evt.deltaX,
                         state._wheel_delta[1] + evt.deltaY ];
  var x_threshold = config.wheel_x_threshold || 30;
  if (Math.abs(state._wheel_delta[0]) > x_threshold) {
    (state._wheel_delta[0] > 0 && !config.wheel_x_reverse ?
     _tree_go_in() : _tree_go_out())
      .catch(handle_error);
    state._wheel_delta = [ 0, 0 ];
  }
  var y_threshold = config.wheel_y_threshold || 30;
  if (Math.abs(state._wheel_delta[1]) > y_threshold) {
    var n = Math[state._wheel_delta[1] < 0 ? "ceil" : "floor"](state._wheel_delta[1] / y_threshold) * (config.wheel_y_reverse ? -1 : 1);
    _tree_go_n_steps(n)
      .catch(handle_error);
    state._wheel_delta = [ 0, 0 ];
  }
}

function _on_keyhit(ev) {
  if(!state || state._keyhit_off)
    return;
  var code = ev.charCode || ev.keyCode;
  /* DISABLED, flip of keys in rtl mode can be source for confusion.
  if(window.icu && icu.rtl && _keys_for_rtl.hasOwnProperty(code+'')) {
    code = _keys_for_rtl[code];
  }
  */
  // look for delegate calls
  var delegatemap = config._keyhit_delegates;
  var delegate = delegatemap[code+''];
  if(delegate) {
    if(delegate.preventDefault === undefined ||
       delegate.preventDefault)
      ev.preventDefault();
    var ret = delegate.func(ev);
    if(ret && ret.catch)
      ret.catch(handle_error);
  }
}

function _before_new_move() {
  return speaku.stop_speaking()
    .then(function () {
      var el;
      while((el = state._highlighted_elements.pop()))
        el.classList.remove('highlight' || config.highlight_class);
    });
}

function _new_move_start(moveobj) {
  return unboundPromise()
    .then(function (defer) {
      var promise = defer[0], resolve = defer[1], reject = defer[2];
      var running_move;
      _.each(moveobj.steps, function(astep) {
        promise = promise
          .then(function() {
            if(running_move == state._running_move)
              return astep(moveobj);
            // otherwise move has stopped....
          });
      });
      var prev_running_move = state._running_move
      running_move = state._running_move = promise
        .then(function() {
          if(running_move == state._running_move)
            state._running_move = null;
        });
      if(prev_running_move) {
        prev_running_move.then(resolve, reject)
      } else {
        resolve();
      }
      return promise;
    });
}

function _new_move_init(node) {
  return {
    steps: [],
    node: node
  };
}

function _add_on_next_update_active_positions (_state, callable) {
  _state = _state || state
  var list = _state.on_next_update_active_positions =
      _state.on_next_update_active_positions  || [];
  list.push(callable);
}

function _update_active_positions(_state, positions) {
  _state = _state || state
  positions = positions || _state.positions
  if (_state.on_next_update_active_positions) {
    _.each(_state.on_next_update_active_positions, function (f) { f(); });
    delete _state.on_next_update_active_positions;
  }
  var dom_elements = _.map(positions, function(pos) { return pos.tree.dom_element; });
  for(var i = 0; i < _state._active_elements.length; ) {
    var ael = _state._active_elements[i];
    ael.classList.remove('current');
    if(dom_elements.indexOf(ael) == -1) {
      ael.classList.remove('active');
      _state._active_elements.splice(i, 1);
      if(ael.classList.contains('no-transition'))
        ael.classList.remove('no-transition');
    } else {
      i++;
    }
  }
  for(var i = 0, len = dom_elements.length; i < len; ++i) {
    var ael = dom_elements[i];
    if(!ael.classList.contains('active')) {
      // new element
      ael.classList.add('no-transition');
      ael.classList.add('active');
      _state._active_elements.push(ael);
    } else {
      if(ael.classList.contains('no-transition'))
         ael.classList.remove('no-transition');
    }
    if(i + 1 == len && !ael.classList.contains('current')) {
      ael.classList.add('current');
    }
  }
  _update_active_positions_tree();
  if(_state._update_active_position_tree_timeout != null)
    clearTimeout(_state._update_active_position_tree_timeout);
  _state._update_active_position_tree_timeout = setTimeout(function() {
    _update_active_positions_tree();
    _state._update_active_position_tree_timeout = setTimeout(function() {
      _update_active_positions_tree();
      _state._update_active_position_tree_timeout = setTimeout(function() {
        delete _state._update_active_position_tree_timeout;
        _update_active_positions_tree();
      }, 200);
    }, 150);
  }, 150);
}

function _update_active_positions_tree() {
  // center all
  var widthSum = 0;
  var topSum = 0;
  for(var i = 0, len = state.positions.length; i < len; ++i) {
    var pos = state.positions[i],
        node = pos.index == -1 ?
               (pos.tree.nodes.length > 0 ?
                pos.tree.nodes[0] : null) : _get_current_node(pos),
        ul = pos.tree.nodes_ul_dom_element,
        el = node ? node.dom_element : null,
        height = el ? el.offsetHeight : 0,
        offY = el ? el.offsetTop : 0,
        pheight = tree_element.tree_height;
    var top = ((pheight / 2.0 - height / 2.0) - offY - topSum);
    if(ul)
      ul.style.top = top + 'px';
    topSum += top;
    widthSum += ul.offsetWidth
  }
  if(window.icu && window.icu.rtl) {
    if(widthSum - window.innerWidth > 0) {
      tree_element.style.right = (-widthSum + window.innerWidth) + "px";
    } else {
      tree_element.style.right = 0;
    }
  } else {
    if(widthSum - window.innerWidth > 0) {
      tree_element.style.left = (-widthSum + window.innerWidth) + "px";
    } else {
      tree_element.style.left = 0;
    }
  }
}

function _tree_needs_resize() {
  tree_element.tree_height = window.innerHeight;
  _update_active_positions_tree();
}

function _tree_set_contentsize(percentage) {
  if(!tree_element)
    return;
  var elms = document.querySelectorAll(".resizable-content");
  _.each(elms, function(elm) {
    elm.style.fontSize = percentage + '%';
    // re-set xscale
    var xscale = xscale_from_percentage_floor(percentage, tree_contentsize_xstep)
    for(var i = 0; i < elm.classList.length;) {
      var name = elm.classList.item(i);
      if(name.startsWith('contentsize-')) {
        elm.classList.remove(name)
      } else {
        i++;
      }
    }
    elm.classList.add('contentsize-'+xscale+'x')
  });
}

function _node_cue_text(node) {
  return node.meta['auditory-cue'] || node.text;
}

function _move_sub_highlight() {
  var node = this
  if(node.content_element) {
    node.content_element.classList.add('highlight' || config.highlight_class);
    state._highlighted_elements.push(node.content_element);
  }
  _update_active_positions();
}

function _move_sub_speak(text, voice_options) {
  if(state.silent_mode) {
    return Promise.resolve();
  }
  if(this.meta['audio']) {
    return speaku.play_audio(this.meta['audio'], voice_options)
      .catch(function (err) {
        console.error(err);
        return speaku.simple_speak(_t("Could not play the input audio"), voice_options);
      });
  } else {
    return speaku.simple_speak(text, voice_options);
  }
}

function _move_sub_speak2(type, override_msg) {
  if(state.silent_mode) {
    return Promise.resolve();
  }
  var opts, audio, text;
  switch(type) {
  case 'cue':
    opts = (config.mode == 'auto' && is_first_run() ? config.auditory_cue_first_run_voice_options : null) || config.auditory_cue_voice_options;
    audio = this.meta['cue-audio'] || this.meta['audio'];
    text = _node_cue_text(this);
    break;
  case 'main':
    opts = config.auditory_main_voice_options;
    audio = this.meta['main-audio'] || this.meta['audio'];
    text = this.text;
    break;
  }
  // check override voiceId
  var curlocale = this.meta[type + '-locale'] || this.meta['locale'] || locale;
  var tmp = _.filter(opts.locale_voices, function (a) { return a.locale == curlocale; });
  if (tmp.length == 0) {
    tmp = _.filter(opts.locale_voices, function (a) { return a.locale.split('-')[0] == curlocale.split('-')[0]; });
  }
  var vidname = (speaku.is_native ? '' : 'alt_') + 'voiceId';
  if (tmp.length > 0 && !!tmp[0][vidname]) {
    opts[vidname] = tmp[0][vidname];
  }
  if(typeof override_msg == 'string') {
    text = override_msg;
    audio = null;
  }
  if(audio) {
    return  speaku.play_audio(audio, opts)
      .catch(function (err) {
        console.error(err);
        return speaku.simple_speak(_t("Could not play the input audio"), opts);
      });
  } else if(text) {
    return speaku.simple_speak(text, opts);
  }
}

function _scan_move(node, opts) {
  opts = opts||{};
  node = node || _get_current_node();
  var moveobj = _new_move_init(node)
  var mincuetimeout = null;
  moveobj.steps.push(function () {
    if (config.minimum_cue_time > 0) {
      state.can_move = false;
      mincuetimeout = setTimeout(function () {
        state.can_move = true;
        mincuetimeout = null;
      }, config.minimum_cue_time);
    }
    return Promise.resolve();
  });
  if(opts.delay > 0) {
    moveobj.steps.push(function() {
      return new Promise(function(resolve) { setTimeout(resolve, opts.delay) })
    })
  }
  moveobj.steps.push(_move_sub_highlight.bind(node))
  moveobj.steps.push(_move_sub_speak2.bind(node, 'cue', opts.cue_override_msg))
  moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move", {
    detail: {
      node: node
    }
  }));
  return _before_new_move()
    .then(_new_move_start.bind(null, moveobj))
    .then(function () {
      state.can_move = true;
      if (mincuetimeout != null) {
        clearTimeout(mincuetimeout);
      }
      return Promise.resolve();
    });
}

function _notify_move(node, notifynode, opts) {
  if (_meta_true_check(notifynode.meta['no-main'], false)) {
    return _scan_move(node, opts);
  } else {
    return _do_notify_move(node, notifynode, opts);
  }
}

function _do_notify_move(node, notifynode, opts) {
  opts = opts||{};
  var moveobj = _new_move_init(node || notifynode)
  moveobj.steps.push(_move_sub_speak2.bind(notifynode, 'main', opts.main_override_msg))
  if(node) {
    moveobj.steps.push(_before_new_move)
    moveobj.steps.push(function() {
      moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move", {
        detail: {
          node: node
        }
      }));
    });
    moveobj.steps.push(_move_sub_highlight.bind(node))
  }
  if(opts.delay > 0) {
    moveobj.steps.push(function() {
      return new Promise(function(resolve) { setTimeout(resolve, opts.delay) })
    })
  }
  moveobj.steps.push(un_can_move)
  if(node) {
    moveobj.steps.push(_move_sub_speak2.bind(node, 'cue', opts.cue_override_msg))
  }
  speaku.stop_speaking();
  state.can_move = false;
  function un_can_move() {
    state.can_move = true;
  }
  return (!node ? speaku.stop_speaking(speaku) : Promise.resolve())
    .then(_new_move_start.bind(null, moveobj))
    .then(un_can_move);
}

function _get_current_position() {
  try {
    return state.positions[state.positions.length - 1];
  } catch(err) {
    throw new Error("Could not get current tree, " + state.positions.length);
  }
}

function _get_current_node(position) {
  try {
    position = position || _get_current_position();
    var node = position.tree.nodes[position.index];
    if(!node)
      throw new Error("Current node is null!, " +
                      state.positions.length + ", " +  position.index);
    return node;
  } catch(err) {
    throw new Error("Could not get current node, " + err);
  }
}

function _get_node_attr_inherits_full(positions, name) {
  for(var i = positions.length - 1; i >= 0; i--) {
    var pos = positions[i];
    if(pos.index != -1) {
      var node = pos.tree.nodes[pos.index],
          val = node.meta[name]
      if(val !== undefined && val != 'inherit') {
        return [ val, pos, node ];
      }
    }
  }
  // check root
  if (positions.length > 0) {
    var val = positions[0].tree.meta[name];
    if(val !== undefined && val != 'inherit') {
      return [ val, positions[0], positions[0].tree ];
    }
  }
  return null;
}

function _meta_as_int(v, default_val) {
  if(v == null)
    return default_val;
  var i = parseInt(v);
  if(isNaN(i))
    return default_val;
  return i;
}

function _meta_true_check(v, default_val) {
  if (v == null)
    return default_val;
  return v === 'true' || v === '';
}

function _on_override_go_in_or_out() {
  state._auto_next_rem_loops = config.auto_next_loops || 0
  if(state.mode == 'auto' && state.auto_next_dead) {
    var promise = _tree_go_next();
    state.auto_next_start();
    return promise;
  }
  return null;
}

var _tree_go_out_override_functions = [
  _on_override_go_in_or_out,
];

function _before_pop_position (n) {
  for (var i = 0, len = Math.min(n, state.positions.length); i < len; i++) {
    if(state.positions.length > i + 1) {
      var oldpos = state.positions[state.positions.length - 1 - i];
      if (_meta_true_check(oldpos.tree.meta['spell-branch'], false)) {
        var ppos = state.positions[state.positions.length - 2 - i];
        if (_meta_true_check(oldpos.tree.meta['spell-update-dyn-onchange'])) {
          if (oldpos.tree == state.positions[0].tree) {
            state._dyndirty = true;
          } else {
            ppos._dyndirty = true;
          }
        }
        delete ppos._concat_letters;
      }
    }
  }
}

function _tree_go_out() {
  if(!state.can_move)
    return Promise.resolve();
  // special case
  var res;
  for(var i = 0, len = _tree_go_out_override_functions.length; i < len; i++) {
    if((res = _tree_go_out_override_functions[i]()) != null)
      return res;
  }
  return _do_tree_go_out();
}

function _do_tree_go_out () {
  _before_pop_position();
  return _before_changeposition()
    .then(function () {
      if(state.positions.length > 1) {
        state.positions.pop();
      } else {
        // no more way, start at top (reset)
        state.positions[0].index = 0;
      }
      return _scan_move();
    }); 
}

function _in_check_spell_delchar(atree) {
  if(_meta_true_check(atree.meta['spell-delchar'])) {
    // concat and spell each letter
    var tmp = _get_node_attr_inherits_full(state.positions, 'spell-branch');
    if(tmp && tmp[1]._concat_letters) {
      var concat_letters = tmp[1]._concat_letters;
      if(!concat_letters)
        concat_letters = tmp[1]._concat_letters = []
      if(concat_letters.length > 0) {
        var letter;
        while((letter = concat_letters.pop()) == ' ')
          ;
        if (_meta_true_check(tmp[2].meta['spell-update-dyn-onchange'])) {
          if (tmp[2] == state.positions[0].tree) {
            state._dyndirty = true;
          } else {
            tmp[1]._dyndirty = true;
          }
        }
      }
      var msg, idx = concat_letters.lastIndexOf(' ');
      if(idx != -1) {
        msg = concat_letters.slice(0, idx).join('') + ' ' +
          concat_letters.slice(idx + 1).join(' ');
      } else {
        msg = concat_letters.join(' ');
      }
      return _do_notify_move(_get_current_node(), atree, {
        main_override_msg: msg
      });
    }
  }
}
function _in_spell_finish(atree) {
  // display continue-concat if any
  var popup = document.querySelector('#popup-message-wrp'),
      popup_mtext = popup ? popup.querySelector('.main-text') : null,
      tmp = _get_node_attr_inherits_full(state.positions, 'spell-branch');
  if(tmp && tmp[1]._concat_letters) {
    var msg = tmp[1]._concat_letters.join('');
    if(popup && popup_mtext) {
      popup_mtext.textContent = msg
      popup.classList.remove('hide');
      setTimeout(function() {
        popup.classList.add('visible');
      }, 10);
    }
    delete tmp[1]._concat_letters;
    return stop()
      .then(function() {
        if(atree.content_element)
          atree.content_element.classList.add('selected' || config.selected_class);
        // speak it
        return _move_sub_speak2.call(atree, 'main', msg)
          .then(function() {
            _start_at_next_action(atree)
          });
      });
  } else {
    return _do_notify_move(_get_current_node(), atree, {
      main_override_msg: _t("Nothing selected")
    });
  }
}
function _in_check_spell_default(atree) {
  // spell-finish can also contain spell-word/letter
  if (_meta_true_check(atree.meta['spell-finish']) &&
      (!atree.meta['spell-word'] || atree.meta['spell-letter'])) {
    return _in_spell_finish(atree);
  }
  // continue check
  var tmp = _get_node_attr_inherits_full(state.positions, 'spell-branch');
  if(tmp && _meta_true_check(tmp[0])) {
    var concat_letters = tmp[1]._concat_letters;
    if(!concat_letters)
      concat_letters = tmp[1]._concat_letters = []
    if (atree.meta['spell-word']) {
      // spell-word replaces existing letters until last word
      var last_word_idx = concat_letters.lastIndexOf(' ');
      if (last_word_idx == -1) {
        concat_letters.splice(0, concat_letters.length); // empty the list
      } else {
        concat_letters.splice(last_word_idx, concat_letters.length - last_word_idx, ' ');
      }
      concat_letters.push(atree.meta['spell-word']);
    } else {
      var letter = atree.meta['spell-letter'] || atree.text;
      concat_letters.push(letter)
    }
    if (_meta_true_check(atree.meta['spell-finish'])) {
      return _in_spell_finish(atree);
    }
    if (_meta_true_check(tmp[2].meta['spell-update-dyn-onchange'])) {
      if (tmp[2] == state.positions[0].tree) {
        state._dyndirty = true;
      } else {
        tmp[1]._dyndirty = true;
      }
    }
    // continue it
    return _before_changeposition()
      .then(function () {
        var tmp2 = _get_node_attr_inherits_full(state.positions, 'stay-in-branch') || tmp;
        var idx = state.positions.indexOf(tmp2[1]);
        state.positions = state.positions.slice(0, idx + 1);
        if(tmp2[2] != state.positions[0].tree) {
          state.positions.push({
            tree: tmp2[2],
            index: 0
          });
        } else {
          state.positions[0].index = 0;
        }
        var msg;
        {
          var idx = concat_letters.lastIndexOf(' ');
          if(idx != -1) {
            msg = concat_letters.slice(0, idx).join('') + ' ' +
              concat_letters.slice(idx + 1).join(' ');
          } else {
            msg = concat_letters.join(' ');
          }
        }
        return _do_notify_move(_get_current_node(), atree, {
          main_override_msg: msg
        });
      });
  }
}
function _in_check_back_n_branch(atree) {
  var i = _meta_as_int(atree.meta['back-n-branch'], null);
  if(i == null || !(i > 0))
    return;
  _before_pop_position(i);
  return _before_changeposition()
    .then(function () {
      if(state.positions.length <= i + 1) {
        i = state.positions.length - 1;
      }
      while(i-- > 0) {
        var last_pos = state.positions.pop();
      }
      if (atree.meta['back-n-branch-notify']) {
        return _do_notify_move(_get_current_node(), atree);
      } else {
        return _scan_move();
      }
    });
}

function _in_override_change_tree (atree) {
  var another_tree = atree.meta['change-tree'];
  if (another_tree) {
    return _in_override_change_tree_subrout(atree, another_tree);
  }
  var another_tree_name = atree.meta['change-tree-by-name'];
  if (another_tree_name) {
    return get_trees_info(default_trees_info_fn)
      .then(function (trees_info) {
        another_tree_name = another_tree_name.toLowerCase();
        var tree_info = _.find(trees_info.list, function (a) { return a.name.toLowerCase() == another_tree_name; });
        if (tree_info) {
          return _in_override_change_tree_subrout(atree, tree_info.tree_fn);
        } else {
          return _do_notify_move(_get_current_node(), atree, {
            main_override_msg: _t("Could not find tree with this name")
          });
        }
      });
  }
}

function _in_override_change_tree_subrout (atree, another_tree) {
  var current_tree = config.tree || window.default_tree;
  if (another_tree === current_tree) {
    return _do_notify_move(_get_current_node(), atree, {
      main_override_msg: _t("This tree is already running")
    });
  } else {
    return prepare_tree(another_tree)
      .then(function (info) {
        var telm = newEl('div');
        telm.setAttribute('class', tree_element.getAttribute('class'));
        var current_config_tree = config.tree;
        config.tree = info.tree_fn;
        return load_tree(telm, info.tree_fn)
          .catch(function (err) {
            config.tree = current_config_tree;
            throw err;
          })
          .catch(handle_error_checkpoint())
          .then(function(_tree) {
            var _config = JSON.parse(config_json);
            _config.tree = info.tree_fn;
            var _config_data = JSON.stringify(_config, null, "  ");
            // save config with new tree
            return set_file_data(config_fn, _config_data)
              .catch(handle_error_checkpoint())
              .then(function () {
                // stop current running tree
                stop()
                  .then(function () {
                    tree_fn = info.tree_fn;
                    editor_helper.audio_save_dir = info.audio_dir;
                    tree = _tree;
                    // start again with new tree
                    tree_element.id = 'old-tree';
                    telm.id = 'tree';
                    tree_element.parentNode.insertBefore(telm, tree_element);
                    tree_element.parentNode.removeChild(tree_element);
                    tree_element = telm;
                    _clean_state(state);
                    return start();
                  })
                  .catch(handle_error);
                return Promise.resolve();
              });
          });
      })
      .catch(function (err) {
        console.error(err);
        return _do_notify_move(_get_current_node(), atree, {
          main_override_msg: _t("Could not change to this tree")
        });
      });
  }
}

function _start_at_next_action(atree) {
  // start again, on demand
  function finish() {
    return _napi_remove_key_command()
      .then(function() {
        var popup = document.querySelector('#popup-message-wrp'),
            popup_mtext = popup ? popup.querySelector('.main-text') : null;
        if(popup && popup.classList.contains('visible')) {
          popup.classList.remove('visible');
          setTimeout(function() {
            if(popup_mtext)
              popup_mtext.textContent = "";
            popup.classList.add('hide');
          }, 500); // wait for hide transition 
        }
        _clean_state()
        // update tree dyn, before start again
        _tree_update_subdyn(tree);
        return start(); // start over
      });
  }
  function clear() {
    if(atree.content_element)
      atree.content_element.classList.remove('selected' || config.selected_class);
    tmp = document.querySelector('#navbtns')
    if(tmp && config._onscreen_navigation) {
      tmp.removeEventListener('click', onscreen_nav_click, false)
    }
    window.removeEventListener('keydown', onkeydown, false);
    document.removeEventListener('x-keycommand', onkeydown, false);
    if (state.mode == 'wheel') {
      document.removeEventListener('wheel', tmp_onwheel, false);
    }
  }
  function onscreen_nav_click() {
    clear()
    finish()
  }
  function onkeydown(ev) {
    ev.preventDefault();
    clear()
    finish()
  }
  let wheeldelta = [ 0, 0 ];
  function tmp_onwheel (evt) {
    wheeldelta = [ wheeldelta[0] + evt.deltaX,
                   wheeldelta[1] + evt.deltaY ];
    var x_threshold = config.wheel_x_threshold || 30
    var y_threshold = config.wheel_y_threshold || 30
    if (Math.abs(wheeldelta[0]) > x_threshold ||
        Math.abs(wheeldelta[1]) > x_threshold) {
      clear()
      finish()
    }
  }
  return _napi_add_key_command()
    .then(function() {
      tmp = document.querySelector('#navbtns')
      if(tmp && config._onscreen_navigation) {
        tmp.addEventListener('click', onscreen_nav_click, false)
      }
      window.addEventListener('keydown', onkeydown, false);
      document.addEventListener('x-keycommand', onkeydown, false); 
      if (state.mode == 'wheel') {
        document.addEventListener('wheel', tmp_onwheel, false);
      }
    });
}

function _before_changeposition () {
  var subdyn_tree;
  for (var i = 0, len = state.positions.length; i < len; i++) {
    var pos = state.positions[i];
    if (!subdyn_tree && pos._dyndirty) {
      if(pos.index != -1) {
        subdyn_tree = pos.tree.nodes[pos.index];
      } else { // special case, at root
        subdyn_tree = pos.tree;
      }
    }
    delete pos._dyndirty;
  }
  // check for dyndirty of root
  if (state._dyndirty) {
    subdyn_tree = state.positions[0].tree;
    delete state._dyndirty;
  }
  if (subdyn_tree) {
    return _tree_update_subdyn(subdyn_tree, {
      changing_position: true,
      disable_dyn: state.edit_mode
    });
  }
  return Promise.resolve();
}

function _in_check_stay_in_branch (atree) {
  var stayinbranch = _get_node_attr_inherits_full(state.positions, 'stay-in-branch');
  if (stayinbranch) {
    return _before_changeposition()
      .then(function () {
        var idx = state.positions.indexOf(stayinbranch[1]);
        state.positions = state.positions.slice(0, idx + 1);
        if(stayinbranch[2] != state.positions[0].tree) {
          state.positions.push({
            tree: stayinbranch[2],
            index: 0
          });
        } else {
          state.positions[0].index = 0;
        }
        return _notify_move(_get_current_node(), atree);
      });
  }
}

var _tree_select_override_functions = [
  _in_check_back_n_branch,
  _in_check_spell_delchar,
  _in_check_spell_default,
  _in_override_change_tree,
  _in_check_stay_in_branch,
];
function _tree_go_in() {
  if(!state.can_move)
    return Promise.resolve();
  var tmp;
  if((tmp = _on_override_go_in_or_out()) != null) {
    return tmp;
  }
  var position = _get_current_position();
  if(position.index == -1) // not started yet, do nothing
    return Promise.resolve();
  var atree = _get_current_node();
  if(atree.is_leaf) {
    // is leaf node, select

    // for edit_mode do nothing
    if(state.edit_mode)
      return Promise.resolve();

    // TODO:: This is an un-used feature, Remove it if there's no need for it in future
    // dyn-setdirty-relative-onselect requires the tree to update dynnodes
    // relative within the selected position on next update of position
    var tmp = _get_node_attr_inherits_full(state.positions, 'dyn-setdirty-onselect');
    if (tmp && _meta_true_check(tmp[0])) {
      var idx = state.positions.indexOf(tmp[1]);
      for (var i = idx; i >= 0; i--) {
        var pos = state.positions[i];
        if (i == 0) {
          state._dyndirty = true;
        } else {
          pos._dyndirty = true;
        }
        if (!_meta_true_check(pos.tree.meta['dyn-setdirty-onselect'], false)) {
          break;
        }
      }
    }
    
    // explicit finish check
    // special case
    var res;
    for(var i = 0, len = _tree_select_override_functions.length; i < len; i++) {
      if((res = _tree_select_override_functions[i](atree)) != null)
        return res;
    }
    // finish it
    // on auto mode stop iteration and on any key restart
    return stop()
      .then(function() {
        if(atree.content_element)
          atree.content_element.classList.add('selected' || config.selected_class);
        // speak it
        return (_meta_true_check(atree.meta['no-main'], false) ?
                Promise.resolve() : _move_sub_speak2.call(atree, 'main'))
          .then(function() {
            _start_at_next_action(atree)
          });
      });
  } else {
    if(atree.nodes.length == 0)
      return Promise.resolve(); // has no leaf, nothing to do
    return _before_changeposition()
      .then(function () {
        state.positions.push({
          tree: atree,
          index: 0
        });
        var delay = state.mode == 'auto' ? config.auto_next_atfirst_delay || 0 : 0;
        return _notify_move(_get_current_node(), atree, { delay: delay });
      });
  }
}
function _tree_move(node) {
  if(!state.can_move)
    return Promise.resolve();
  return _before_changeposition()
    .then(function () {
      var positions = [],
          tmp0 = node,
          tmp = node.parent;
      while(tmp != null) {
        var idx = tmp.nodes.indexOf(tmp0)
        if(idx == -1)
          throw new Error("Corrupt tree!");
        positions.unshift({
          tree: tmp,
          index: idx
        })
        tmp0 = tmp
        tmp = tmp.parent
      }
      if(positions.length == 0)
        throw new Error("the node should belong to a tree");
      state.positions = positions
      return _scan_move()
    });
}
function _tree_position_update() {
  return _scan_move()
}
function _tree_go_previous() {
  if(!state.can_move)
    return Promise.resolve();
  var position = _get_current_position();
  position.index -= 1;
  if(position.index < 0) {
    /*
    position.index = (position.tree.nodes.length + position.index) %
      position.tree.nodes.length;
    */
    if(position.tree.nodes.length == 0)
      return Promise.resolve();
    position.index = position.tree.nodes.length - 1;
  }
  return _scan_move()
}
function _tree_go_next() {
  if(!state.can_move)
    return Promise.resolve();
  var position = _get_current_position();
  position.index += 1;
  if(position.index >= position.tree.nodes.length) {
    position.index = position.index % position.tree.nodes.length;
  }
  return _scan_move()
}
function _tree_go_n_steps (n) {
  if(!state.can_move)
    return Promise.resolve();
  var position = _get_current_position();
  position.index += n;
  if(position.index >= position.tree.nodes.length) {
    position.index = position.index % position.tree.nodes.length;
  } else if (position.index < 0) {
    position.index = Math.ceil(Math.abs(position.index) / position.tree.nodes.length) * position.tree.nodes.length + position.index;
  }
  return _scan_move()
}

/* execution code end */


function eval_config(config) {
  function keys_from_config(mode, _default) {
    return typeof config[mode + '_keys'] == 'object' ?
      _.mapObject(config[mode + '_keys'], function(val, key) {
        if(val.func in _all_delegates) {
          val.func = _all_delegates[val.func]
        } else {
          throw new Error("key has no func!, " + JSON.stringify(val))
        }
        return val;
      }) : _default;
  }
  var default_keys = {
    "39": { func: _tree_go_in }, // ArrowRight
    "37": { func: _tree_go_out }, // ArrowLeft
    "38": { func: _tree_go_previous }, // ArrowUp
    "40": { func: _tree_go_next }, // ArrowDown
    "87": { func: _tree_go_previous }, // W
    "68": { func: _tree_go_in }, // D
    "83": { func: _tree_go_next }, // S
    "65": { func: _tree_go_out }, // A
    "66": { func: _tree_go_in }, // B
  };
  config._keyhit_delegates = config.keys ?
    _.mapObject(config.keys, function(val, key) {
      if(val.func in _all_delegates) {
        val.func = _all_delegates[val.func]
      } else {
        throw new Error("key has no func!, " + JSON.stringify(val))
      }
      return val;
    }) : default_keys;
  /* No longer is needed
  // Hossein's quick fix..
    if (!("66" in config._keyhit_delegates))
    config._keyhit_delegates["66"] = { func: _tree_go_in };
  */
  config._onscreen_navigation = config.onscreen_navigation == 'enable';
  // add styles
  var styles = Array.isArray(config.style) ? config.style :
      (config.style ? [ config.style ] : []),
      style_vars = {
        "__PLATFORM__": window.device ?
          window.device.platform.toLowerCase() : "default"
      };
  config._styles = [];
  for(var i = 0, len = styles.length; i < len; ++i) {
    var el = newEl("link"),
        href = styles[i];
    for(var key in style_vars)
      href = href.replace(key, style_vars[key]);
    el.setAttribute("rel", "stylesheet");
    el.setAttribute("href", href);
    document.body.appendChild(el);
    config._styles.push(el);
  }
  if(!('can_edit' in config))
    config.can_edit = true;
  return config;
}

var _tree_dynamic_nodes_module_map = {
  'trees-switcher': {
    render: _trees_switcher_dynamic_nodes,
  },
  'spell-word-prediction': {
    render: _word_prediction_dynamic_nodes,
  },
  'spell-letter-prediction': {
    render: _letter_prediction_dynamic_nodes,
  },
};

function words_cmp (a, b) {
  if(a.v < b.v) {
    return -1
  }
  if(a.v > b.v) {
    return 1
  }
  return 0
}

function mk_words_weight_cmp (asc) {
  var mul = asc ? 1 : -1;
  return function (a, b) {
    return mul * (a.w - b.w);
  }
}

function get_words (url) {
  if (words_cache[url]) {
    return words_cache[url];
  }
  return words_cache[url] = get_file_json(url)
    .then(function (data) {
      var words = data.words;
      // verify words is sorted
      var notsorted = false;
      for (var i = 0; i + 1 < words.length; i++) {
        var w0 = words[i].v, w1 = words[i+1].v;
        if (words_cmp(w0, w1) > 0) {
          notsorted = true;
          break;
        }
      }
      // if not, sort it
      if (!notsorted) {
        words.sort(words_cmp);
      }
      return data;
    })
    .catch(function (err) {
      delete words_cache[url];
      throw err;
    });
}

function _get_current_spell_txt () {
  var txt = '';
  if (state && !state._stopped) {
    // _get_node_attr_inherits_full has not used, since this function
    // has called at the time of updating dyn.
    var tmp = _.filter(state.positions, function (a) { return !!a._concat_letters; });
    if(tmp.length > 0) {
      tmp = tmp[tmp.length-1]._concat_letters.join('').split(' ');
      txt = tmp[tmp.length-1];
    }
  }
  return txt;
}
var _prediction_spell_words_max_memory = 20;
function _get_prediction_spell_words (words_file, txt) {
  return get_words(words_file)
    .then(function (wdata) {
      wdata._cache = wdata._cache || {};
      wdata._memory_stack = wdata._memory_stack || [];
      if (wdata._cache[txt]) {
        return wdata._cache[txt];
      }
      if (!txt) { // empty, simple solution would empty output
        return { words: [] };
      }
      while (wdata._memory_stack.length >= _prediction_spell_words_max_memory) {
        var tmp = wdata._memory_stack.shift();
        delete wdata._cache[tmp];
      }
      var txtlen = txt.length;
      function _cmp (a) {
        var tmp = a.v.substr(0, txtlen)
        if(tmp < txt) {
          return -1;
        }
        if(tmp > txt) {
          return 1;
        }
        return 0;
      }
      wdata._memory_stack.push(txt);
      // for SortedArrayFuncs lt/gt target is known to _cmp, thus null given as target
      var words = wdata.words,
          oneidx = SortedArrayFuncs.eq(words, null, _cmp);
      if (oneidx == -1) {
        return wdata._cache[txt] = { words: [] }; // no result
      }
      var sidx = oneidx, eidx = oneidx;
      // expand to edges
      while (sidx > 0 && _cmp(words[sidx-1]) == 0) {
        sidx--;
      }
      while (eidx > 0 && _cmp(words[eidx+1]) == 0) {
        eidx++;
      }
      var subwords = words.slice(sidx, eidx + 1),
          subwdata = { words: subwords };
      return wdata._cache[txt] = subwdata;
    });
}

function _word_prediction_dynamic_nodes (anode) {
  var words_file = anode.meta['words-file'] || config.words_file;
  if (!words_file) {
    throw new Error("No words file given for dyn=\"spell-word-prediction\"");
  }
  var txt = _get_current_spell_txt(),
      max_nodes = anode.meta['max-nodes'] || 3;
  return _get_prediction_spell_words(words_file, txt)
    .then(function (subwdata) {
      if (!subwdata.words_sorted) {
        subwdata.words_sorted = [].concat(subwdata.words);
        subwdata.words_sorted.sort(mk_words_weight_cmp(false));
      }
      return {
        nodes: _.map(subwdata.words_sorted.slice(0, max_nodes), function(word) {
          return {
            text: word.v,
            meta: {
              'spell-word': word.v,
              'spell-finish': anode.meta['spell-finish'],
            }
          };
        }),
      };
    });
}

function _letter_prediction_dynamic_nodes (anode) {
  var words_file = anode.meta['words-file'] || config.words_file;
  if (!words_file) {
    throw new Error("No words file given for dyn=\"spell-word-prediction\"");
  }
  var alphabet = anode.meta['alphabet'] || config.alphabet ||
                 'abcdefghijklmnopqrstuvwxyz', 
      txt = _get_current_spell_txt();
  if (typeof alphabet == 'string') {
    if (alphabet.indexOf(',') != -1) {
      alphabet = alphabet.split(',');
    } else {
      alphabet.split('');
    }
  }
  return _get_prediction_spell_words(words_file, txt)
    .then(function (subwdata) {
      if (!subwdata.alphabet_sorted) {
        subwdata.alphabet_sorted = _.map(_.range(alphabet.length), function(i) {
          var a = alphabet[i];
          return [ a, i, _.reduce(
            _.map(
              _.filter(subwdata.words, function(w){return w.v[txt.length]==a;}),
              function (a) { return a.w; }
            ),
            function (a, b) { return a + b; }, 0) ];
        }).sort(function (a, b) { // sort desc order by weight, letter
          if (a[2] == b[2]) {
            if(a[1] < b[1]) {
              return -1;
            }
            if(a[1] > b[1]) {
              return 1;
            }
            return 0;
          }
          return b[2] - a[2];
        });
      }
      return {
        nodes: _.map(subwdata.alphabet_sorted, function(v) {
          return { text: v[0] };
        }),
      };
    });
}

function load_tree(tree_element, fn) {
  if(typeof fn != 'string') {
    tree = fn;
    tree_element.innerText = "No tree given in config";
    return Promise.resolve();
  }
  return get_file_data(fn)
    .then(function(data) {
      var tree = _parse_tree_subrout(tree_element, data);
      return _tree_dynupdate(tree)
        .then(function () {
          // rest of parse_tree
          var content_template,
              tmp = document.querySelector('#tree-node-template');
          if(tmp)
            content_template = _.template(tmp.innerHTML);
          tree_element.innerHTML = ''; // clear all
          tree_mk_list_base(tree, tree_element, content_template); // re-create
          tree_element.tree_height = window.innerHeight;
          return tree;
        });
    });
}

function _tree_dynupdate (atree) {
  return tree_traverse_nodes_async(atree, function (node, i, nodes) {
    var dyn_name = node.meta.dyn;
    if (dyn_name) {
      var module = _tree_dynamic_nodes_module_map[dyn_name];
      if (module) {
        return module.render(node)
          .then(function (res) {
            _.each(res.nodes, function (cnode) {
              tree_setup_node(cnode, node.parent);
              cnode._more_meta._isdynnode = true;
              cnode._more_meta._dynnode = node;
              nodes.splice(i++, 0, cnode);
            });
            // delete node.parent;
            nodes.splice(i, 1);
            return i;
          });
      }
    }
  });
}

function _tree_update_subdyn (atree, options) {
  options = options || {}
  function undyn (atree) {
    if (!atree.is_leaf) {
      atree.nodes = [].concat(atree.static_nodes);
      _.each(atree.nodes, undyn);
    }
  }
  undyn(atree);
  return (options.disable_dyn ? Promise.resolve() : _tree_dynupdate(atree))
    .then(function () {
      var content_template,
          tmp = document.querySelector('#tree-node-template');
      if(tmp)
        content_template = _.template(tmp.innerHTML);
      if (tree_element == atree.dom_element) {
        tree_element.innerHTML = ''; // clear all
        tree_mk_list_base(atree, tree_element, content_template); // re-create
        tree_element.tree_height = window.innerHeight;
        finish();
        return;
      }
      var elm = newEl('li'),
          atree_dom_element = atree.dom_element,
          parentNode = atree_dom_element.parentNode;
      tree_mk_list_base(atree, elm, content_template); // re-create
      if (options.changing_position) {
        _add_on_next_update_active_positions(state, finish);
      } else {
        finish();
      }
      function finish () {
        if (parentNode) {
          parentNode.insertBefore(elm, atree_dom_element);
          parentNode.removeChild(atree_dom_element);
        }
      }
    });
}

function _clone_tree(tree) {
  var new_tree = {};
  for(var k in tree)
    if(tree.hasOwnProperty(k))
      new_tree[k] = tree[k];
  if(tree.nodes) {
    new_tree.nodes = _.map(tree.nodes, function(anode) {
      var new_node = _clone_tree(anode)
      new_node.parent = new_tree
      return new_node
    });
  }
  return new_tree;
}
function _state_redefine_positions(positions, new_tree) {
  // new_tree should be clone of target tree
  var new_positions = [];
  _.each(positions, function(position) {
    new_positions.push({
      tree: new_tree,
      index: position.index
    });
    new_tree = new_tree.nodes[position.index];
  });
  return new_positions;
}

function clear_config(config) {
  // remove previous config
  if(config) {
    for(var i = 0, len = config._styles.length; i < len; ++i) {
      document.body.removeChild(config._styles[i]);
    }
  }
}

// percentage to x-scale for class name
function xscale_from_percentage_floor(percentage, step, decres) {
  decres = decres == undefined ? 1 : decres
  var v = Math.floor(percentage / step) * step / 100.0;
  if(decres > 0) {
    return v.toFixed(decres || 1).replace(/0+$/, "")
      .replace(/\.$/, "").replace('.', '_')
  } else {
    return v+'';
  }
}

function _trees_switcher_dynamic_nodes(anode) {
  var current_tree = config.tree || window.default_tree;
  return get_trees_info(default_trees_info_fn)
    .then(function (trees_info) {
      return {
        nodes: _.filter(
          _.map(trees_info.list, function (item) {
            if (item.tree_fn == current_tree)
              return null;
            return {
              text: item.name,
              meta: {
                'change-tree': item.tree_fn
              },
            };
          }),
          function (v) { return !!v; } // remove null node
        ),              
      };
    });
}
