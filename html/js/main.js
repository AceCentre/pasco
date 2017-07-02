var config, tree, state = null, tree_element, speaku,
    _is_software_keyboard_visible = false;
Promise.all([
  window.cordova ? NativeAccessApi.onready() : Promise.resolve(),
  new Promise(function(resolve) { // domready
    document.addEventListener('DOMContentLoaded', function() {
      document.removeEventListener('DOMContentLoaded', arguments.callee, false);
      resolve();
    }, false);
  })
])
  .then(function() {
    // some hooks
    var el = document.querySelector('#debug-clear-storage')
    if(el) {
      el.addEventListener('click', function() {
        // for cordova
        if(window.cordova) {
          Promise.all([
            delete_file(default_config),
            delete_file(default_tree)
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
  .then(initialize_app)
  .then(function() {
    speaku = new SpeakUnit()
    return speaku.init()
  })
  .then(function() {
    return load_config(default_config)
      .then(function(_config) { config = _config; });
  })
  .then(function() {
    // have config, load tree
    tree_element = document.querySelector('#tree')
    if(!tree_element)
      return Promise.reject(new Error("Cannot find #tree element"));
    return load_tree(tree_element, config.tree || default_tree)
      .then(function(_tree) { tree = _tree; });
  })
  .then(function() {
    // prepare onscreen_navigation -> boolean
    // theinput thing, iOS needs this
    return new Promise(function(resolve, reject) {
      if(keyevents_needs_theinput() && speaku && speaku.api &&
         config.onscreen_navigation == 'auto') {
        keyevents_handle_theinput();
        setTimeout(function() { // give time to bring keyboard
          speaku.api.is_software_keyboard_visible()
            .then(function(issoft) {
              if(!('_onscreen_navigation' in config))
                config._onscreen_navigation = issoft;
              if(issoft) {
                keyevents_handle_theinput_off();
              }
              _is_software_keyboard_visible = issoft;
            })
            .then(resolve, reject);
        }, 1000);
      } else {
        // assuming keyboard is available, then auto is false
        if(!('_onscreen_navigation' in config))
          config._onscreen_navigation = config.onscreen_navigation == 'enable';
        if(keyevents_needs_theinput() && !config._onscreen_navigation) {
          keyevents_handle_theinput();
          setTimeout(function() {
            _update_software_keyboard().then(resolve, reject)
          }, 1000)
        } else {
          resolve()
        }
      }
    });
  })
  .then(function() {
    // deal with on-screen navigation
    var elem = document.querySelector('#navbtns-wrp');
    if(elem && config._onscreen_navigation) {
      elem.classList.add('navbtns-enable');
    }
  })
  .then(start)
  .catch(handle_error);

window.addEventListener('unload', function() {
  if(speaku && speaku.is_native && speaku.synthesizer) {
    speaku.api.release_synthesizer(speaku.synthesizer);
  }
}, false);

/* execution code start */

var _alt_voice_rate_by_name = { 'default': 1.0, 'max': 2.0, 'min': 0.5 },
    _modes = ['auto', 'switch'],
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
    };

window.addEventListener('keydown', function(ev) {
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
    _active_elements: [],
    _highlighted_elements: [],
    _auto_next_rem_loops: config.auto_next_loops || 0
  };
  if(_modes.indexOf(state.mode) == -1)
    throw new Error("Unknown mode " + state.mode);
  tree_element.addEventListener('x-mode-change', _on_mode_change, false);
  window.addEventListener('keydown', _on_keydown, false);
  window.addEventListener('resize', _tree_needs_resize, false);
  var tmp = document.querySelector('#navbtns')
  if(tmp && config._onscreen_navigation)
    tmp.addEventListener('click', _on_navbtns_click, false)
  if(state.mode == 'auto') {
    _state.auto_next_start = auto_next
    _state.auto_next_dead = false
    auto_next();
  }
  _update_active_positions();
  function auto_next() {
    if(_state._stopped)
      return; // stop the loop
    _state._active_timeout = setTimeout(function() {
      var position = _get_current_position();
      if(position.index == -1 && config.auto_next_atfirst_delay) {
        // delay auto_next for next entry
        delayrun(config.auto_next_atfirst_delay)
      } else if(position.index + 1 == position.tree.nodes.length) {
        // at re-cycle wait more
        if(Math.abs(--_state._auto_next_rem_loops) < 1) {
          // stop the loop
          _state.auto_next_dead = true
          return;
        }
        delayrun(config.auto_next_recycle_delay || 0)
      } else {
        run()
      }
    }, config.auto_next_delay || 500);
    function run() {
      if(_state._stopped)
        return; // stop the loop
      _state._active_timeout = null;
      if(_state._running_move != null) {
        _state._running_move.then(auto_next);
      } else {
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
        run();
      }
      tree_element.addEventListener("x-new-move", on_new_move, true);
      _state._active_timeout = setTimeout(function() {
        clearListener()
        run()
      }, delay);
    }
  }
}

/**
 * Stops the current control-flow if exists, makes it ready for next start
 */
function stop() {
  tree_element.removeEventListener('x-mode-change', _on_mode_change, false);
  if(state._next_keyup) {
    window.removeEventListener('keyup', state._next_keyup, false);
    state._next_keyup = null
  }
  window.removeEventListener('keydown', _on_keydown, false);
  window.removeEventListener('resize', _tree_needs_resize, false);
  var tmp = document.querySelector('#navbtns')
  if(tmp && config._onscreen_navigation)
    tmp.removeEventListener('click', _on_navbtns_click, false)
  _before_new_move(); // stop speech and highlights
  if(state._active_timeout) {
    clearTimeout(state._active_timeout);
    delete state._active_timeout;
  }
  state._stopped = true;
}

function _on_mode_change() {
  stop();
  state = renew_state(state)
  start(state);
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

function _update_software_keyboard() {
  if(speaku && speaku.api) {
    return speaku.api.is_software_keyboard_visible()
      .then(function(v) { _is_software_keyboard_visible = v; });
  }
  return Promise.resolve();
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
    _tree_go_out();
    break;
  case 'nav-rightbtn':
    _tree_go_in();
    break;
  }
}

function _on_keydown(down_ev) {
  curtime = new Date().getTime()
  if(config.ignore_second_hits_time > 0 && state._last_keydown_time &&
     curtime - state._last_keydown_time < config.ignore_second_hits_time) {
    return; // ignore second hit
  }
  state._last_keydown_time = curtime
  state._keydown_time = curtime
  var downcode = down_ev.charCode || down_ev.keyCode;
  _update_software_keyboard()
  // software keyboards do not trigger down/up at the correct time
  // simple fix, ignore it
  if(!config.ignore_key_release_time || _is_software_keyboard_visible) {
    // no need to wait for release
    _on_keyhit(down_ev);
  } else {
    // follow delegate rules
    var delegate = config._keyhit_delegates[state.mode][downcode+''];
    if(delegate) {
      if(delegate.preventDefault)
        down_ev.preventDefault();
    }
    if(state._next_keyup)
      window.removeEventListener('keyup', state._next_keyup, false);
    state._next_keyup = function(ev) {
      var upcode = ev.charCode || ev.keyCode;
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
  var code = ev.charCode || ev.keyCode;
  // look for delegate calls
  var delegate = config._keyhit_delegates[state.mode][code+''];
  if(delegate) {
    if(delegate.preventDefault)
      ev.preventDefault();
    var ret = delegate.func(ev);
    if(ret && ret.catch)
      ret.catch(handle_error);
  }
}

function _before_new_move() {
  speaku.stop_speaking();
  var el;
  while((el = state._highlighted_elements.pop()))
    el.classList.remove('highlight' || config.highlight_class);
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
    if(dom_elements.indexOf(ael) == -1) {
      ael.classList.remove('active');
      _state._active_elements.splice(i, 1);
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
  }
  _update_active_positions_topleft();
}

function _update_active_positions_topleft() {
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
  if(widthSum - window.innerWidth > 0) {
    tree_element.style.left = (-widthSum + window.innerWidth) + "px";
  } else {
    tree_element.style.left = 0;
  }
}

function _tree_needs_resize() {
  tree_element.tree_height = window.innerHeight;
  _update_active_positions_topleft();
}

function _move_sub_highlight() {
  var node = this
  if(node.txt_dom_element) {
    node.txt_dom_element.classList.add('highlight' || config.highlight_class);
    state._highlighted_elements.push(node.txt_dom_element);
  }
  _update_active_positions();
}

function _move_sub_speak(voice_options) {
  var node = this
  return speaku.start_speaking(node.text, voice_options)
    .then(function(hdl) {
      return speaku.speak_finish(hdl)
        .then(function() {
          return speaku.utterance_release(hdl);
        });
    });
}

function _scan_move(node) {
  node = node || _get_current_node();
  var moveobj = _new_move_init(node)
  moveobj.steps.push(_move_sub_highlight.bind(node))
  moveobj.steps.push(_move_sub_speak.bind(node, config.auditory_cue_voice_options))
  _before_new_move()
  moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move"));
  return _new_move_start(moveobj);
}

function _cue_move(node, cuenode, delay) {
  var moveobj = _new_move_init(node || cuenode)
  moveobj.steps.push(_move_sub_speak.bind(cuenode, config.auditory_main_voice_options))
  if(node) {
    moveobj.steps.push(function() {
      _before_new_move()
      moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move"));
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
    moveobj.steps.push(_move_sub_speak.bind(node, config.auditory_cue_voice_options))
  }
  speaku.stop_speaking();
  state.can_move = false;
  function un_can_move() {
    state.can_move = true;
  }
  return _new_move_start(moveobj)
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
  var position = _get_current_position();
  if(position.index == -1) // not started yet, do nothing
    return Promise.resolve();
  _will_go_in_or_out()
  var atree = _get_current_node();
  if(atree.is_leaf) {
    // is leaf node, select
    // check for specific case
    var tmp = _get_node_attr_inherits_full('onselect-restart-here');
    if(tmp && _meta_true_check(tmp[0])) {
      var idx = state.positions.indexOf(tmp[1]);
      state.positions = state.positions.slice(0, idx + 1);
      state.positions.push({
        tree: tmp[2],
        index: 0
      });
      return _cue_move(_get_current_node(), atree);
    } else {
      // on auto mode stop iteration and on any key restart
      stop();
      if(atree.txt_dom_element)
        atree.txt_dom_element.classList.add('selected' || config.selected_class);
      // speak it
      return speaku.start_speaking(atree.text, config.auditory_main_voice_options)
        .then(function(hdl) {
          return speaku.speak_finish(hdl).then(function() {
            return speaku.utterance_release(hdl);
          });
        })
        .then(function() {
          // start again, on demand
          window.addEventListener('keydown', function(ev) {
            if(atree.txt_dom_element)
              atree.txt_dom_element.classList.remove('selected' || config.selected_class);
            ev.preventDefault();
            window.removeEventListener('keydown', arguments.callee, false);
            _clean_state(state)
            start(); // start over
          }, false);
        });
    }
  } else {
    if(atree.nodes.length == 0)
      return Promise.resolve(); // has no leaf, nothing to do
    state.positions.push({
      tree: atree,
      index: 0
    });
    var delay = state.mode == 'auto' ? config.auto_next_atfirst_delay || 0 : 0;
    return _cue_move(_get_current_node(), atree, delay);
  }
}
function _tree_go_previous() {
  if(!state.can_move)
    return Promise.resolve();
  var position = _get_current_position();
  position.index -= 1;
  if(position.index < 0) {
    position.index = (position.tree.nodes.length + position.index) %
      position.tree.nodes.length;
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


function load_config(fn) {
  // ready to start, load config
  return get_file_json(fn)
    .then(function(config) {
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
      return config;
    })
    .catch(handle_error_checkpoint());
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
          sanitizeHtml.defaults.allowedTags.concat([ 'h1', 'h2' ]),
        selfClosing:
          sanitizeHtml.defaults.selfClosing.concat([ 'meta' ]),
        allowedAttributes:
           Object.assign({}, sanitizeHtml.defaults.allowedAttributes, {
             meta: [ 'data-*' ]
           })
      });
      tree_element.innerHTML = html_data;
      var tree = parse_dom_tree(tree_element);
      tree_element.innerHTML = ''; // clear all
      tree_mk_list_base(tree, tree_element, 'dom_element', 'txt_dom_element'); // re-create
      tree_element.tree_height = window.innerHeight;
      return tree;
    })
    .catch(handle_error_checkpoint());
}

function clear_config(config) {
  // remove previous config
  if(config) {
    for(var i = 0, len = config._styles.length; i < len; ++i) {
      document.body.removeChild(config._styles[i]);
    }
  }
}
