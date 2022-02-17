var config_fn, tree_fn, config, tree, tree_data, state = null, tree_element,
    napi, speaku, tree_wrp_element,
    config_json, words_cache = {}, tree_contentsize_xstep = 50, locale;

/* Initiation chain
 * 1. wait for dom and NativeAccessApi
 * 2. initialize_app (from core.js)
 * 3. os specific initiation
 * 4. Instantiate NativeAccessApi and SpeakUnit (from NativeAccessApi.js and core.js)
 * 5. some code for debugging
 * 6. load config/tree and other random initiations
 * 7. start the app
 */
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
    // ios specific
    var html = document.querySelector('html');
    if (html.classList.contains('ios')) {
      html.classList.add('with-fake-scroll');
    }

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

    // add debug keys in key_command watch
    if(napi.available) {
      return Promise.all([
        napi.add_key_command("p"),
        napi.add_key_command("."),
      ])
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
      window.location = 'intro.html'; // goto quick-setup.html page
      return new Promise(function(){ }); // hang
    }
    tree_fn = config.tree ? get_file_url(config.tree, config_fn) : window.default_tree
    return prepare_tree(tree_fn)
      .catch(handle_error_checkpoint())
      .then(function(info) {
        editor_helper.tree_url = tree_fn;
        editor_helper.audio_save_dirname = info.audio_dirname;
      });
  })
  .then(function() {
    // parallel init localization & load tree
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
      get_file_data(tree_fn)
        .catch(handle_error_checkpoint())
        .then(function(data) { tree_data = data; })
    ]);
  })
  .then(function() {
    // set tree font-size
    if(config.tree_content_size_percentage)
      _tree_set_contentsize(config.tree_content_size_percentage)
    // set theme class
    if(config.theme)
      document.body.classList.add('theme-' + config.theme);
    // message bar close handler
    _.each(document.querySelectorAll('#message-bar-close-btn'), function (btn) {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        event.preventDefault();
        var wrp = document.querySelector('#message-bar-wrp');
        if (wrp) {
          wrp.classList.add('hide');
        }
      });
    });
    // set message bar custom height
    if (config.message_bar_have_custom_height &&
        config.message_bar_height > 0 && config.message_bar_height <= 100) {
      var html = document.querySelector('html')
      var topbar_offset = 50 + (html.classList.contains('ios') ? 30 : 0)
      var msgbar_wrp = document.querySelector('#message-bar-wrp')
      if (msgbar_wrp) {
        msgbar_wrp.style.height = 'calc(' + config.message_bar_height + 'vh - ' + topbar_offset + 'px)';
      }
    }
    // set message bar font size
    if (config.message_bar_font_size_percentage > 0) {
      var msgbar_wrp = document.querySelector('#message-bar-wrp')
      if (msgbar_wrp) {
        msgbar_wrp.style.fontSize = config.message_bar_font_size_percentage + '%';
      }
    }
  })
  .then(function() {
    // init on-screen navigation
    navbtns_init();
    document.body.classList.remove('notready');
  })
  .then(start)
  .catch(function (err) {
    document.body.classList.remove('notready');
    handle_error(err);
  });

