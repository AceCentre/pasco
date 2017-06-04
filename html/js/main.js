var newEl = document.createElement.bind(document);
var default_config = 'config.json', default_tree = 'tree.md', config, tree,
    state = null, tree_element, speak_ctx;
Promise.all([
  NativeAccessApi.onready(),
  new Promise(function(resolve) { // domready
    document.addEventListener('DOMContentLoaded', function() {
      document.removeEventListener('DOMContentLoaded', arguments.callee, false);
      if(_needs_theinput())
        _handle_theinput();
      resolve();
    }, false);
  })
])
  .then(init_speak)
  .then(function() { return load_config(default_config); })
  .then(function() { return load_tree(config.tree || default_tree) })
  .then(start)
  .catch(handle_error);

// Cordova specific
window.addEventListener('deviceready', function() { 
  if(window.device) {
    document.querySelector('html').classList
      .add(window.device.platform.toLowerCase());
  }
});

window.addEventListener('unload', function() {
  if(speak_ctx && speak_ctx.is_native && speak_ctx.synthesizer) {
    speak_ctx.api.release_synthesizer(speak_ctx.synthesizer);
  }
}, false);

/* execution code start */

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
var _alt_voice_rate_by_name = { 'default': 1.0, 'max': 2.0, 'min': 0.5 },
    _modes = ['auto', 'switch'],
    _all_delegates = {
      "tree_go_in": _tree_go_in, "tree_go_out": _tree_go_out,
      "tree_go_previous": _tree_go_previous, "tree_go_next": _tree_go_next,
    },
    _debug_keys = {
      80: { func: function() { // P (toggle play)
        if(state._stopped) {
          state = renzew_state(state)
          start(state);
        } else {
          stop();
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
    _highlighted_elements: []
  };
  if(_modes.indexOf(state.mode) == -1)
    throw new Error("Unknown mode " + state.mode);
  tree_element.addEventListener('x-mode-change', _on_mode_change, false);
  window.addEventListener('keydown', _on_keyhit, false);
  window.addEventListener('resize', _tree_needs_resize, false);
  if(state.mode == 'auto') {
    auto_next();
  }
  _update_active_positions();
  function auto_next() {
    if(_state._stopped)
      return; // stop the loop
    _state._active_timeout = setTimeout(function() {
      var position = _get_current_position();
      if(position.index + 1 == position.tree.nodes.length) {
        // at re-cycle wait more
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
        }, config.auto_next_recycle_delay || 5000);
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
  }
}

/**
 * Stops the current control-flow if exists, makes it ready for next start
 */
function stop() {
  tree_element.removeEventListener('x-mode-change', _on_mode_change, false);
  window.removeEventListener('keydown', _on_keyhit, false);
  window.removeEventListener('resize', _tree_needs_resize, false);
  _before_new_move(); // stop speech and highlights
  if(state._active_timeout) {
    clearTimeout(state._active_timeout);
    delete state._active_timeout;
  }
  state._stopped = true;
  var theinput = document.getElementById('theinput');
  if(theinput && _needs_theinput()) {
    theinput.removeEventListener('blur', _theinput_refocus, false);
  }
}

function _on_mode_change() {
  stop();
  state = renew_state(state)
  start(state);
}
function _theinput_refocus() {
  var theinput = this;
  setTimeout(function() {
    theinput.focus();
  }, 100);
}

function renew_state(_state) {
  _state = Object.assign({}, _state); // copy own props
  delete _state._stopped;
  return _state;
}

function _clean_state(_state) {
  _update_active_positions(_state, []);
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
  stop_speaking();
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
        running_move = state._running_move = promise
          .then(function() {
            if(running_move == state._running_move)
              state._running_move = null;
          })
          .then(retResolve, retReject);
        resolve();
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
  _update_active_positions_top();
}

function _update_active_positions_top() {
  // center all
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
  }
}

function _tree_needs_resize() {
  tree_element.tree_height = window.innerHeight;
  _update_active_positions_top();
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
  return start_speaking(node.text, voice_options)
    .then(function(hdl) {
      return speak_finish(hdl)
        .then(function() {
          return utterance_release(hdl);
        });
    });
}

function _scan_move(node) {
  node = node || _get_current_node();
  var moveobj = _new_move_init(node)
  moveobj.steps.push(_move_sub_highlight.bind(node))
  moveobj.steps.push(_move_sub_speak.bind(node, config.auditory_voice_options))
  _before_new_move()
  moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move"));
  return _new_move_start(moveobj);
}

function _cue_move(node, cuenode) {
  var moveobj = _new_move_init(node)
  moveobj.steps.push(_move_sub_speak.bind(cuenode, config.auditory_cue_voice_options))
  moveobj.steps.push(un_can_move)
  if(node) {
    moveobj.steps.push(function() {
      _before_new_move()
      moveobj.node.dom_element.dispatchEvent(new CustomEvent("x-new-move"));
    });
    moveobj.steps.push(_move_sub_highlight.bind(node))
    moveobj.steps.push(_move_sub_speak.bind(node, config.auditory_voice_options))
  }
  stop_speaking();
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
    if(val && val != 'inherit') {
      return [ val, pos, node ];
    }
  }
  return null;
}

function _tree_go_out() {
  if(!state.can_move)
    return Promise.resolve();
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
  var atree = _get_current_node();
  if(atree.is_leaf) {
    // is leaf node, select
    // check for specific case
    var tmp = _get_node_attr_inherits_full('onselect-restart-here');
    if(tmp && tmp[0] == 'true') {
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
      return start_speaking(atree.text, config.auditory_cue_voice_options)
        .then(function(hdl) {
          return speak_finish(hdl).then(function() {
            return utterance_release(hdl);
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
    return _cue_move(_get_current_node(), atree);
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

function init_speak() {
  var api = new NativeAccessApi();
  return Promise.all([
    api.has_synthesizer(),
    api.has_audio_device()
  ])
    .then(function(results) {
      if(results[0] && results[1]) {
        speak_ctx = {
          is_native: true,
          api: api
        };
        return speak_ctx.api.init_synthesizer()
          .then(function(synthesizer) {
            speak_ctx.synthesizer = synthesizer;
          })
      } else { // alternative approach
        return new Promise(function(resolve, reject) {
          var script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          script.onload = function() {
            try {
              speak_ctx = {
                is_native: false,
                responsiveVoice: responsiveVoice
              };
              if(responsiveVoice.voiceSupport()) {
                resolve();
              } else {
                reject("No supported speaker found!");
              }
            } catch(err) {
              reject(err);
            }
          };
          script.onerror = function() {
            reject("Could not load responsivevoice code");
          };
          script.src = "http://code.responsivevoice.org/responsivevoice.js";
          document.body.appendChild(script);
        });
      }
    });
}

var _alt_finish_queue = [];

function start_speaking(speech, opts) {
  opts = Object.assign({}, opts)
  if(speak_ctx.is_native) {
    for(var key in opts)
      if(key.indexOf('alt_') == 0)
        delete opts[key];
    return speak_ctx.api.init_utterance(speech)
      .then(function(utterance) {
        return speak_ctx.api.speak_utterance(speak_ctx.synthesizer, utterance)
          .then(function(){ return utterance; });
      });
  } else {
    for(var key in opts)
      if(key.indexOf('alt_') == 0) {
        opts[key.substr(4)] = opts[key]
        delete opts[key];
      }
    if(opts.rate) {
      if(opts.rate in _alt_voice_rate_by_name)
        opts.rate = _alt_voice_rate_by_name[opts.rate]
      opts.rate = opts.rate * (opts.rateMul || 1.0)
    }
    delete opts.rateMul
    var voiceId = opts.voiceId;
    delete opts.voiceId;
    speak_ctx.responsiveVoice.speak(speech, voiceId, opts);
    return Promise.resolve(1);
  }
}

function utterance_release(utterance_hdl) {
  if(speak_ctx.is_native) {
    return speak_ctx.api.release_utterance(utterance_hdl);
  } else {
    return Promise.resolve();
  }
}

function speak_finish(utterance_hdl) {
  if(speak_ctx.is_native) {
    return speak_ctx.api.speak_finish(speak_ctx.synthesizer, utterance_hdl);
  } else {
    return new Promise(function(resolve, reject) {
      var ref = [null, resolve];
      _alt_finish_queue.push(ref)
      function check() {
        ref[0] = setTimeout(function() {
          if(speak_ctx.responsiveVoice.isPlaying())
            check();
          else {
            var idx = _alt_finish_queue.indexOf(ref);
            if(idx != -1)
              _alt_finish_queue.splice(idx, 1);
            resolve();
          }
        }, 50); // check resolution
      }
      check();
    });
  }
}

function stop_speaking() {
  if(speak_ctx.is_native) {
    return speak_ctx.api.stop_speaking(speak_ctx.synthesizer);
  } else {
    responsiveVoice.cancel();
    var call_list = [];
    var ref;
    while((ref = _alt_finish_queue.pop())) {
      clearTimeout(ref[0]);
      call_list.push(ref[1]);
    }
    for(var i = 0, len = call_list.length; i < len; ++i)
      call_list[i]();
    return Promise.resolve();
  }
}

function load_tree(fn) {
  // have config, load tree
  tree_element = document.querySelector('#tree')
  if(!tree_element)
    return Promise.reject(new Error("Cannot find #tree element"));
  if(typeof fn != 'string') {
    tree = fn;
    tree_element.innerText = "Tree given in config";
    return Promise.resolve();
  }
  return ajaxcall(fn)
    .then(function(data) {
      tree_element.innerHTML = new showdown.Converter().makeHtml(data);
      tree = parse_dom_tree(tree_element);
      tree_element.innerHTML = ''; // clear all
      tree_mk_list_base(tree, tree_element, 'dom_element', 'txt_dom_element'); // re-create
      tree_element.tree_height = window.innerHeight;
    })
    .catch(handle_error_checkpoint());
}

function load_config(fn) {
  // ready to start, load config
  return ajaxcall(fn)
    .then(function(data) {
      // remove previous config
      if(config) {
        for(var i = 0, len = config._styles.length; i < len; ++i) {
          document.body.removeChild(config._styles[i]);
        }
      }  
      config = JSON.parse(data);
      if(!config)
        throw new Error("No input config!");
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
    })
    .catch(handle_error_checkpoint());
}

function tree_mk_list_base(tree, el, linkname, txtlinkname) {
  tree[linkname] = el;
  el.classList.add('level-' + tree.level);
  if(tree.is_leaf) {
    el.classList.add('leaf')
  } else {
    el.classList.add('node')
  }
  if(tree.text) {
    var txtel = newEl('p');
    txtel.classList.add('text');
    txtel.textContent = tree.text;
    el.appendChild(txtel);
    tree[txtlinkname] = txtel;
  }
  if(!tree.is_leaf) {
    var nodes = tree.nodes,
        ul = newEl('ul');
    ul.classList.add('children');
    for(var i = 0, len = nodes.length; i < len; ++i) {
      var node = nodes[i],
          li = newEl('li');
      tree_mk_list_base(node, li, linkname, txtlinkname);
      ul.appendChild(li);
    }
    el.appendChild(ul);
  }
}

var _parse_dom_tree_pttrn01 = /^H([0-9])$/,
    _parse_dom_tree_pttrn02 = /^LI$/;
function parse_dom_tree(el, continue_at, tree) {
  continue_at = continue_at || { i: 0 };
  tree = tree || { level: 0, meta: {} };
  tree.nodes = tree.nodes || [];
  for(var len = el.childNodes.length; continue_at.i < len; ++continue_at.i) {
    var cnode = el.childNodes[continue_at.i],
        match;
    if(cnode.nodeType == Node.ELEMENT_NODE) {
      if((match = cnode.nodeName.match(_parse_dom_tree_pttrn01)) ||
         _parse_dom_tree_pttrn02.test(cnode.nodeName)) { // branch
          var level = match ? parseInt(match[1]) : tree.level + 1,
              is_list = !match;
        if(level > tree.level) {
          var txt_dom_el = is_list ? cnode.querySelector(":scope > p") : cnode;
          if(!txt_dom_el)
            txt_dom_el = cnode;
          var anode = {
            txt_dom_element: txt_dom_el,
            dom_element: cnode,
            level: level,
            text: txt_dom_el.textContent.trim(),
            meta: {}
          };
          if(is_list) {
            tree.nodes.push(parse_dom_tree(cnode, null, anode));
          } else {
            continue_at.i += 1;
            tree.nodes.push(parse_dom_tree(el, continue_at, anode));
          }
          if(anode.nodes.length == 0) { // is a leaf
            anode.is_leaf = true;
            delete anode.nodes;
          }
        } else {
          if(continue_at.i > 0)
            continue_at.i -= 1;
          break; // return to parent call
        }
      } if(cnode.nodeName == 'META') {
        var thenode = tree.nodes.length > 0 ?
                      tree.nodes[tree.nodes.length - 1] : tree;
        for(var i = 0, len = cnode.attributes.length; i < len; ++i) {
          var attr = cnode.attributes[i];
          if(attr.name.indexOf('data-') == 0) {
            thenode.meta[attr.name.substr(5)] =
              attr.value === "" ? 'true' : attr.value;
          }
        }
      } else { // go deeper
        parse_dom_tree(cnode, null, tree);
      }
    }
  }
  return tree;
}

function handle_error_checkpoint() {
  var stack = new Error().stack;
  return function(err) {
    if(err.withcheckpoint)
      throw err;
    throw {
      withcheckpoint: true,
      checkpoint_stack: stack.split("\n").slice(2).join("\n"),
      error: err
    };
  }
}

function handle_error(err) {
  if(err.withcheckpoint) {
    console.error("checkpoint:", err.checkpoint_stack);
    alert(err.error+'');
    console.error(err.error)
    throw err.error;
  } else {
    alert(err);
    console.error(err);
    throw err;
  }
}

function ajaxcall(url, options) {
  return new Promise(function(resolve, reject) {
    options = options || {};
    if(!/^(https?):\/\//.test(url) && window.cordova &&
       window.resolveLocalFileSystemURL) {
      var newurl = cordova.file.applicationDirectory + "www/" + url
      function onSuccess(fileEntry) {
        fileEntry.file(function(file) {
          var reader = new FileReader();

          reader.onloadend = function(e) {
            resolve(this.result)
          }

          reader.readAsText(file);
        });

      }
      function onFail(err) {
        reject("Fail to load `" + newurl + "` -- " + err+'')
      }
      window.resolveLocalFileSystemURL(newurl, onSuccess, onFail);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open(options.method || 'GET', url);
      xhr.onreadystatechange = function() {
        if(xhr.readyState === XMLHttpRequest.DONE) {
          if(xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText)
          } else {
            var err = new Error(xhr.statusText || 'unknown status ' + xhr.satus);
            err.xhr = xhr;
            reject(err)
          }
        }
      }
      xhr.send(options.data || null);
    }
  });
}

function _needs_theinput() {
  return /iP(hone|od|ad)/.test(navigator.userAgent);
}

function _handle_theinput() {
  var theinputwrp = document.getElementById('theinput-wrp');
  var theinput = document.getElementById('theinput');
  function preventdefault(evt) {
    evt.preventDefault();
  }
  if(theinput) {
    theinput.addEventListener('blur', _theinput_refocus, false);
    theinput.focus();
    theinput.addEventListener('keydown', preventdefault, false);
    theinput.addEventListener('keyup', preventdefault, false);
    document.addEventListener('scroll', function() {
      theinputwrp.style.top = window.scrollY + 'px';
      theinputwrp.style.left = window.scrollX + 'px';
    }, false);
  }
}
