var config_fn, tree_fn, config, tree, state = null, tree_element, speaku,
    _is_software_keyboard_visible = false,
    tree_contentsize_xstep = 50;
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
    
    speaku = new SpeakUnit()
    return speaku.init()
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
    return load_config(config_fn)
      .then(function(_config) { config = _config; });
  })
  .then(function() {
    // have config, load tree
    tree_element = document.querySelector('#tree')
    if(!tree_element)
      return Promise.reject(new Error("Cannot find #tree element"));
    tree_fn = config.tree || tree_fn
    return load_tree(tree_element, tree_fn)
      .then(function(_tree) { tree = _tree; });
  })
  .then(function() {
    // set tree font-size
    if(config.tree_content_size_percentage)
      _tree_set_contentsize(config.tree_content_size_percentage)
    // set theme class
    if(config.theme)
      document.body.classList.add('theme-' + config.theme);
    // prepare onscreen_navigation -> boolean
    // theinput thing, iOS needs this
    return new Promise(function(resolve, reject) {
      if(keyevents_needs_theinput() && speaku && speaku.api &&
         config.onscreen_navigation == 'auto') {
        config._theinput_enabled = true;
        keyevents_handle_theinput();
        setTimeout(function() { // give time to bring keyboard
          speaku.api.is_software_keyboard_visible()
            .then(function(issoft) {
              if(!('_onscreen_navigation' in config))
                config._onscreen_navigation = issoft;
              if(issoft) {
                keyevents_handle_theinput_off();
                config._theinput_enabled = false;
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
          config._theinput_enabled = true;
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

/* ios related */
document.addEventListener('touchmove', function(evt) {
  if(document.querySelector('html').classList.contains('ios')) {
    // prevent scrolling
    evt.preventDefault();
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
    _auto_next_rem_loops: config.auto_next_loops || 0,
    _stop_callbacks: []
  };
  if(_modes.indexOf(state.mode) == -1)
    throw new Error("Unknown mode " + state.mode);
  tree_element.addEventListener('x-mode-change', _on_mode_change, false);
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
  if(state.mode == 'auto') {
    _state.auto_next_start = auto_next
    _state.auto_next_dead = false
    auto_next();
  }
  if(state.positions[state.positions.length - 1].index != -1)
    _tree_position_update();
  else
    _update_active_positions();
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
}

function is_first_run(_state) {
  // check if the current cycle is the first one
  _state = _state || state
  return state._auto_next_rem_loops == config.auto_next_loops
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
  stop(state)
  tree_element.parentNode.replaceChild(snapshot.tree.dom_element, tree_element)
  tree_element = snapshot.tree.dom_element
  tree = snapshot.tree
  state.positions = snapshot.positions
  start(state)
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
      state._selected_node.content_element
        .removeChild(state._selected_node._edit_overlay)
      delete state._selected_node._edit_overlay
      delete state._selected_node
    }
  }
  if(restart) {
    stop()
    renew_state(state)
    start(state)
  }
  state.silent_mode = b
  state.mode = b ? 'switch' : config.mode || 'auto'
  delete state._changing_edit_mode;
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
    state._selected_node.content_element
      .removeChild(state._selected_node._edit_overlay)
    delete state._selected_node._edit_overlay
  }
  if(!node.content_element)
    return; // no good
  var edit_overlay = newEl('div');
  edit_overlay.innerHTML = document.querySelector('#node-edit-overlay').innerHTML
  edit_overlay.classList.add("node-edit-overlay");
  var inp_txt = edit_overlay.querySelector('[name=text]')
  if(inp_txt) {
    inp_txt.value = node.text
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
      node.text = inp_txt.value
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
      var anode = idx >= parent.nodes.length || !parent.nodes ||
          parent.nodes.length == 0 ? parent : parent.nodes[idx]
      _tree_move(anode) // is silent move
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
  _edit_mode_toggle(true, true)
  state._orig_snapshot = _take_snapshot()
}
function _on_edit_save() {
  var save_btn = document.querySelector('#edit-mode-save-btn'),
      cancel_btn = document.querySelector('#edit-mode-cancel-btn');
  save_btn.disabled = true;
  cancel_btn.disabled = true;
  // save
  var tree_md = tree_to_markdown(tree)
  set_file_data(tree_fn, tree_md)
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
      console.error(err)
      alert(err+'')
    });
}
function _on_edit_cancel() {
  _edit_mode_toggle(false);
  _restore_snapshot(state._orig_snapshot);
  delete state._orig_snapshot;
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
  _before_new_move();
  moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move", {
    detail: {
      node: node
    }
  }));
  return _new_move_start(moveobj);
}

function _notify_move(node, notifynode, delay) {
  var moveobj = _new_move_init(node || notifynode)
  moveobj.steps.push(_move_sub_speak2.bind(notifynode, 'main'))
  if(node) {
    moveobj.steps.push(function() {
      _before_new_move()
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
  var tmp;
  var position = _get_current_position();
  if(position.index == -1) // not started yet, do nothing
    return Promise.resolve();
  _will_go_in_or_out()
  var atree = _get_current_node();
  if(atree.is_leaf) {
    // is leaf node, select
    // check for specific case
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
    stop();
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
          start(); // start over
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
      if(!('can_edit' in config))
        config.can_edit = true;
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
