// assume zipjs, underscore and core.js is included
import path from "path";
let _ = window._;
let zip = window.zip;
let sound_extmime_map = {
  ".wav": "audio/vnd.wav",
  ".mp3": "audio/mpeg",
  ".m3u": "audio/x-mpegurl",
  ".mp4": "audio/mp4",
};

// copied from main.js
function _meta_true_check(v, default_val) {
  if (v == null)
    return default_val;
  return v === 'true' || v === '';
}

function generate_boards_from_tree (tree, options, export_files, boards, state) {
  let ext_spell_branch = false;
  if (_meta_true_check(tree.meta['spell-branch'], false)) {
    state.inspellbranch = true;
    ext_spell_branch = true;
  }
  let btn_nextid = 1;
  let boardid = state.nextid+"";
  state.nextid++;
  let sounds = [];
  let buttons = _.filter(
    _.map(tree.static_nodes || tree.nodes, (anode) => {
      if (anode.meta['dyn']) { // dyn is not supported
        return null;
      }
      let btnid = btn_nextid+"";
      btn_nextid++;
      var ret = {
        "id": btnid,
        "label":  anode.text
      }
      if (anode.meta['auditory-cue']) {
        ret.vocalization = anode.meta['auditory-cue'];
      }
      let asound_path = anode.meta['main-audio'] || anode.meta['audio'] || anode.meta['cue-audio'];
      if (asound_path) {
        let sound = _.find(sounds, (a) => a.path == asound_path)
        if (!sound) {
          let eitem = _.find(export_files, (a) => a.newval == asound_path)
          if (eitem) {
            sound = {
              "id": (sounds.length+1)+"",
              "path": eitem.newval,
              "content_type": sound_extmime_map[path.extname(asound_path)] || "application/octet-stream",
            };
            sounds.push(sound);
          }
        }
        if (sound) {
          ret.sound_id = sound.id;
        }
      }
      if (anode.is_leaf) {
        // check for spelling meta and add to state
        let meta_to_actions = [
          { boolmeta: 'spell-delchar', actions: [":backspace"] },
          { boolmeta: 'spell-finish', actions: [":speak"],
            actions: [ ":speak", ":clear", ":home" ] },
          { meta: 'spell-letter', metaeq: ' ', actions: [":space"] },
        ];
        for (let m2a of meta_to_actions) {
          if ((anode.meta[m2a.meta] &&
               (m2a.metaeq || anode.meta[m2a.meta] == m2a.metaeq)) ||
              (m2a.boolmeta != null &&
               _meta_true_check(anode.meta[m2a.boolmeta], false))) {
            // ret.action = m2a.action;
            if (m2a.actions) {
              ret.actions = m2a.actions;
            }
            break;
          }
        }
        if (!ret.actions && state.inspellbranch) {
          ret.actions = [ "+" + (anode.meta['spell-word'] || anode.meta['spell-letter'] || anode.text) ];
          if (anode.meta['spell-word']) {
            ret.actions.push(":space");
          }
        }
      } else {
        let inner_state = _.extend({}, state);
        let aboard = generate_boards_from_tree(anode, options, export_files, boards, inner_state);
        state.nextid = inner_state.nextid;
        ret.load_board = {
          "name": aboard.name,
          "path": "boards/" + aboard.id + ".obf",
        };
      }
      return ret;
    }),
    (a) => !!a
  );
  let row_len = options.row_len, col_len = options.col_len;
  if (!row_len && !col_len) {
    row_len = 1;
    col_len = buttons.length;
  } else if (col_len > 0) {
    row_len = Math.ceil(buttons.length / col_len);
  } else if (row_len > 0) {
    col_len = Math.ceil(buttons.length / row_len);
  }
  let order = [];
  for (let y = 0; y < row_len; y++) {
    let order_row = [];
    for (let x = 0; x < col_len; x++) {
      if (y * col_len + x < buttons.length) {
        let button = buttons[y * col_len + x]
        order_row.push(button.id)
      } else {
        order_row.push(null)
      }
    }
    order.push(order_row);
  }
  let board = {
    "format": "open-board-0.1",
    "id": boardid,
    "locale": options.locale || "en",
    "name": tree.text,
    // "description_html": "",
    "buttons": buttons,
    "images": [],
    "grid": {
      "rows": row_len,
      "columns": col_len,
      "order": order,
    },
    "sounds": sounds,
  };
  if (ext_spell_branch) {
    board.ext_spell_branch = true;
  }
  boards.push(board);
  return board;
}

async function zipwriter_copy (writer, src, dest) {
  let blob = await get_file_data(src, { responseType: 'blob' })
  return await writer.add_promise(dest, new zip.BlobReader(blob));
}

