
/** <Edit Mode> **/

function _edit_mode_toggle(b, restart) {
  if(state._changing_edit_mode)
    return; 
  state._changing_edit_mode = true;
  document.querySelector('#edit-config-btn')
    .classList[b?'add':'remove']('hide');
  document.querySelector('#help-btn')
    .classList[b?'add':'remove']('hide');
  document.querySelector('#edit-mode-btn')
    .classList[b?'add':'remove']('disabled');
  document.querySelector('#edit-mode-save-btn')
    .classList[!b?'add':'remove']('hide');
  document.querySelector('#edit-mode-cancel-btn')
    .classList[!b?'add':'remove']('hide');
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
      .then(function () {
        if (b) { // edit-mode
          if (speaku && speaku.is_native) {
            var audio_behavior = "playandrecord";
            speaku._last_audio_behavior = audio_behavior;
            return speaku.api.set_audio_behavior(audio_behavior);
          }
        }
      })
      .then(function() {
        state = renew_state(state)
        state.silent_mode = b
        state.mode = b ? 'switch' : config.mode || 'auto'
        state.edit_mode = b
        _tree_update_subdyn(tree, { disable_dyn: state.edit_mode });
        // check if positions are still valid
        validate_positions(state.positions);
        return start(state)
      });
  } else {
    state.silent_mode = b
    state.mode = b ? 'switch' : config.mode || 'auto'
    state.edit_mode = b
    promise = Promise.resolve();
  }
  return promise.then(function() {
    delete state._changing_edit_mode;
  });
  function validate_positions(positions) {
    for(var i = 0; i < positions.length; i++) {
      var apos = positions[i];
      if(apos.index >= apos.tree.nodes.length) {
        apos.index = apos.tree.nodes.length - 1;
        positions.splice(i + 1, positions.length - i - 1);
        break;
      }
    }
  }
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
    function onblur() {
      main_keyboard_turn_on();
    }
    function onfocus() {
      main_keyboard_turn_off();
    }
    inp_txt.addEventListener('blur', onblur, false);
    inp_txt.addEventListener('focus', onfocus, false);
    inp_txt.addEventListener('touchend', onfocus, false);
    inp_txt.addEventListener('mouseup', onfocus, false);
    inp_txt.addEventListener('input', function(evt) {
      var data = parse_dom_tree_subrout_parse_text(inp_txt.value);
      node.text = data.text;
      if(data.meta['auditory-cue'])
        node.meta['auditory-cue'] = data.meta['auditory-cue'];
      else
        delete node.meta['auditory-cue'];
      node._more_meta['auditory-cue-in-text'] = !!data._more_meta['auditory-cue-in-text'];
      if(node.txt_dom_element)
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
  var content_template,
      tmp = document.querySelector('#tree-node-template'),
      new_node_data = {
        text: 'New',
        meta: {},
        _more_meta: {},
      };
  if(tmp)
    content_template = _.template(tmp.innerHTML);
  else
    throw new Error("Could not found #tree-node-template");
  if(btn) {
    if(btn.classList.contains('add-node-before')) {
      var idx = node.parent.nodes.indexOf(node)
      if(idx == -1)
        throw new Error("Corrupt tree!");
      var new_node = tree_add_node(node.parent, idx,
                                   new_node_data, content_template);
      _tree_move(new_node) // is silent move
    } else if(btn.classList.contains('add-node-after')) {
      var idx = node.parent.nodes.indexOf(node)
      if(idx == -1)
        throw new Error("Corrupt tree!");
      var new_node = tree_add_node(node.parent, idx + 1,
                                   new_node_data, content_template);
      _tree_move(new_node) // is silent move
    } else if(btn.classList.contains('add-child-node')) {
      var new_node = tree_add_node(node, node.nodes ? node.nodes.length : null,
                                   new_node_data, content_template);
      _tree_move(new_node) // is silent move
    } else if(btn.classList.contains('remove-node')) {
      var idx = node.parent.nodes.indexOf(node)
      if(idx == -1)
        throw new Error("Corrupt tree!");
      var parent = node.parent;
      tree_remove_node_from_parent(node);
      // move to another node
      var anode = !parent.nodes || parent.nodes.length == 0 ? parent :
          (idx >= parent.nodes.length ?
           parent.nodes[parent.nodes.length-1] : parent.nodes[idx]);
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
function _on_edit_mode(evt) {
  if (!state || state._paused) {
    return
  }
  if(evt)
    evt.preventDefault();
  if(document.querySelector('#edit-mode-btn').classList.contains('disabled')) {
    return;
  }
  _edit_mode_toggle(true, true)
    .then(function() {
      state._orig_snapshot = _take_snapshot()
    });
}
function _on_edit_save(evt) {
  if (!state || state._paused) {
    return
  }
  if(evt)
    evt.preventDefault();
  var save_btn = document.querySelector('#edit-mode-save-btn'),
      cancel_btn = document.querySelector('#edit-mode-cancel-btn');
  save_btn.disabled = true;
  cancel_btn.disabled = true;
  // save
  editor_helper.on_save(tree)
    .then(function() {
      var tree_md = tree_to_markdown(tree)
      // update global variable tree_data
      tree_data = tree_md
      return set_file_data(tree_fn, tree_md)
    })
    .then(function () { return update_pasco_data_state() })
    .then(function() {
      // did save
      save_btn.disabled = false;
      cancel_btn.disabled = false;
      delete state._orig_snapshot;
      return _edit_mode_toggle(false, true);
    })
    .catch(function(err) {
      save_btn.disabled = false;
      cancel_btn.disabled = false;
      handle_error(err)
    });
}
function _on_edit_cancel(evt) {
  if (!state || state._paused) {
    return
  }
  if(evt)
    evt.preventDefault();
  if(!state._orig_snapshot)
    return;
  let tree = state._orig_snapshot.tree;
  editor_helper.on_restore(tree)
    .then(function() {
      // restore will stop => auto toggle off
      return _edit_mode_toggle(false, false);
    })
    .then(function() {
      return _restore_snapshot(state._orig_snapshot)
        .then(function() {
          delete state._orig_snapshot;
        });
    })
    .catch(handle_error);
}
function _take_snapshot() {
  var tree = state.positions[0].tree,
      new_tree = _clone_tree(tree),
      new_tree_elm = tree_element.cloneNode()
  tree_mk_list_base(new_tree, new_tree_elm); // re-create
  return {
    tree: new_tree,
    positions: _state_redefine_positions(state.positions, new_tree)
  };
}
function _restore_snapshot(snapshot) {
  return stop(state)
    .then(function() {
      state = renew_state(state)
      tree_element.parentNode.replaceChild(snapshot.tree.dom_element, tree_element)
      tree_element = snapshot.tree.dom_element
      tree = snapshot.tree
      state.positions = snapshot.positions
      return start(state)
    });
}
/** <Edit Mode/> **/
