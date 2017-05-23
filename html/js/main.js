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

var _modes = ['auto', 'switch'],
    _keyhit_delegates = {
      auto: {
        39: { preventDefault: true, func: _tree_go_in }, // ArrowRight
        37: { preventDefault: true, func: _tree_go_out }, // ArrowLeft
        68: { preventDefault: true, func: _tree_go_in }, // D
        65: { preventDefault: true, func: _tree_go_out }, // A
      },
      'switch': {
        39: { preventDefault: true, func: _tree_go_in }, // ArrowRight
        37: { preventDefault: true, func: _tree_go_out }, // ArrowLeft
        38: { preventDefault: true, func: _tree_go_previous }, // ArrowUp
        40: { preventDefault: true, func: _tree_go_next }, // ArrowDown
        87: { preventDefault: true, func: _tree_go_previous }, // W
        68: { preventDefault: true, func: _tree_go_in }, // D
        83: { preventDefault: true, func: _tree_go_next }, // S
        65: { preventDefault: true, func: _tree_go_out }, // A
      }
    };


function start(_state) {
  // start if _state is given acts as continue
  // modes [auto,switch]
  // diff, auto iterates through nodes <-> switch iteration is manual
  // mode controls the work flow, start handles mode
  if(tree.nodes.length == 0)
    throw new Error("Tree has zero length");
  state = _state = _state || {
    mode: config.mode || 'auto',
    positions: [ {
      tree: tree,
      index: -1
    } ],
    _highlighted_elements: []
  };
  if(_modes.indexOf(state.mode) == -1)
    throw new Error("Unknown mode " + state.mode);
  tree_element.addEventListener('x-mode-change', _on_mode_change, false);
  window.addEventListener('keydown', _on_keyhit, false);
  if(state.mode == 'auto') {
    auto_next();
  }
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

function _on_keyhit(ev) {
  var code = ev.charCode || ev.keyCode;
  // look for delegate calls
  var delegate = _keyhit_delegates[state.mode][code];
  if(delegate) {
    if(delegate.preventDefault)
      ev.preventDefault();
    var ret = delegate.func(ev);
    if(ret.catch)
      ret.catch(handle_error);
  }
}

function _before_new_move() {
  stop_speaking();
  var el;
  while((el = state._highlighted_elements.pop()))
    el.classList.remove('highlight' || config.highlight_class);
}

function _on_new_move(node) {
  node = node || _get_current_node();
  node.dom_element.classList.add('highlight' || config.highlight_class);
  if(node.dom_element.scrollIntoView)
    node.dom_element.scrollIntoView();
  state._highlighted_elements.push(node.dom_element);
  var running_move = state._running_move = start_speaking(node.text)
      .then(function(hdl) {
        return speak_finish(hdl)
          .then(function() {
            return utterance_release(hdl);
          });
      })
      .then(function() {
        if(running_move == state._running_move)
          state._running_move = null;
      });
  node.dom_element.dispatchEvent(new CustomEvent("x-new-move"));
  return running_move;
}

function _get_current_position() {
  try {
    return state.positions[state.positions.length - 1];
  } catch(err) {
    throw new Error("Could not get current tree, " + state.positions.length);
  }
}

function _get_current_node() {
  try {
    var position = _get_current_position(),
        node = position.tree.nodes[position.index];
    if(!node)
      throw new Error("Current node is null!, " +
                      state.positions.length + ", " +  position.index);
    return node;
  } catch(err) {
    throw new Error("Could not get current node, " + err);
  }
}

function _tree_go_out() {
  _before_new_move();
  if(state.positions.length > 1) {
    state.positions.pop();
  } else {
    // no more way, start at top (reset)
    state.positions[0].index = 0;
  }
  return _on_new_move();
}
function _tree_go_in() {
  var position = _get_current_position();
  if(position.index == -1) // not started yet, do nothing
    return Promise.resolve();
  var atree = _get_current_node();
  if(atree.is_leaf) {
    // is leaf node
    // on auto mode stop iteration and on any key restart
    stop();
    atree.dom_element.classList.add('selected' || config.selected_class);
    window.addEventListener('keydown', function(ev) {
      atree.dom_element.classList.remove('selected' || config.selected_class);
      ev.preventDefault();
      window.removeEventListener('keydown', arguments.callee, false);
      start(); // start over
    }, false);
    return Promise.resolve();
  } else {
    if(atree.nodes.length == 0)
      return Promise.resolve(); // has no leaf, nothing to do
    _before_new_move();
    state.positions.push({
      tree: atree,
      index: 0
    });
    return _on_new_move(); // first child!
  }
}
function _tree_go_previous() {
  _before_new_move();
  var position = _get_current_position();
  position.index -= 1;
  if(position.index < 0) {
    position.index = (position.tree.nodes.length + position.index) %
      position.tree.nodes.length;
  }
  return _on_new_move();
}
function _tree_go_next() {
  _before_new_move();
  var position = _get_current_position();
  position.index += 1;
  if(position.index >= position.tree.nodes.length) {
    position.index = position.index % position.tree.nodes.length;
  }
  return _on_new_move();
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
          });
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

function start_speaking(speech) {
  if(speak_ctx.is_native) {
    return speak_ctx.api.init_utterance(speech)
      .then(function(utterance) {
        return speak_ctx.api.speak_utterance(speak_ctx.synthesizer, utterance)
          .then(function(){ return utterance; });
      });
  } else {
    speak_ctx.responsiveVoice.speak(speech);
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
      tree_element.innerHTML = markdown.toHTML(data);
      tree = parse_dom_tree(tree_element);
    })
    .catch(handle_error_checkpoint());
}

function load_config(fn) {
  // ready to start, load config
  return ajaxcall(fn)
    .then(function(data) {
      config = JSON.parse(data);
      if(!config)
        throw new Error("No input config!");
    })
    .catch(handle_error_checkpoint());
}

var _parse_dom_tree_pttrn01 = /^H([0-9])$/,
    _parse_dom_tree_pttrn02 = /^LI$/;
function parse_dom_tree(el, continue_at, tree) {
  continue_at = continue_at || { i: 0 };
  tree = tree || { level: 0 };
  tree.nodes = tree.nodes || [];
  for(var len = el.childNodes.length; continue_at.i < len; ++continue_at.i) {
    var cnode = el.childNodes[continue_at.i],
        match;
    if((match = cnode.nodeName.match(_parse_dom_tree_pttrn01)) ||
       _parse_dom_tree_pttrn02.test(cnode.nodeName)) { // branch
      var level = match ? parseInt(match[1]) : tree.level + 1,
          is_list = !match;
      if(level > tree.level) {
        var dom_el = is_list ? cnode.querySelector(":scope > p") : cnode;
        if(!dom_el)
          dom_el = cnode;
        var anode = {
          dom_element: dom_el,
          level: level,
          text: dom_el.textContent.trim()
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
    } else { // go deeper
      parse_dom_tree(cnode, null, tree);
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