// adds promisify for adding a file
function zip_create_writer (blobWriter) {
  return new Promise((resolve, reject) => {
    let started = false, add_reject = null, add_promise = Promise.resolve();
    try {
	    zip.createWriter(blobWriter, function(writer) {
        writer.add_promise = (a, b) => {
          return add_promise = add_promise
            .then(() => {
              return new Promise((resolve, reject) => {
                let _resolve = () => {
                  add_reject = null;
                  resolve();
                };
                add_reject = reject;
                writer.add(a, b, _resolve);
              });
            });
        };
        resolve(writer);
        started = true;
      }, onerror);
    } catch (err) {
      reject(err);
    }
    function onerror (err) {
      if (!started) {
        reject(err);
      } else if(add_reject) {
        add_reject(err);
      }
    }
  });
}

// assume zipjs is included as script tag
export async function pasco_export_obf (treefn, options) {
  options = options || {};
  let ptree_info = await prepare_tree(treefn);
  let tree_data = await get_file_data(ptree_info.tree_fn);
  let elm = newEl('div'), export_files = [],
      parts = ptree_info.tree_fn.split('/'),
      basename = parts[parts.length - 1];
  let tree = parse_tree(elm, tree_data);
  tree_export_prepare(ptree_info, tree, export_files);
  let boards = [];
  let rootboard = generate_boards_from_tree(tree, options, export_files, boards, { nextid: 1 });
  // manifest.json
  let manifest = {
    "format": "open-board-0.1",
    "root": "boards/" + rootboard.id + ".obf",
    "paths": {
      "boards": _.object(_.map(boards, (a) => [ a.id, "boards/" + a.id + ".obf" ])),
    },
  };
  let writer = await zip_create_writer(new zip.BlobWriter());
  let actions = [];
  let blob = new Blob([JSON.stringify(manifest, null, 2)], {type : 'application/json'});
  actions.push(()=>writer.add_promise("manifest.json", new zip.BlobReader(blob)));
  actions = actions.concat(_.map(boards, (board) => {
    return () => {
      let blob = new Blob([JSON.stringify(board, null, 2)], {type : 'application/json'});
      let dest = "boards/" + board.id + ".obf";
      return writer.add_promise(dest, new zip.BlobReader(blob));
    };
  }));
  actions = actions.concat(_.map(export_files, (eitem) => {
    return () => zipwriter_copy(writer, eitem.val, eitem.newval);
  }));
  try {
    let action;
    while ((action = actions.shift())) {
      await action();
    }
    let zipblob = await (new Promise((resolve, reject) => {
      writer.close((_blob) => resolve(_blob));
    }));
    writer = null;
    return zipblob;
  } finally {
    if (writer) {
      try {
        writer.close();
      } catch (err) { }
    }
  }
}

function zipentry_save_file (entry, dest) {
  return new Promise((resolve, reject) => {
    entry.getData(new zip.BlobWriter('application/octet-stream'), (blob) => {
      set_file_data(dest, blob).then(resolve, reject);
    });
  });
}

function zipentry_get_text (entry) {
  return new Promise((resolve, reject) => {
    entry.getData(new zip.BlobWriter('application/octet-stream'), (blob) => {
      var reader = new FileReader();
      reader.addEventListener("loadend", function() {
        resolve(reader.result);
      });
      reader.readAsText(blob)
    });
  });
}

async function zipentry_get_board (entry, fn) {
  if (!entry) {
    throw new ImportError(fn + " does not exists in zip file!");
  }
  let board;
  try {
    board = JSON.parse((await zipentry_get_text(entry)));
  } catch (err) {
    throw new ImportError("Could not load board: " + entry.filename);
  }
  if (board.format != "open-board-0.1") {
    throw new ImportError("json file is not a board(obf): " + fn);
  }
  return board;
}

class ImportError extends Error {
}

