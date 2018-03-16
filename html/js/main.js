var config_fn, tree_fn, config, tree, state = null, tree_element, napi, speaku,
    config_json, tree_contentsize_xstep = 50;
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
  .then(function() {
    config_fn = default_config;
    tree_fn = default_tree;
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
            delete_file(tree_fn)
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
        config_json = JSON.stringify(config);
        return eval_config(config);
      })
      .catch(handle_error_checkpoint());
  })
  .then(function() {
    // load tree
    tree_element = document.querySelector('#tree')
    if(!tree_element)
      return Promise.reject(new Error("Cannot find #tree element"));
    tree_fn = config.tree || tree_fn;
    return Promise.all([
      initl10n(config.locale||default_locale)
        .then(function() {
          domlocalize();
        })
        .catch(function(err) {
          console.warn(err);
        }),
      load_tree(tree_element, tree_fn)
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
    // display body
    document.body.style.display = '';
  })
  .then(start)
  .catch(handle_error);

function navbtns_init() {
  var navbtns_wrp = document.querySelector('#navbtns-wrp'),
      main_outline = document.querySelector('.main-stroke-outline'),
      move_started = false,
      cache = null, down_timeout_ms = 2000;
  resizable_init();
  if(config.nav_pos)
    navbtns_set_position(navbtns_wrp, config.nav_pos);
  if(config.nav_scale > 0)
    navbtns_set_scale(navbtns_wrp, config.nav_scale);
  main_outline.addEventListener('mousedown', function(evt) {
    evt.preventDefault();
    if(!move_started) {
      document.addEventListener('mousemove', onmousemove, true);
      document.addEventListener('mouseup', onmouseup, true);
      move_started = true;
      cache = {
        pos: [ evt.clientX, evt.clientY ],
        offsetLeft: navbtns_wrp.offsetLeft,
        offsetTop: navbtns_wrp.offsetTop,
        offsetWidth: navbtns_wrp.offsetWidth,
        offsetHeight: navbtns_wrp.offsetHeight,
      };
      cache.down_timeout = setTimeout(ondown_timeout, down_timeout_ms);
    }
  }, false);
  function ondown_timeout() {
    if(!cache)
      return;
    if(!cache.end_pos) {
      if(cache.is_touch) {
        onmousecancel();
      } else {
        ontouchcancel();
      }
      var has_edit = !navbtns_wrp.querySelector('.edit-bound').classList.contains('hide');
      navbtns_wrp.querySelector('.edit-bound').classList[has_edit?'add':'remove']('hide');
    } else {
      delete cache.down_timeout;
    }
  }
  function onmousecancel() {
    document.removeEventListener('mousemove', onmousemove, true);
    document.removeEventListener('mouseup', onmouseup, true);
    move_started = false;
    cache = null;
  }
  function onmouseup(evt) {
    if(move_started) {
      evt.preventDefault();
      evt.stopPropagation();
      end();
      move_started = false;
      cache = null;
      document.removeEventListener('mousemove', onmousemove, true);
      document.removeEventListener('mouseup', onmouseup, true);
    }
  }
  function onmousemove(evt) {
    if(move_started) {
      evt.preventDefault();
      evt.stopPropagation();
      var new_pos = [ evt.clientX, evt.clientY ];
      cache.end_pos = move(new_pos[0]-cache.pos[0], new_pos[1]-cache.pos[1]);
    }
  }
  main_outline.addEventListener('touchstart', function(evt) {
    if(evt.touches.length == 1) {
      evt.preventDefault();
      evt.stopPropagation();
      if(!move_started) {
        move_started = true;
        document.addEventListener('touchmove', ontouchmove, true);
        document.addEventListener('touchend', ontouchend, true);
        cache = {
          pos: [ evt.touches[0].clientX, evt.touches[0].clientY ],
          offsetLeft: navbtns_wrp.offsetLeft,
          offsetTop: navbtns_wrp.offsetTop,
          offsetWidth: navbtns_wrp.offsetWidth,
          offsetHeight: navbtns_wrp.offsetHeight,
          is_touch: true
        };
        cache.down_timeout = setTimeout(ondown_timeout, down_timeout_ms);
      }
    }
  }, false);
  function ontouchmove(evt) {
    if(move_started) {
      evt.preventDefault();
      evt.stopPropagation();
      var new_pos = [ evt.touches[0].clientX, evt.touches[0].clientY ];
      cache.end_pos = navbtns_move(navbtns_wrp, new_pos[0]-cache.pos[0], new_pos[1]-cache.pos[1]);
    }
  }
  function ontouchcancel() {
    document.removeEventListener('touchmove', ontouchmove, true);
    document.removeEventListener('touchend', ontouchend, true);
    move_started = false;
    cache = null;
  }
  function ontouchend(evt) {
    if(move_started) {
      evt.preventDefault();
      evt.stopPropagation();
      end();
      move_started = false;
      cache = null;
      document.removeEventListener('touchmove', ontouchmove, true);
      document.removeEventListener('touchend', ontouchend, true);
    }
  }
  function end() {
    if(cache.down_timeout)
      clearTimeout(cache.down_timeout);
    if(cache.end_pos) {
      autosave({nav_pos: cache.end_pos});
    }
  }
  var autosave_timeout, autosave_running;
  function autosave(change) {
    if(autosave_running)
      return;
    if(autosave_timeout == null)
      clearTimeout(autosave_timeout);
    autosave_timeout = setTimeout(function() {
      delete autosave_timeout;
      autosave_running = true;
      save(change)
        .then(function() {
          autosave_running = false;
        });
    }, 1000);
  }
  function save(change) {
    var _config = JSON.parse(config_json);
    for(var key in change) {
      if(change.hasOwnProperty(key)) {
        if(change[key] == null) {
          delete _config[key];
          delete config[key];
        } else {
          _config[key] = change[key];
          config[key] = change[key];
        }
      }
    }
    return set_file_data(config_fn, JSON.stringify(_config, null, "  "))
      .then(function() {
        config_json = JSON.stringify(_config);
      })
      .catch(handle_error);
  }
  function move(dx, dy) {
    var top = cache.offsetTop + dy,
        right = window.innerWidth - cache.offsetLeft - cache.offsetWidth - dx,
        bottom = window.innerHeight - cache.offsetTop - cache.offsetHeight - dy,
        left = cache.offsetLeft + dx,
        pos = {};
    if(top < bottom)
      pos.top = top; // top
    else
      pos.bottom = bottom; // bottom
    if(right < left)
      pos.right = right; // right
    else
      pos.left = left; // left
    navbtns_set_position(navbtns_wrp, pos);
    return pos;
  }
  function resizable_init() {
    // resize section
    var edit_wrp = navbtns_wrp.querySelector('.edit-bound'),
        reset_btn = navbtns_wrp.querySelector('.reset-btn'),
        _cache;
    navbtns_wrp._scale_end = config.nav_scale;
    reset_btn.addEventListener('click', function(evt) {
      navbtns_wrp._scale_end = 1;
      reset_btn.disabled = true;
      navbtns_set_position(navbtns_wrp, null);
      navbtns_set_scale(navbtns_wrp, 1.0);
      edit_wrp.classList.add('hide');
      save({
        nav_scale: 1,
        nav_pos: null
      })
        .then(function() { reset_btn.disabled = false; },
              function() { reset_btn.disabled = false; })
        .catch(handle_error);
    });
    reset_btn.addEventListener('mousedown', function(evt) {
      evt.stopPropagation();
    }, true);
    reset_btn.addEventListener('touchstart', function(evt) {
      evt.stopPropagation();
    }, true);
    edit_wrp.addEventListener('mousedown', function(evt) {
      if(cache)
        return;
      _cache = {};
      var foundclasses = _.filter(evt.target.classList, function(a){return a.indexOf('resize-') == 0});
      if(foundclasses.length > 0) {
        var dir = foundclasses[0].substr('resize-'.length, 2);
        var rect = navbtns_wrp.getBoundingClientRect();
        _cache.rect = rect;
        _cache.resize = true;
        _cache.dir = dir;
        _cache.move_pos = [evt.clientX, evt.clientY];
        document.addEventListener('mouseup', resize_onmouseup, true);
        document.addEventListener('mousemove', resize_onmousemove, true);
      } else {
        _cache.down_timeout = setTimeout(edit_ondown_timeout, down_timeout_ms);
      }
    }, false);
    edit_wrp.addEventListener('touchstart', function(evt) {
      if(cache)
        return;
      if(evt.touches.length == 1) {
        _cache = {};
        var foundclasses = _.filter(evt.touches[0].target.classList, function(a){return a.indexOf('resize-') == 0});
        if(foundclasses.length > 0) {
          var dir = foundclasses[0].substr('resize-'.length, 2);
          var rect = navbtns_wrp.getBoundingClientRect();
          _cache.rect = rect;
          _cache.resize = true;
          _cache.dir = dir;
          _cache.move_pos = [evt.touches[0].clientX, evt.touches[0].clientY];
          document.addEventListener('touchstart', resize_ontouchstart, true);
          document.addEventListener('touchmove', resize_ontouchmove, true);
        } else {
          _cache.down_timeout = setTimeout(edit_ondown_timeout, down_timeout_ms);
        }
      }
    }, false);
    function edit_ondown_timeout() {
      if(!_cache)
        return;
      _cache = null;
      var has_edit = !navbtns_wrp.querySelector('.edit-bound').classList.contains('hide');
      navbtns_wrp.querySelector('.edit-bound').classList[has_edit?'add':'remove']('hide');
    }
    function resize_onmouseup(evt) {
      if(!_cache)
        return;
      if(_cache.down_timeout)
        clearTimeout(_cache.down_timeout);
      if(_cache.resize) {
        document.removeEventListener('mouseup', resize_onmouseup, true);
        document.removeEventListener('mousemove', resize_onmousemove, true);
      }
      resize_onend();
      _cache = null;
    }
    function resize_ontouchend(evt) {
      if(!_cache)
        return;
      if(_cache.down_timeout)
        clearTimeout(_cache.down_timeout);
      if(_cache.resize) {
        document.removeEventListener('touchend', resize_ontouchend, true);
        document.removeEventListener('touchmove', resize_ontouchmove, true);
      }
      resize_onend();
      _cache = null;
    }
    function resize_onmousemove(evt) {
      if(_cache.resize) {
        var new_move = [evt.clientX, evt.clientY];
        resize_onmove(_cache.dir, new_move[0]-_cache.move_pos[0], new_move[1]-_cache.move_pos[1]);
      }
    }
    function resize_ontouchmove(evt) {
      if(_cache.resize) {
        var new_move = [evt.touches[0].clientX, evt.touches[0].clientY];
        resize_onmove(_cache.dir, new_move[0]-_cache.move_pos[0], new_move[1]-_cache.move_pos[1]);
      }
    }
    function resize_onmove(dir, dx, dy) {
      if(_cache && _cache.resize) {
        var start_diagonal = Math.sqrt(_cache.rect.width*_cache.rect.width +
                                       _cache.rect.height*_cache.rect.height),
            new_width = _cache.rect.width,
            new_height = _cache.rect.height,
            scale = 0.2;
        switch(dir) {
        case 'tl':
          new_width -= dx*2;
          new_height -= dy*2;
          break;
        case 'tr':
          new_width += dx*2;
          new_height -= dy*2;
          break;
        case 'br':
          new_width += dx*2;
          new_height += dy*2;
          break;
        case 'bl':
          new_width -= dx*2;
          new_height += dy*2;
          break;
        }
        if(new_width > 0 && new_height > 0) {
          var new_diagonal = Math.sqrt(new_width*new_width +
                                       new_height*new_height);
          scale = Math.max(scale, new_diagonal/start_diagonal*(navbtns_wrp._scale_end||1));
        }
        _cache.scale = scale;
        navbtns_set_scale(navbtns_wrp, scale);
      }
    }
    function resize_onend() {
      if(_cache.resize && _cache.scale > 0) {
        navbtns_wrp._scale_end = _cache.scale;
        autosave({nav_scale: _cache.scale});
      }
    }
  }
}
function navbtns_set_scale(elm, scale) {
  elm.style.transform = 'scale('+scale.toFixed(2)+')';
  elm._scale = scale;
  var edit_elm = elm.querySelector('.edit-bound');
  if(edit_elm) {
    var divs = edit_elm.querySelectorAll('div');
    var iscale = 1/scale;
    _.each(divs, function(div) {
      if(_.filter(div.classList, function(a){return a.indexOf('resize-')==0}).length>0) {
        div.style.transform = 'scale('+iscale.toFixed(2)+')'; 
      }
    });
  }
}
function navbtns_set_position(elm, pos) {
  pos = pos||{};
  if(pos.top != null) {
    elm.style.top = pos.top + 'px';
    elm.style.bottom = 'initial';
  } else if(pos.bottom != null) {
    elm.style.bottom = pos.bottom + 'px';
    elm.style.top = 'initial';
  } else {
    elm.style.top = '';
    elm.style.bottom = '';
  }
  if(pos.left != null) {
    elm.style.left = pos.left + 'px';
    elm.style.right = 'initial';
  } else if(pos.right != null) {
    elm.style.right = pos.right + 'px';
    elm.style.left = 'initial';
  } else {
    elm.style.right = '';
    elm.style.left = '';
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

var _modes = ['auto', 'switch'],
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
  if(state && state._keyhit_off)
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
  if(state && state._keyhit_off)
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
    _stop_callbacks: []
  };
  if(_modes.indexOf(state.mode) == -1)
    throw new Error("Unknown mode " + state.mode);
  return state._start_promise = _start_prepare()
    .then(function() {
      tree_element.addEventListener('x-mode-change', _on_mode_change, false);
      document.addEventListener('x-keycommand', _on_xkeycommand, false);
      window.addEventListener('keydown', _on_keydown, false);
      window.addEventListener('resize', _tree_needs_resize, false);
      var tmp = document.querySelector('#navbtns')
      if(tmp && config._onscreen_navigation)
        tmp.addEventListener('click', _on_navbtns_click, false)
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
      if(state.positions[state.positions.length - 1].index != -1)
        _tree_position_update();
      else
        _update_active_positions();
      delete state._start_promise;
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
    }, (is_first_run(_state) ? config.auto_next_first_run_delay : null) ||
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

function _start_prepare() {
  if(napi.available) {
    var delegates = config._keyhit_delegates[state.mode];
    var promises = [];
    for(var key in delegates) {
      let input = NativeAccessApi.keyInputByCode[key];
      if(input) {
        promises.push(napi.add_key_command(input))
      }
    }
    return Promise.all(promises);
  } else {
    return Promise.resolve();
  }
}

function _stop_prepare() {
  if(napi.available) {
    var delegates = config._keyhit_delegates[state.mode];
    var promises = [];
    for(var key in delegates) {
      var input = NativeAccessApi.keyInputByCode[key];
      if(input) {
        promises.push(napi.remove_key_command(input));
      }
    }
    return Promise.all(promises);
  } else {
    return Promise.resolve();
  }
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
      tree_element.removeEventListener('x-mode-change', _on_mode_change, false);
      if(state._next_keyup) {
        window.removeEventListener('keyup', state._next_keyup, false);
        state._next_keyup = null
      }
      document.removeEventListener('x-keycommand', _on_xkeycommand, false);
      window.removeEventListener('keydown', _on_keydown, false);
      window.removeEventListener('resize', _tree_needs_resize, false);
      var tmp = document.querySelector('#navbtns')
      if(tmp && config._onscreen_navigation)
        tmp.removeEventListener('click', _on_navbtns_click, false)
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

function _on_mode_change() {
  stop()
    .then(function() {
      state = renew_state(state)
      return start(state);
    })
    .catch(handle_error);
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

function _take_snapshot() {
  var tree = state.positions[0].tree,
      new_tree = _clone_tree(tree),
      new_tree_elm = tree_element.cloneNode()
  tree_mk_list_base(new_tree, new_tree_elm); // re-create
  if(tree.dom_element)
    new_tree_elm.tree_height = tree.dom_element.tree_height;
  return {
    tree: new_tree,
    positions: _state_redefine_positions(state.positions, new_tree)
  };
}
function _restore_snapshot(snapshot) {
  return stop(state)
    .then(function() {
      tree_element.parentNode.replaceChild(snapshot.tree.dom_element, tree_element)
      tree_element = snapshot.tree.dom_element
      tree = snapshot.tree
      state.positions = snapshot.positions
      return start(state)
    });
}

/** <Edit Mode> **/

function _edit_mode_toggle(b, restart) {
  if(state._changing_edit_mode)
    return;
  state._changing_edit_mode = true;
  document.querySelector('#edit-mode-btn').disabled = b
    // .classList[b?'add':'remove']('hide')
  document.querySelector('#edit-mode-save-btn')
    .classList[!b?'add':'remove']('hide')
  document.querySelector('#edit-mode-cancel-btn')
    .classList[!b?'add':'remove']('hide')
  tree_element[(b?'add':'remove')+'EventListener']
    ('click', _edit_mode_on_tree_click, false)
  tree_element[(b?'add':'remove')+'EventListener']
    ('x-new-move', _edit_mode_on_new_move, true)
  tree_element.classList[b?'add':'remove']('edit-mode')
  if(!b) {
    // remove previously selected
    if(state._selected_node) {
      state._selected_node.dom_element.classList.remove('selected')
      state._selected_node.content_element
        .removeChild(state._selected_node._edit_overlay)
      delete state._selected_node._edit_overlay
      delete state._selected_node
    }
  }
  var promise;
  if(restart) {
    promise = stop()
      .then(function() {
        renew_state(state)
        return start(state)
      });
  } else {
    promise = Promise.resolve();
  }
  return promise.then(function() {
    state.silent_mode = b
    state.mode = b ? 'switch' : config.mode || 'auto'
    state.edit_mode = b
    delete state._changing_edit_mode;
  });
}

function _remove_child_node(parent, idx) {
  var node = parent.nodes[idx]
  parent.nodes.splice(idx, 1);
  node.dom_element.parentNode.removeChild(node.dom_element)
  if(parent.nodes.length == 0) {
    delete parent.nodes
    parent.is_leaf = true
  }
}
function _add_new_node(parent, index, override) {
  var ul = parent.dom_element.querySelector(':scope > ul.children')
  if(!ul) {
    ul = newEl('ul')
    ul.classList.add('children')
    parent.dom_element.appendChild(ul)
  }
  if(!parent.nodes)
    parent.nodes = [];
  parent.is_leaf = false;
  if(index > parent.nodes.length)
    throw new Error("index out of range!");
  var new_node = {
    text: 'New',
    meta: {},
    _more_meta: {},
    level: parent.level + 1,
    parent: parent,
    is_leaf: true
  };
  if(override)
    new_node = Object.assign(new_node, override);
  var new_li = newEl('li');
  tree_mk_list_base(new_node, new_li);
  var node_after = parent.nodes[index]
  if(!node_after)
    ul.appendChild(new_li);
  else
    ul.insertBefore(new_li, node_after.dom_element);
  parent.nodes.splice(index, 0, new_node);
  return new_node
}
function _edit_mode_select(node) {
  if(state._selected_node == node)
    return; // already selected
  // remove previously selected
  if(state._selected_node) {
    state._selected_node.dom_element.classList.remove('selected')
    state._selected_node.content_element
      .removeChild(state._selected_node._edit_overlay)
    delete state._selected_node._edit_overlay
  }
  if(!node.content_element)
    return; // no good
  node.dom_element.classList.add('selected')
  var edit_overlay = newEl('div');
  edit_overlay.innerHTML = document.querySelector('#node-edit-overlay').innerHTML
  edit_overlay.classList.add("node-edit-overlay");
  var inp_txt = edit_overlay.querySelector('[name=text]')
  if(inp_txt) {
    var txt = node.text + 
        (node._more_meta['auditory-cue-in-text'] &&
         node.meta['auditory-cue'] ?
         '(' + node.meta['auditory-cue'] + ')' : '');
    inp_txt.value = txt;
    inp_txt.addEventListener('blur', function(evt) {
      if(config._theinput_enabled) {
        keyevents_handle_theinput();
      }
    }, false);
    function onbefore_other_blur() {
      if(config._theinput_enabled) {
        keyevents_handle_theinput_off();
      }
    }
    inp_txt.addEventListener('touchend', onbefore_other_blur, false);
    inp_txt.addEventListener('mouseup', onbefore_other_blur, false);
    inp_txt.addEventListener('input', function(evt) {
      var data = parse_dom_tree_subrout_parse_text(inp_txt.value);
      node.text = data.text;
      if(data.meta['auditory-cue'])
        node.meta['auditory-cue'] = data.meta['auditory-cue'];
      else
        delete node.meta['auditory-cue'];
      node._more_meta['auditory-cue-in-text'] = !!data._more_meta['auditory-cue-in-text'];
      node.txt_dom_element.textContent = node.text
    }, false);
    inp_txt.addEventListener('keydown', function(evt) {
      var code = evt.keyCode;
      evt.stopPropagation()
      if(code == 27 || code == 13) { // escape or enter
        evt.preventDefault();
        inp_txt.blur()
      }
    }, false);
  }
  node.content_element.appendChild(edit_overlay);
  node._edit_overlay = edit_overlay;
  state._selected_node = node;
}
function _edit_mode_on_new_move(evt) {
  _edit_mode_select(evt.detail.node)
}
function _edit_mode_on_tree_click(evt) {
  var elm = evt.target,
      node, node_elm, btn, edit_overlay;
  if(elm.classList.contains('children')) {
    return; // no good
  }
  while(elm != null) {
    if(!btn && elm.nodeName == 'BUTTON')
      btn = elm;
    if(elm.classList.contains('node-edit-overlay'))
      edit_overlay = elm;
    if(elm.classList.contains('node')) {
      node_elm = elm;
      node = node_elm.target_node;
      break;
    }
    elm = elm.parentNode
  }
  if(elm == null || !node || !node.parent) // not found or invalid
    return;
  if(btn) {
    if(btn.classList.contains('add-node-before')) {
      var idx = node.parent.nodes.indexOf(node)
      if(idx == -1)
        throw new Error("Corrupt tree!");
      var new_node = _add_new_node(node.parent, idx)
      _tree_move(new_node) // is silent move
    } else if(btn.classList.contains('add-node-after')) {
      var idx = node.parent.nodes.indexOf(node)
      if(idx == -1)
        throw new Error("Corrupt tree!");
      var new_node = _add_new_node(node.parent, idx + 1)
      _tree_move(new_node) // is silent move
    } else if(btn.classList.contains('add-child-node')) {
      var new_node = _add_new_node(node, node.nodes ? node.nodes.length : 0)
      _tree_move(new_node) // is silent move
    } else if(btn.classList.contains('remove-node')) {
      var idx = node.parent.nodes.indexOf(node)
      if(idx == -1)
        throw new Error("Corrupt tree!");
      var parent = node.parent;
      _remove_child_node(parent, idx);
      var anode = !parent.nodes || idx >= parent.nodes.length ||
          parent.nodes.length == 0 ? parent : parent.nodes[idx]
      _tree_move(anode) // is silent move
    } else if(btn.classList.contains('node-setting')) {
      // bootstrap modal
      function on_modal_hidden() {
        $('#node-setting-modal').off('hidden.bs.modal', on_modal_hidden);
        if(config._theinput_enabled) {
          keyevents_handle_theinput();
        }
        state._keyhit_off = false;
        editor_helper.node_setting_modal_unbind();
      }
      if(config._theinput_enabled) {
        keyevents_handle_theinput_off();
      }
      state._keyhit_off = true;
      $('#node-setting-modal').modal('show')
        .on('hidden.bs.modal', on_modal_hidden);
      editor_helper.node_setting_modal_bind(_get_current_node());
    }
  } else {
    if(edit_overlay && evt.target != edit_overlay)
      return; // click was for overlay elements
    // select
    evt.preventDefault();
    _tree_move(node);
  }
}
function _on_edit_mode() {
  state._orig_snapshot = _take_snapshot()
  _edit_mode_toggle(true, true)
}
function _on_edit_save() {
  var save_btn = document.querySelector('#edit-mode-save-btn'),
      cancel_btn = document.querySelector('#edit-mode-cancel-btn');
  save_btn.disabled = true;
  cancel_btn.disabled = true;
  // save
  editor_helper.on_save(tree)
    .then(function() {
      var tree_md = tree_to_markdown(tree)
      return set_file_data(tree_fn, tree_md)
    })
    .then(function() {
      // did save
      save_btn.disabled = false;
      cancel_btn.disabled = false;
      _edit_mode_toggle(false);
      delete state._orig_snapshot;
    })
    .catch(function(err) {
      save_btn.disabled = false;
      cancel_btn.disabled = false;
      handle_error(err)
    });
}
function _on_edit_cancel() {
  editor_helper.on_restore(tree)
    .then(function() {
      // restore will stop => auto toggle off
      // _edit_mode_toggle(false);
      return _restore_snapshot(state._orig_snapshot)
        .then(function() {
          delete state._orig_snapshot;
        });
    })
    .catch(handle_error);
}
/** <Edit Mode/> **/

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
    if(window.icu && icu.rtl && _keys_for_rtl.hasOwnProperty(downcode+'')) {
      downcode = _keys_for_rtl[downcode];
    }
    var delegate = config._keyhit_delegates[state.mode][downcode+''];
    if(delegate) {
      if(delegate.preventDefault)
        down_ev.preventDefault();
    }
    if(state._next_keyup)
      window.removeEventListener('keyup', state._next_keyup, false);
    state._next_keyup = function(ev) {
      var upcode = ev.charCode || ev.keyCode;
      if(window.icu && icu.rtl && _keys_for_rtl.hasOwnProperty(upcode+'')) {
        upcode = _keys_for_rtl[upcode];
      }
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

function _on_keyhit(ev) {
  if(state && state._keyhit_off)
    return;
  var code = ev.charCode || ev.keyCode;
  if(window.icu && icu.rtl && _keys_for_rtl.hasOwnProperty(code+'')) {
    code = _keys_for_rtl[code];
  }
  // look for delegate calls
  var delegate = config._keyhit_delegates[state.mode][code+''];
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
  var promise = speaku.stop_speaking();
  var el;
  while((el = state._highlighted_elements.pop()))
    el.classList.remove('highlight' || config.highlight_class);
  return promise;
}

function _new_move_start(moveobj) {
  return new Promise(function(retResolve, retReject) {
    var promise = new Promise(function(resolve) {
      setTimeout(function() {
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
          })
          .then(retResolve, retReject);
        if(prev_running_move) {
          prev_running_move.then(resolve)
        } else {
          resolve();
        }
      }, 0);
    });
  });
}

function _new_move_init(node) {
  return {
    steps: [],
    node: node
  };
}

function _update_active_positions(_state, positions) {
  _state = _state || state
  positions = positions || _state.positions
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
        ul = pos.tree.dom_element.querySelector(':scope > .children'),
        el = node ? node.dom_element : null,
        height = el ? el.offsetHeight : 0,
        offY = el ? el.offsetTop : 0,
        pheight = tree_element.tree_height,
        top = ((pheight / 2.0 - height / 2.0) - offY - topSum);
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
  if(node.txt_dom_element) {
    node.txt_dom_element.classList.add('highlight' || config.highlight_class);
    state._highlighted_elements.push(node.txt_dom_element);
  }
  _update_active_positions();
}

function _move_sub_speak(text, voice_options) {
  if(state.silent_mode) {
    return Promise.resolve();
  }
  if(this.meta['audio']) {
    return speaku.play_audio(this.meta['audio'], voice_options)
  } else {
    return speaku.simple_speak(text, voice_options);
  }
}

function _move_sub_speak2(type) {
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
  if(audio) {
    return speaku.play_audio(audio, opts)
  } else if(text) {
    return speaku.simple_speak(text, opts);
  }
  return Promise.resolve();
}

function _scan_move(node) {
  node = node || _get_current_node();
  var moveobj = _new_move_init(node)
  moveobj.steps.push(_move_sub_highlight.bind(node))
  moveobj.steps.push(_move_sub_speak2.bind(node, 'cue'))
  moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move", {
    detail: {
      node: node
    }
  }));
  moveobj.steps.push();
  return _before_new_move()
    .then(_new_move_start.bind(null, moveobj));
}

function _notify_move(node, notifynode, delay) {
  var moveobj = _new_move_init(node || notifynode)
  moveobj.steps.push(_move_sub_speak2.bind(notifynode, 'main'))
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
  if(delay > 0) {
    moveobj.steps.push(function() {
      return new Promise(function(resolve) { setTimeout(resolve, delay) })
    })
  }
  moveobj.steps.push(un_can_move)
  if(node) {
    moveobj.steps.push(_move_sub_speak2.bind(node, 'cue'))
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

function _get_node_attr_inherits_full(name) {
  for(var i = state.positions.length - 1; i >= 0; i--) {
    var pos = state.positions[i];
    if(pos.index == -1)
      continue;
    var node = pos.tree.nodes[pos.index],
        val = node.meta[name]
    if(val !== undefined && val != 'inherit') {
      return [ val, pos, node ];
    }
  }
  return null;
}
function _meta_true_check(v) {
  return v == 'true' || v == '';
}

function _will_go_in_or_out() {
  state._auto_next_rem_loops = config.auto_next_loops || 0
  if(state.mode == 'auto' && state.auto_next_dead)
    state.auto_next_start()
}

function _tree_go_out() {
  if(!state.can_move)
    return Promise.resolve();
  _will_go_in_or_out()
  if(state.positions.length > 1) {
    state.positions.pop();
  } else {
    // no more way, start at top (reset)
    state.positions[0].index = 0;
  }
  return _scan_move();
}

function _tree_go_in() {
  if(!state.can_move)
    return Promise.resolve();
  var tmp;
  var position = _get_current_position();
  if(position.index == -1) // not started yet, do nothing
    return Promise.resolve();
  _will_go_in_or_out()
  var atree = _get_current_node();
  if(atree.is_leaf) {
    // is leaf node, select
    // check for specific case

    // for edit_mode do nothing
    if(state.edit_mode)
      return Promise.resolve();
    
    // explicit finish check
    if(!_meta_true_check(atree.meta['onselect-finish'])) {
      // continue check
      tmp = _get_node_attr_inherits_full('onselect-continue-in-branch');
      if(tmp && _meta_true_check(tmp[0])) {
        // continue it
        var idx = state.positions.indexOf(tmp[1]);
        state.positions = state.positions.slice(0, idx + 1);
        state.positions.push({
          tree: tmp[2],
          index: 0
        });
        // concat check
        tmp = _get_node_attr_inherits_full('onselect-continue-concat');
        if(tmp) {
          if(!tmp[2]._continue_concat)
            tmp[2]._continue_concat = []
          tmp[2]._continue_concat.push(atree.text)
        }
        return _notify_move(_get_current_node(), atree);
      }
    }
    // finish it
    // on auto mode stop iteration and on any key restart
    return stop()
      .then(function() {
        if(atree.txt_dom_element)
          atree.txt_dom_element.classList.add('selected' || config.selected_class);

        // display continue-concat if any
        var popup = document.querySelector('#popup-message-wrp'),
            popup_mtext = popup ? popup.querySelector('.main-text') : null,
            popup_visible = false;
        tmp = _get_node_attr_inherits_full('onselect-continue-concat');
        if(tmp && tmp[2]._continue_concat) {
          if(popup && popup_mtext) {
            popup_mtext.textContent = tmp[2]._continue_concat.join(tmp[0])
            popup.classList.remove('hide');
            popup_visible = true; 
            setTimeout(function() {
              popup.classList.add('visible');
            }, 10);
          }
          delete tmp[2]._continue_concat;
        }
        // speak it
        return _move_sub_speak2
          .call(atree, 'main')
          .then(function() {
            // start again, on demand
            function finish() {
              if(popup_visible) {
                popup.classList.remove('visible');
                setTimeout(function() {
                  popup_mtext.textContent = "";
                  popup.classList.add('hide');
                }, 500); // wait for hide transition 
              }
              _clean_state()
              return start(); // start over
            }
            function clear() {
              if(atree.txt_dom_element)
                atree.txt_dom_element.classList.remove('selected' || config.selected_class);
              tmp = document.querySelector('#navbtns')
              if(tmp && config._onscreen_navigation) {
                tmp.removeEventListener('click', onscreen_nav_click, false)
              }
              window.removeEventListener('keydown', onkeydown, false);
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
            tmp = document.querySelector('#navbtns')
            if(tmp && config._onscreen_navigation) {
              tmp.addEventListener('click', onscreen_nav_click, false)
            }
            window.addEventListener('keydown', onkeydown, false);
          });
      });
  } else {
    if(atree.nodes.length == 0)
      return Promise.resolve(); // has no leaf, nothing to do
    state.positions.push({
      tree: atree,
      index: 0
    });
    var delay = state.mode == 'auto' ? config.auto_next_atfirst_delay || 0 : 0;
    return _notify_move(_get_current_node(), atree, delay);
  }
}
function _tree_move(node) {
  if(!state.can_move)
    return Promise.resolve();
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
  config._keyhit_delegates = {
    auto: keys_from_config('auto', {
      "39": { func: _tree_go_in }, // ArrowRight
      "37": { func: _tree_go_out }, // ArrowLeft
      "68": { func: _tree_go_in }, // D
      "65": { func: _tree_go_out }, // A
    }),
    'switch': keys_from_config('switch', {
      "39": { func: _tree_go_in }, // ArrowRight
      "37": { func: _tree_go_out }, // ArrowLeft
      "38": { func: _tree_go_previous }, // ArrowUp
      "40": { func: _tree_go_next }, // ArrowDown
      "87": { func: _tree_go_previous }, // W
      "68": { func: _tree_go_in }, // D
      "83": { func: _tree_go_next }, // S
      "65": { func: _tree_go_out }, // A
    })
  };
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

function load_tree(tree_element, fn) {
  if(typeof fn != 'string') {
    tree = fn;
    tree_element.innerText = "Tree given in config";
    return Promise.resolve();
  }
  return get_file_data(fn)
    .then(function(data) {
      var html_data = new showdown.Converter().makeHtml(data);
      html_data = sanitizeHtml(html_data, {
        allowedTags:
          sanitizeHtml.defaults.allowedTags.concat([ 'h1', 'h2', 'meta' ]),
        allowedAttributes:
           Object.assign({}, sanitizeHtml.defaults.allowedAttributes, {
             meta: [ 'data-*' ]
           })
      });
      tree_element.innerHTML = html_data;
      var tree = parse_dom_tree(tree_element);
      tree_element.innerHTML = ''; // clear all
      tree_mk_list_base(tree, tree_element); // re-create
      tree_element.tree_height = window.innerHeight;
      return tree;
    })
    .catch(handle_error_checkpoint());
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

function tree_to_markdown(tree) {
  var md_lines = [];
  _tree_to_markdown_subrout_node(tree, 0, md_lines);
  return md_lines.join("\r\n");
}
function _tree_to_markdown_subrout_meta_html(anode) {
  var tmp_meta = document.createElement('meta')
  var auditory_cue_in_text = anode._more_meta['auditory-cue-in-text'];
  var len = 0;
  for(var key in anode.meta) {
    if(anode.meta.hasOwnProperty(key) &&
       (!auditory_cue_in_text || key != 'auditory-cue')) {
      tmp_meta.setAttribute('data-' + key, anode.meta[key]);
      len++;
    }
  }
  if(len > 0) {
    var tmp2 = document.createElement('div');
    tmp2.appendChild(tmp_meta)
    return tmp2.innerHTML;
  }
  return null;
}
function _tree_to_markdown_subrout_node(node, level, md_lines) {
  var auditory_cue_in_text = node._more_meta['auditory-cue-in-text'],
      text = level > 0 ?
             (node.text +
              (auditory_cue_in_text ?
               '('+node.meta['auditory-cue']+')' : '')) : null,
      meta_html = _tree_to_markdown_subrout_meta_html(node);
  md_lines.push((text != null ? '#'.repeat(level) + ' ' + text : '') +
                (meta_html ? ' ' + meta_html : ''))
  md_lines.push("") // empty line
  if(!node.is_leaf) {
    _.each(node.nodes, function(anode) {
      _tree_to_markdown_subrout_node(anode, level + 1, md_lines);
    });
  }
    
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