// required fixes for making old config files compatible
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
  var html = document.querySelector('html');
  if(html.classList.contains('ios') && !html.classList.contains('has-fake-scroll')) {
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
  // positions are no longer saved between start/stop
  state = _state = _state || {
    can_move: true,
    mode: config.mode || 'auto',
    select_path: [],
    config: config,
    _active_elements: [],
    _highlighted_elements: [],
    _auto_next_rem_loops: config.auto_next_loops || 0,
    _stop_callbacks: [],
    _wheel_delta: [ 0, 0 ],
    _paused: false,
  };
  if(_modes.indexOf(state.mode) == -1)
    throw new Error("Unknown mode " + state.mode);
  return state._start_promise = _start_prepare()
    .then(function() {
      if(tree.nodes.length == 0)
        throw new Error('Tree has zero length');
      if ('Click' in config._keyhit_delegates ||
          'RightClick' in config._keyhit_delegates) {
        tree_wrp_element.addEventListener('click', _tree_on_click, false);
      }
      // add mode as a class to html
      document.addEventListener('x-keycommand', _on_xkeycommand, false);
      window.addEventListener('keydown', _on_keydown, false);
      window.addEventListener('resize', _tree_needs_resize, false);
      if (state.mode == 'wheel') {
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
      var navbtns_wrp = document.querySelector('#navbtns-wrp');
      var navbtns = document.querySelector('#navbtns')
      if(navbtns && (config._onscreen_navigation || _state.edit_mode)) {
        _state._navbtns_enabled = true
        if(navbtns_wrp) {
          navbtns_wrp.classList.add('navbtns-enable');
        }
        if(window.device && window.device.platform.toLowerCase() == 'ios') {
          navbtns.addEventListener('touchstart', _on_navbtns_tstart, false);
        } else {
          navbtns.addEventListener('click', _on_navbtns_click, false)
        }
      } else if(navbtns_wrp) {
        navbtns_wrp.classList.remove('navbtns-enable');
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
      return _before_changeposition()
        .then(function () {
          if(state.positions[state.positions.length - 1].index != -1)
            _scan_move()
          else
            _update_active_positions();
          _on_update_select_path();
          // operation starts
          if(state.mode == 'auto') {
            _state.auto_next_start = auto_next
            _state.auto_next_dead = false
            auto_next();
          }
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
      if(_state._stopped || _state._paused)
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
        tree_element.removeEventListener('x-new-move', on_new_move, true);
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
      tree_element.addEventListener('x-new-move', on_new_move, true);
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

function pause () {
  if (!state || state._stopped) {
    throw new Error('state is not initialized!');
  }
  state._paused = true;
  if (state._active_timeout != null) {
    clearTimeout(state._active_timeout);
    state._active_timeout = null;
  }
  return Promise.resolve();
}

function resume () {
  if (!state || state._stopped) {
    throw new Error('state is not initialized!');
  }
  state._paused = false;
  return _before_changeposition()
    .then(function () {
      if(state.positions[state.positions.length - 1].index != -1)
        _scan_move();
      else
        _update_active_positions();
      _on_update_select_path();
      if(state.mode == 'auto' && state._active_timeout == null) {
        state.auto_next_start();
      }
    });
}

function reset_state () {
  Object.assign(state, {
    can_move: true,
    mode: config.mode || 'auto',
    positions: [ {
      tree: tree,
      index: -1
    } ],
    select_path: [],
    _active_elements: [],
    _highlighted_elements: [],
    _auto_next_rem_loops: config.auto_next_loops || 0,
    _stop_callbacks: [],
    _wheel_delta: [ 0, 0 ],
    _paused: false,
    auto_next_dead: false,
  })
}

function main_keyboard_turn_off () {
  if(config._theinput_enabled) {
    keyevents_handle_theinput_off();
  }
  state._keyhit_off = true;
  _napi_remove_key_command();
}

function main_keyboard_turn_on () {
  if(config._theinput_enabled) {
    keyevents_handle_theinput();
  }
  state._keyhit_off = false;
  _napi_add_key_command();
}

function _napi_add_key_command() {
  if(napi.available) {
    var delegates = config._keyhit_delegates;
    var promises = [];
    napi._added_key_commands = napi._added_key_commands || {};
    for(var key in delegates) {
      if (delegates.hasOwnProperty(key)) {
        var input = NativeAccessApi.keyInputByCode[key];
        if(input && !napi._added_key_commands[input]) {
          napi._added_key_commands[input] = true;
          promises.push(napi.add_key_command(input, '', {
            repeatable: !!config.ios_keycommand_repeatable,
          }))
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
      console.log('add_key_command', input);
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
    napi._added_key_commands = napi._added_key_commands || {};
    for(var key in delegates) {
      if (delegates.hasOwnProperty(key)) {
        var input = NativeAccessApi.keyInputByCode[key];
        if(input && napi._added_key_commands[input]) {
          delete napi._added_key_commands[input];
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
      console.log('remove_key_command', input);
      return napi.remove_key_command(input)
        .then(next);
    }
    */
  } else {
    return Promise.resolve();
  }
}
function _start_prepare() {
  return install_tree(tree_element, tree_data, config, state)
    .then(function (_tree) {
      tree = _tree;
      return _napi_add_key_command();
    });
}
function _stop_prepare() {
  return _napi_remove_key_command();
}


/**
 * Stops the current control-flow if exists, makes it ready for next start
 */
function stop() {
  if(!state)
    return Promise.reject(new Error('stop called when, not running!'));
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
        var html = document.querySelector('html');
        if (html.classList.contains('with-fake-scroll')) {
          html.classList.remove('has-fake-scroll');
          window.scrollTo(0, 0);
          document.removeEventListener('scroll', _on_scroll, false);
        } else {
          document.removeEventListener('wheel', _on_wheel, false);
        }
      }
      var navbtns = document.querySelector('#navbtns')
      if(navbtns && state._navbtns_enabled) {
        state._navbtns_enabled = false
        if(window.device && window.device.platform.toLowerCase() == 'ios') {
          navbtns.removeEventListener('touchstart', _on_navbtns_tstart, false);
        } else {
          navbtns.removeEventListener('click', _on_navbtns_click, false);
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
  if (!state || state._paused) {
    return
  }
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
  if (!state || state._paused) {
    return
  }
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
  if(!state || state._keyhit_off || state._paused)
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
  if (!state || state.edit_mode || state._paused) {
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
  if(!state || state._keyhit_off || state._paused)
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

function _on_scroll (evt) {
  if(!state || state._wheel_off || state._paused)
    return;
  var deltaX = window.scrollX - window._last_scroll_x,
      deltaY = window.scrollY - window._last_scroll_y;
  _on_wheel_subrout(deltaX, deltaY);
  // lock-the scroll
  var scrollX = window.scrollX > 110 || window.scrollX < 10 ? 60 : window.scrollX,
      scrollY = window.scrollY > 110 || window.scrollY < 10 ? 60 : window.scrollY;
  state._wheel_off = true;
  window.scrollTo(scrollX, scrollY);
  if (scrollX != window.scrollX) {
    window.scrollX = scrollX;
  }
  if (scrollY != window.scrollY) {
    window.scrollY = scrollY;
  }
  window._last_scroll_x = scrollX;
  window._last_scroll_y = scrollY;
  setTimeout(function () {
    state._wheel_off = false;
  }, 10);
}

function _on_wheel (evt) {
  if(!state || state._wheel_off || state._paused)
    return;
  _on_wheel_subrout(evt.deltaX, evt.deltaY);
}

function _on_wheel_subrout (deltaX, deltaY) {
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

function _before_new_move() { // called before every move
  return speaku.stop_speaking();
}

// queue and process system for every move
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
      function onend () {
        if(running_move == state._running_move) {
          state._running_move = null;
        }
      }
      var prev_running_move = state._running_move
      running_move = state._running_move = promise
        .then(onend, function (err) { onend(); throw err; });
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

function _update_active_positions (avoidloop) {
  if (state.on_next_update_active_positions) {
    _.each(state.on_next_update_active_positions, function (f) { f(); });
    delete state.on_next_update_active_positions;
  }
  var dom_elements = _.map(state.positions, function(pos) { return pos.tree.dom_element; });
  for (var i = 0; i < state._active_elements.length; ) {
    var ael = state._active_elements[i];
    ael.classList.remove('current');
    if (dom_elements.indexOf(ael) == -1) {
      ael.classList.remove('active');
      state._active_elements.splice(i, 1);
      if(ael.classList.contains('no-transition'))
        ael.classList.remove('no-transition');
    } else {
      i++;
    }
  }
  for (var i = 0, len = dom_elements.length; i < len; ++i) {
    var ael = dom_elements[i];
    if (!ael.classList.contains('active')) {
      // new element
      ael.classList.add('no-transition');
      ael.classList.add('active');
      state._active_elements.push(ael);
    } else {
      if(ael.classList.contains('no-transition'))
         ael.classList.remove('no-transition');
    }
    if(i + 1 == len && !ael.classList.contains('current')) {
      ael.classList.add('current');
    }
  }
  // update highlight postition
  var el;
  while ((el = state._highlighted_elements.pop()))
    el.classList.remove('highlight' || config.highlight_class);
  if (state.positions.length > 0) {
    var curpos = state.positions[state.positions.length - 1]
    if (curpos.tree.nodes[curpos.index]) {
      var node = curpos.tree.nodes[curpos.index]
      if (node && node.content_element) {
        node.content_element.classList.add('highlight' || config.highlight_class);
        state._highlighted_elements.push(node.content_element);
      }
    }
  }
  _update_active_positions_tree();
  if (!avoidloop) {
    if(state._update_active_position_tree_timeout != null)
      clearTimeout(state._update_active_position_tree_timeout);
    state._update_active_position_tree_timeout = setTimeout(function() {
      _update_active_positions(true);
      state._update_active_position_tree_timeout = setTimeout(function() {
        _update_active_positions(true);
        state._update_active_position_tree_timeout = setTimeout(function() {
          delete state._update_active_position_tree_timeout;
          _update_active_positions(true);
        }, 200);
      }, 150);
    }, 150);
  }
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
        pheight = tree_element.offsetHeight;
    var top = ((pheight / 2.0 - height / 2.0) - offY - topSum);
    if(ul)
      ul.style.top = top + 'px';
    topSum += top;
    widthSum += ul.offsetWidth
  }
  if(window.icu && window.icu.rtl) {
    tree_element.style.marginLeft = '';
    if(widthSum - window.innerWidth > 0) {
      tree_element.style.marginRight = (-widthSum + window.innerWidth) + 'px';
    } else {
      tree_element.style.marginRight = '0px';
    }
  } else {
    tree_element.style.marginRight = '';
    if(widthSum - window.innerWidth > 0) {
      tree_element.style.marginLeft = (-widthSum + window.innerWidth) + 'px';
    } else {
      tree_element.style.marginLeft = '0px';
    }
  }
}

var _needs_resize_timeout = null;
var _needs_resize_delay = 500;
function _tree_needs_resize() {
  if (_needs_resize_timeout != null) {
    clearTimeout(_needs_resize_timeout);
  }
  _needs_resize_timeout = setTimeout(function () {
    _needs_resize_timeout = null;
    _update_active_positions();
  }, _needs_resize_delay);
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
function _node_main_text (node) {
  return node.meta['auditory-main'] || node.text;
}

function _move_sub_speak(type, override_msg) {
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
    text = _node_main_text(this);
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
    return speaku.play_audio(get_file_url(audio, tree_fn), opts)
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
  moveobj.steps.push(function () { _update_active_positions(); })
  moveobj.steps.push(_move_sub_speak.bind(node, 'cue', opts.cue_override_msg))
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
  moveobj.steps.push(_move_sub_speak.bind(notifynode, 'main', opts.main_override_msg))
  if(node) {
    moveobj.steps.push(_before_new_move)
    moveobj.steps.push(function() {
      moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move", {
        detail: {
          node: node
        }
      }));
    });
  moveobj.steps.push(function () { _update_active_positions(); })
  }
  if(opts.delay > 0) {
    moveobj.steps.push(function() {
      return new Promise(function(resolve) { setTimeout(resolve, opts.delay) })
    })
  }
  moveobj.steps.push(un_can_move)
  if(node) {
    moveobj.steps.push(_move_sub_speak.bind(node, 'cue', opts.cue_override_msg))
  }
  speaku.stop_speaking();
  state.can_move = false;
  function un_can_move() {
    state.can_move = true;
  }
  return (!node ? speaku.stop_speaking(speaku) : Promise.resolve())
    .then(_new_move_start.bind(null, moveobj))
    .then(un_can_move, function (err) { un_can_move(); throw err; });
}

function _do_select(node, opts) {
  opts = opts||{};
  var moveobj = _new_move_init(node)
  moveobj.steps.push(function() {
    if(node.content_element) {
      node.content_element.classList.add('selected' || config.selected_class);
    }
    moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-select", {
      detail: {
        node: node
      }
    }));
    return (_meta_true_check(node.meta['no-main'], false) ?
            Promise.resolve() : _move_sub_speak.call(node, 'main', opts.override_msg))
  })
  speaku.stop_speaking();
  state.can_move = false;
  function un_can_move() {
    state.can_move = true;
  }
  return _before_new_move()
    .then(_new_move_start.bind(null, moveobj))
    .then(un_can_move, function (err) { un_can_move(); throw err; });
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
      state.select_path = state.positions.slice(0, state.positions.length-1);
      _on_update_select_path();
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
      _update_message_bar();
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
    _update_message_bar(msg); // update message bar
    delete tmp[1]._concat_letters;
    return pause()
      .then(function() {
        return _do_select(atree, { override_msg: msg })
          .catch(function(err) {
            console.warn(err)
          })
          .then(function() {
            _did_select_prepare_for_resume(atree)
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
      } else if (last_word_idx + 1 != concat_letters.length) {
        concat_letters.splice(last_word_idx, concat_letters.length - last_word_idx, ' ');
      }
      concat_letters.push(atree.meta['spell-word'])
      concat_letters.push(' ');
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
        state.select_path = state.positions.slice(0, state.positions.length-1);
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
        _on_update_select_path();
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
      state.select_path = state.positions.slice(0, state.positions.length-1);
      _on_update_select_path();
      if (_meta_true_check(atree.meta['back-n-branch-notify'], false)) {
        return _do_notify_move(_get_current_node(), atree);
      } else {
        return _scan_move();
      }
    });
}

function _in_override_change_tree (atree) {
  var another_tree = atree.meta['change-tree'];
  if (another_tree) {
    return _in_override_change_tree_subrout(atree, get_file_url(another_tree, tree_fn));
  }
  var another_tree_name = atree.meta['change-tree-by-name'];
  if (another_tree_name) {
  return get_file_json(default_trees_info_fn)
      .then(function (trees_info) {
        another_tree_name = another_tree_name.toLowerCase();
        var tree_info = _.find(trees_info.list, function (a) { return (a.name+'').toLowerCase() == another_tree_name; });
        if (tree_info) {
          return _in_override_change_tree_subrout(atree, get_file_url(tree_info.tree_fn, default_trees_info_fn));
        } else {
          return _do_notify_move(_get_current_node(), atree, {
            main_override_msg: _t("Could not find tree with this name")
          });
        }
      });
  }
}

function _in_override_change_tree_subrout (atree, another_tree) {
  var current_tree = tree_fn;
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
        config.tree = another_tree;
        return get_file_data(another_tree)
          .then(function (data) {
            tree_data = data;
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
                    editor_helper.tree_url = tree_fn;
                    editor_helper.audio_save_dirname = info.audio_dirname;
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

function _did_select_prepare_for_resume (atree) {
  if(state.mode == 'auto' && config.auto_scan) {
    return _reset_and_resume(atree)
  } else {
    return _reset_resume_at_next_action(atree)
  }
}

function _reset_and_resume (atree) {
  return Promise.resolve()
    .then(function () {
      reset_state();
      _on_update_select_path();
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
      // update tree dyn, before start again
      return _tree_update_subdyn(tree)
        .then(resume); // start over
    });
}

function _reset_resume_at_next_action(atree) {
  // start again, on demand
  function finish() {
    reset_state();
    _on_update_select_path();
    // return 
    return (state._stopped ? _napi_remove_key_command() : Promise.resolve())
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
        // update tree dyn, before start again
        return _tree_update_subdyn(tree)
          .then(resume); // start over
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
      var html = document.querySelector('html');
      if (html.classList.contains('with-fake-scroll')) {
        html.classList.remove('has-fake-scroll');
        window.scrollTo(0, 0);
        document.removeEventListener('scroll', tmp_onscroll, false);
      } else {
        document.removeEventListener('wheel', tmp_onwheel, false);
      }
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
  var wheeldelta = [ 0, 0 ];
  function tmp_onwheel (evt) {
    tmp_onwheel_subrout(evt.deltaX, evt.deltaY)
  }
  function tmp_onscroll (evt) {
    var deltaX = window.scrollX - window._last_scroll_x,
        deltaY = window.scrollY - window._last_scroll_y;
    tmp_onwheel_subrout(deltaX, deltaY)
    // lock-the scroll
    var scrollX = window.scrollX > 110 || window.scrollX < 10 ? 60 : window.scrollX,
        scrollY = window.scrollY > 110 || window.scrollY < 10 ? 60 : window.scrollY;
    window.scrollTo(scrollX, scrollY);
    window._last_scroll_x = scrollX;
    window._last_scroll_y = scrollY;
  }
  function tmp_onwheel_subrout (deltaX, deltaY) {
    wheeldelta = [ wheeldelta[0] + deltaX,
                   wheeldelta[1] + deltaY ];
    var x_threshold = config.wheel_x_threshold || 30
    var y_threshold = config.wheel_y_threshold || 30
    if (Math.abs(wheeldelta[0]) > x_threshold ||
        Math.abs(wheeldelta[1]) > x_threshold) {
      clear()
      finish()
    }
  }
  return (state._stopped ? _napi_add_key_command() : Promise.resolve())
    .then(function() {
      tmp = document.querySelector('#navbtns')
      if(tmp && config._onscreen_navigation) {
        tmp.addEventListener('click', onscreen_nav_click, false)
      }
      window.addEventListener('keydown', onkeydown, false);
      document.addEventListener('x-keycommand', onkeydown, false); 
      if (state.mode == 'wheel') {
        var html = document.querySelector('html');
        if (html.classList.contains('with-fake-scroll')) {
          html.classList.add('has-fake-scroll');
          // ios has fake-scroll adjust scroll state according to that
          window.scrollTo(60, 60);
          window._last_scroll_x = window.scrollX;
          window._last_scroll_y = window.scrollY;
          document.addEventListener('scroll', tmp_onscroll, false);
        } else {
          document.addEventListener('wheel', tmp_onwheel, false);
        }
      }
    });
}

function _before_changeposition () {
  if (!state.edit_mode) {
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
      });
    }
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
        state.select_path = state.positions.slice(0, state.positions.length-1);
        _on_update_select_path();
        return _notify_move(_get_current_node(), atree);
      });
  }
}

function _leaf_select_utterance (anode, override_msg) {
  return pause()
    .then(function() {
      state.select_path = state.positions.slice(); // copy
      _on_update_select_path();

      return _do_select(anode, { override_msg: override_msg })
        .catch(function(err) {
          console.warn(err);
        })
        .then(function() {
          _did_select_prepare_for_resume(anode);
        });
    });
}

function _in_check_select_utterance (anode) {
  if (_meta_true_check(anode.meta['select-utterance'])) {
    return _leaf_select_utterance(anode);
  }
}

function _on_update_select_path () {
  // message bar
  if (config.display_message_bar_at_spell_branch) {
    var wrp = document.querySelector('#message-bar-wrp');
    if (wrp) {
      // current positions except index of last one
      var positions = state.positions.slice(0, state.positions.length-1);
      positions.push({
        tree: state.positions[state.positions.length-1].tree,
        index: -1,
      });
      var show = !!_get_node_attr_inherits_full(positions, 'spell-branch');
      if (show && wrp.classList.contains('hide')) {
        wrp.classList.remove('hide');
      } else if (!show && !wrp.classList.contains('hide')) {
        wrp.classList.add('hide');
      }
      _update_message_bar();
    }
  }
}

function _update_message_bar (txt) {
  var msgbar = document.querySelector('#message-bar');
  if (msgbar == null) {
    return;
  }
  msgbar.innerHTML = '';
  if (txt != null) {
    var elm = newEl('div');
    elm.classList.add('text');
    elm.textContent = txt;
    msgbar.appendChild(elm);
    return;
  }
  txt = _get_current_spell_txt();
  if (!!txt) {
    var words = txt.split(' ');
    var idx = 0;
    _.each(words, function (word) {
      if (idx + 1 == words.length) {
        _.each(word, function (letter) {
          var elm = newEl('div');
          elm.classList.add('text');
          elm.textContent = letter;
          msgbar.appendChild(elm);
        });
      } else {
        var elm = newEl('div');
        elm.classList.add('text');
        elm.textContent = word;
        msgbar.appendChild(elm);
      }
      idx++;
    });
  }
  _tree_needs_resize();
}

function _in_override_webhook_action (anode) {
  if (anode.meta['webhook']) {
    return new Promise(function (resolve, reject) {
      var url = anode.meta['webhook'],
          method = anode.meta['webhook-method'] || 'POST',
          contenttype = anode.meta['webhook-content-type'] || 'application/json',
          body = anode.meta['webhook-body'],
          success_msg = anode.meta['webhook-success-message'],
          skip_validating_response = _meta_true_check(anode.meta['webhook-skip-validating-response']),
          modify_headers = _meta_true_check(anode.meta['webhook-modify-headers']);
      if (contenttype == 'application/json') {
        try {
          if (!body) {
            body = '{}'
          }
          // validate json body
          JSON.parse(body)
        } catch (err) {
          err.utter_message = 'Could not parse request body as json';
          reject(err);
          return;
        }
      }
      var headers = {};
      if (['HEAD','GET'].indexOf(method) == -1) {
        if (modify_headers) {
          headers['Content-Type'] = contenttype;
        }
      } else {
        contenttype = null;
      }
      window.fetch(url, {
        method: method,
        headers: headers,
        body: contenttype ? body : null,
      })
        .then(function (resp) {
          return skip_validating_response ? Promise.resolve() :
            resp.json()
            .catch(function (err) {
              err.utter_message = 'Unexpected response, Expecting json data'
              throw err;
            });
        })
        .then(function (respdata) {
          if (!skip_validating_response && (respdata.status+'').toLowerCase() != 'success') {
            var err = new Error('webhook request was not successful: ' + JSON.stringify(respdata));
            err.utter_message = _t('Request failed');
            throw err;
          }
          return _leaf_select_utterance(anode, success_msg);
        })
        .catch(function (err) {
          err.utter_message = _t('Request failed');
          reject(err);
        });
    })
      .catch(function (err) {
        console.error(err);
        var errmsg = err.utter_message || 'Unknown error';
        return _do_notify_move(_get_current_node(), anode, {
          main_override_msg: errmsg
        });
      });
  }
}

var _tree_select_override_functions = [
  _in_check_back_n_branch,
  _in_override_change_tree,
  _in_override_webhook_action,
  _in_check_spell_delchar,
  _in_check_spell_default,
  _in_check_select_utterance,
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
    
    // explicit finish check
    // special case
    var res;
    for(var i = 0, len = _tree_select_override_functions.length; i < len; i++) {
      if((res = _tree_select_override_functions[i](atree)) != null)
        return res;
    }
    // finish it
    // on auto mode stop iteration and on any key restart
    return _leaf_select_utterance(atree);
  } else {
    if(atree.nodes.length == 0)
      return Promise.resolve(); // has no leaf, nothing to do
    return _before_changeposition()
      .then(function () {
        state.positions.push({
          tree: atree,
          index: 0
        });
        state.select_path = state.positions.slice(0, state.positions.length-1);
        _on_update_select_path();
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
      state.select_path = state.positions.slice(0, state.positions.length-1);
      _on_update_select_path();
      return _scan_move()
    });
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

function mk_words_weight_cmp (asc) {
  var mul = asc ? 1 : -1;
  return function (a, b) {
    return mul * (a.w - b.w);
  }
}

/**
 * A single word.
 * @typedef {Object} Word
 * @property {string} v - The word.
 * @property {string} lower - The lowercased word.
 * @property {number} w - The word's weight.
 */

/**
 * A list of words.
 * @typedef {Object} WordList
 * @property {Array<Word>} words - The words.
 * @property {Map<string,WordList>} [_cache] - A cache that maps
 *   a prefix to a sequence of matching words.
 */

/**
 * Load the words in a file.
 * @param {string} url - The location of the file.
 * @returns {Promise<WordList>}
 */
function get_words(url) {
  if (words_cache[url]) {
    return words_cache[url];
  }
  return words_cache[url] = get_file_json(url)
    .then(function(data) {
      const words = _.chain(data.words)
        // Store the lowercased word.
        .map(w => _.defaults({ lower: (w.v+'').toLowerCase() }, w))
        // Make sure that the words are sorted.
        .sortBy(w => w.lower)
        .value();

      return _.defaults({ words }, data);
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
      txt = tmp[tmp.length-1]._concat_letters.join('')
    }
  }
  return txt;
}
function _get_current_spell_word () {
  var txt = _get_current_spell_txt().split(' ');
  return txt[txt.length-1];
}

const _MAX_PREDICTION_CACHE_ENTRIES = 4;

/**
 * Get all the words with a given input text as a prefix. This
 * search is case-insensitive.
 *
 * @param {string} wordsFile - The location of the words file.
 * @param {string} casedPrefix - The input text.
 *
 * @returns {Promise<WordList>} The matching words.
 * @private
 */
function _get_prediction_spell_words(wordsFile, casedPrefix) {
  return get_words(wordsFile).then(function(wdata) {
    wdata._cache = wdata._cache || new Map();

    const prefix = casedPrefix.toLowerCase();

    // No prediction if the input text is empty.
    if (!prefix) {
      return { words: [] };
    }

    if (wdata._cache.has(prefix)) {
      return wdata._cache.get(prefix);
    }

    // If necessary, remove the oldest entries in the cache. Maps
    // are ordered in JavaScript, so we can simply delete the first
    // keys first.
    _.take(
      [...wdata._cache.keys()],
      // The number of entries that exceed the limit. Technically
      // this should always be 1 at most.
      wdata._cache.size - _MAX_PREDICTION_CACHE_ENTRIES
    ).forEach(k => wdata._cache.delete(k));

    const words = wdata.words;

    /**
     * Truncate the word to the same length as the prefix.
     * @param {Word} w - The word.
     * @returns {string} - The substring.
     */
    const sub = w => w.lower.substr(0, prefix.length);

    /**
     * Get the position of the first match, or -1.
     * @returns {number} The index.
     */
    function getStartIndex() {
      const i = _.sortedIndex(words, { lower: prefix }, sub);
      return sub(words[i]) === prefix ? i : -1;
    }

    const startIndex = getStartIndex();
    // TODO: We could use _.takeWhile if we ever replace Underscore
    //   with Lodash.
    let stopIndex = startIndex;
    while (words[stopIndex] && sub(words[stopIndex]) === prefix) {
      stopIndex++;
    }
    const matches = { words: words.slice(startIndex, stopIndex) };
    wdata._cache.set(prefix, matches);
    return matches;
  });
}

function _word_prediction_dynamic_nodes (anode) {
  var words_file
  if (anode.meta['words-file']) {
    words_file = get_file_url(anode.meta['words-file'], tree_fn)
  } else if (config.words_file) {
    words_file = get_file_url(config.words_file, config_fn)
  }
  if (!words_file) {
    throw new Error("No words file given for dyn=\"spell-word-prediction\"");
  }
  var txt = _get_current_spell_word(),
      max_nodes = anode.meta['max-nodes'] || 3,
      nchars = parseInt(anode.meta['predict-after-n-chars']);
  if (!isNaN(nchars) && txt.length < nchars) {
    return Promise.resolve({ nodes: [] });
  }
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
  var words_file
  if (anode.meta['words-file']) {
    words_file = get_file_url(anode.meta['words-file'], tree_fn)
  } else if (config.words_file) {
    words_file = get_file_url(config.words_file, config_fn)
  }
  if (!words_file) {
    throw new Error("No words file given for dyn=\"spell-word-prediction\"");
  }
  var alphabet = anode.meta['alphabet'] || config.alphabet ||
                 'abcdefghijklmnopqrstuvwxyz', 
      txt = _get_current_spell_word(),
      nchars = parseInt(anode.meta['predict-after-n-chars']);
  if (typeof alphabet == 'string') {
    if (alphabet.indexOf(',') != -1) {
      alphabet = alphabet.split(',');
    } else {
      alphabet.split('');
    }
  }
  if (!isNaN(nchars) && txt.length < nchars) {
    return Promise.resolve({ nodes: [] });
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


function _start_auto_insert_back(tree, content_template) {
  _.each(tree.nodes, function(anode) {
    if(!anode.is_leaf) {
      var insert_pos = null;
      if (config.helper_back_option == 'start') {
        insert_pos = 0;
      }
      anode._back_node = tree_insert_node(anode, insert_pos, {
        _more_meta: {
          istmp: true
        },
        meta: {
          'back-n-branch': '1',
          'auditory-cue': config.helper_back_option_cue_text || _t('Back'),
          'back-n-branch-notify': config.helper_back_option_notify ? 'true' : 'false',
          'main-audio': config.helper_back_option_main_audio ? get_file_url(config.helper_back_option_main_audio, config_fn) : null,
          'cue-audio': config.helper_back_option_cue_audio ? get_file_url(config.helper_back_option_cue_audio, config_fn) : null,
        },
        text: config.helper_back_option_main_text || _t('Back'),
      }, content_template);
      _start_auto_insert_back(anode, content_template);
    }
  });
}

function _helper_add_stay_in_branch_for_all (tree) {
  _.each(tree.nodes, function(anode) {
    if (!anode.is_leaf) {
      if (!('stay-in-branch' in anode.meta)) {
        anode._helper_stay_in_branch_added = true;
        anode.meta['stay-in-branch'] = 'true';
      }
      _helper_add_stay_in_branch_for_all(anode);
    }
  });
}

function install_tree (tree_element, tree_data, config, state) {
  var tmpelm = newEl('div');
  var tree = parse_tree(tmpelm, tree_data);
  // init positions
  state.positions = [ {
    tree: tree,
    index: -1
  } ];
  if (!state.edit_mode) {
    if (config.helper_back_option) {
      var content_template,
          tmp = document.querySelector('#tree-node-template');
      if(tmp)
        content_template = _.template(tmp.innerHTML);
      _start_auto_insert_back(tree, content_template, config.helper_back_option);
    }
    if (config.helper_stay_in_branch_for_all) {
      _helper_add_stay_in_branch_for_all(tree);
    }
  }
  return (state.edit_mode ? Promise.resolve() : _tree_dynupdate(tree))
    .then(function () {
      // rest of parse_tree
      var content_template,
          tmp = document.querySelector('#tree-node-template');
      if(tmp)
        content_template = _.template(tmp.innerHTML);
      tree_element.innerHTML = ''; // clear all
      tree_mk_list_base(tree, tree_element, content_template); // re-create
      return tree;
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
  return get_file_json(default_trees_info_fn)
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