async function obz_import_tree (tree, board, getboard, state) {
  if (board.ext_spell_branch) {
    tree.meta['spell-branch'] = true;
    state.inspellbranch = true;
  }
  let soundsbyid = _.object(_.map(board.sounds||[], (a) => [ a.id, a ]));
  let buttons = board.buttons;
  let nodes = [];
  if (board.grid && board.grid.sort && board.grid.sort[0]) {
    let nodesbyid = _.object(_.map(buttons, (a) => [ a.id, a ]));
    nodes = _.filter(_.map(board.grid.sort[0], (id) => nodesbyid[id]), (a)=>!!a);
  }
  tree.static_nodes = (await Promise.all(_.map(buttons, async (button) => {
    let asound = button.sound_id ? soundsbyid[button.sound_id] : null;
    let anode = {
      level: tree.level + 1,
      text: button.label,
      meta: _.object(
        _.filter([ ['auditory-cue', button.vocalization],
                   ['audio', asound ? asound.path || asound.url : null] ],
                 (v) => !!v[1])
      ),
      _more_meta: {},
      parent: tree,
    };
    if (button.load_board) {
      let inner_board;
      if (button.load_board.path) {
        inner_board = await getboard("zippath", button.load_board.path)
      } else if (button.load_board.id) {
        inner_board = await getboard("id", button.load_board.id);
      } else if (button.load_board.url) {
        inner_board = await getboard("url", button.load_board.url);
      }
      if (inner_board && state.inboardids.indexOf(inner_board.id) == -1) {
        let inner_state = _.extend({}, state);
        inner_state.inboardids = [inner_board.id].concat(state.inboardids);
        await obz_import_tree(anode, inner_board, getboard, inner_state);
      }
    } else {
      if(state.inspellbranch) {
        // check for spelling meta and add to state
        let actions_to_meta = [
          { meta: 'spell-delchar', value: true, action: ":backspace" },
          { meta: 'spell-finish', value: true, action: ":speak" },
          { meta: 'spell-letter', value: ' ', action: ":space" },
        ];
        for (let a2m of actions_to_meta) {
          if (button.action == a2m.action) {
            anode.meta[a2m.meta] = a2m.value;
            break;
          }
        }
        // check for add to spell
        if (typeof button.action == 'string' && button.action.indexOf('+') == 0) {
          if (button.actions && button.actions[0] == button.action &&
              button.actions[1] == ":space") {
            anode.meta['spell-word'] = button.action.substr(1);
          } else if (button.action.length == 2) {
            if (button.action.substr(1) != anode.text) {
              anode.meta['spell-letter'] = button.action.substr(1);
            }
          }
        }
      }
    }
    return anode;
  })));
}

export async function pasco_import_obz (obzblob, treefn) {
	let [zipreader,entries] = await (new Promise((resolve, reject) => {
    zip.createReader(new zip.BlobReader(obzblob), (reader) => {
      reader.getEntries((entries) => resolve([reader,entries]));
    });
  }));
  var filesmap = _.object(_.map(entries, function (entry) {
    return [ entry.filename.replace(/^\//, ""), entry ];
  }));
  let manifest, boardsfn, rootfn;
  if (!filesmap["manifest.json"]) {
    throw new ImportError("manifest.json does not exists!");
  }
  try {
    manifest = JSON.parse((await zipentry_get_text(filesmap["manifest.json"])));
    rootfn = manifest.root;
    boardsfn = manifest.paths.boards;
    if (!rootfn || typeof boardsfn != 'object') {
      throw new Error("!rootfn or !boardsfn{}");
    }
  } catch (err) {
    console.error(err);
    throw new ImportError("Could not parse manifest.json");
  }
  let board = await zipentry_get_board(filesmap[rootfn], rootfn);
  async function getboard (source, value) {
    if (source == "id") {
      let fn = boardsfn[value];
      if (!fn) {
        throw new ImportError("No match file for board id: " + value);
      }
      return await zipentry_get_board(filesmap[fn], fn);
    } else if (source == "zippath") {
      if (!filesmap[value]) {
        throw new ImportError("No match board file in obz: " + value);
      }
      return await zipentry_get_board(filesmap[value], value);
    } else if (source == "url") {
      let board;
      try {
        board = JSON.parse((await get_file_data(value)));
      } catch (err) {
        throw new ImportError("Could not load board: " + value);
      }
      if (board.format != "open-board-0.1") {
        throw new ImportError("json file is not a board(obf): " + value);
      }
      return board;
    } else {
      throw new Error("Unknown source!");
    }
  }
  let tree = {
    level: 0,
    meta: {},
    _more_meta: {},
  };
  let ptree_info = await prepare_tree(treefn);
  // import tree data from boards
  await obz_import_tree(tree, board, getboard, {inboardids:[board.id]});
  // prepare import_list for saving (sound files)
  let import_list = [];
  tree_import_prepare(ptree_info, tree, import_list);
  // save tree .md file
  await set_file_data(ptree_info.tree_fn, tree_to_markdown(tree));
  let saved_list = [];
  let promises = _.map(import_list, async function (item) {
    var entry = filesmap[item.val];
    if(entry) {
      let entry_url = get_file_url(item.newval, treefn)
      await zipentry_save_file(entry, entry_url);
      saved_list.push(entry_url);
    }
  });
  try {
    await Promise.all(promises);
    return ptree_info.tree_fn;
  } catch (err) {
    try {
      await Promise.all(_.map(saved_list, (fn) => unset_file(fn)));
    } catch (err2) { }
    throw err;
  } finally {
    if (zipreader) {
      try {
        zipreader.close();
      } catch (err) { }
    }
  }
}
