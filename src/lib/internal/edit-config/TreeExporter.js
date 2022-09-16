import PascoNode from '../../PascoNode'
import PascoTreeMDWriter from '../../PascoTreeMDWriter'
import { fsFriendlyName } from '../../../helpers/common'
/* helpers/zip is a copy of static/zipjs/zip.js, It's not an ideal setup, It'd be better if It's replaced with a superior module. */
import zip from '../../../helpers/zip'

export default class TreeExporter {
  constructor (core) {
    this._core = core
    this._fmanager = core.getFileManager()
  }
  exportTreeToZipBlob (tree) {
    return new Promise((resolve, reject) => {
	    zip.createWriter(new zip.BlobWriter(), async (zipwriter) => {
        let didreject = false
        try {
          await this._exportTreeInZipSub0(zipwriter, tree)
        } catch (error) {
          didreject = true
          reject(error)
        } finally {
				  zipwriter.close((blob) => {
            if (!didreject) {
              resolve(blob)
            }
          })
        }
      })
    })
  }
  async _exportTreeInZipSub0 (zipwriter, tree) {
    let tree_url = tree.getTreeUrl()
    let basename
    { // set basename 
      let parts = tree_url.split('/')
      basename = parts[parts.length - 1]
    }
    let root_node = tree.initNodesFromTreeData()
    let export_list = []
    this._prepareTreeForExport(tree, root_node, export_list)
    for (let item of export_list) {
      try {
        let blob = await this._fmanager.loadFileData(this._core.resolveUrl(item.val, tree_url), { responseType: 'blob' })
        await this._zipAddBlobEntry(zipwriter, item.newval, blob)
      } catch (err) {
        // revert
        for (let change of item.changes) {
          change.node.meta[change.meta_name] = item.val
        }
        console.warn('Could not load for export ' + item.val, err)
      }
    }
    let tree_writer = new PascoTreeMDWriter()
    let tree_md = tree_writer.writeToText(root_node)
    // save modified tree
    await this._zipAddTextEntry(zipwriter, basename, tree_md)
  }

  // obf exporter
  exportTreeAsOBZBlob (tree, options) {
    return new Promise((resolve, reject) => {
	    zip.createWriter(new zip.BlobWriter(), async (zipwriter) => {
        let didreject = false
        try {
          await this._exportTreeAsOBZSub0(zipwriter, tree, options)
        } catch (error) {
          didreject = true
          reject(error)
        } finally {
				  zipwriter.close((blob) => {
            if (!didreject) {
              resolve(blob)
            }
          })
        }
      })
    })
  }
  async _exportTreeAsOBZSub0 (zipwriter, tree, options) {
    options = options || {};
    let tree_url = tree.getTreeUrl()
    let root_node = tree.initNodesFromTreeData()
    let export_list = []
    let basename
    {
      let parts = tree_url.split('/')
      basename = parts[parts.length - 1]
    }
    this._prepareTreeForExport(tree, root_node, export_list)
    let boards = []
    let rootboard = this._generateOBFBoards(root_node, options, export_list, boards, { nextid: 1 })
    // manifest.json
    let manifest = {
      "format": "open-board-0.1",
      "root": "boards/" + rootboard.id + ".obf",
      "paths": {
        "boards": Object.fromEntries(boards.map((a) => [ a.id, "boards/" + a.id + ".obf" ])),
      },
    }
    await this._zipAddTextEntry(zipwriter, "manifest.json", JSON.stringify(manifest, null, 2))
    for (let board of boards) {
      let dest = "boards/" + board.id + ".obf"
      await this._zipAddTextEntry(zipwriter, dest, JSON.stringify(board, null, 2))
    }
    for (let item of export_list) {
      try {
        let blob = await this._fmanager.loadFileData(this._core.resolveUrl(item.val, tree_url), { responseType: 'blob' })
        await this._zipAddBlobEntry(zipwriter, item.newval, blob)
      } catch (err) {
        // revert
        for (let change of item.changes) {
          change.node.meta[change.meta_name] = item.val
        }
        console.warn('Could not load for export ' + item.val, err)
      }
    }
  }
  _generateOBFBoards (node, options, export_list, boards, state) {
    let sound_extmime_map = {
      ".wav": "audio/vnd.wav",
      ".mp3": "audio/mpeg",
      ".m3u": "audio/x-mpegurl",
      ".mp4": "audio/mp4",
    }
    let ext_spell_branch = false
    if (node.readMetaAsBoolean('spell-branch', false)) {
      state.inspellbranch = true
      ext_spell_branch = true
    }
    let btn_nextid = 1
    let boardid = state.nextid+""
    state.nextid++
    let sounds = []
    let buttons = (node.child_nodes||[])
        .map((anode) => {
          if (anode.meta['dyn']) { // dyn is not supported
            return null
          }
          let btnid = btn_nextid+""
          btn_nextid++
          var ret = {
            "id": btnid,
            "label":  anode.text
          }
          if (anode.meta['auditory-cue']) {
            ret.vocalization = anode.meta['auditory-cue']
          }
          let asound_path = anode.meta['main-audio'] || anode.meta['audio'] || anode.meta['cue-audio']
          if (asound_path) {
            let sound = sounds.find((a) => a.path == asound_path)
            if (!sound) {
              let eitem = export_list.find((a) => a.newval == asound_path)
              if (eitem) {
                sound = {
                  "id": (sounds.length+1)+"",
                  "path": eitem.newval,
                  "content_type": sound_extmime_map[path.extname(asound_path)] || "application/octet-stream",
                }
                sounds.push(sound)
              }
            }
            if (sound) {
              ret.sound_id = sound.id
            }
          }
          if (anode.is_leaf) {
            // check for spelling meta and add to state
            let meta_to_actions = [
              { boolmeta: 'spell-delchar', actions: [":backspace"] },
              { boolmeta: 'spell-finish', actions: [":speak"],
                actions: [ ":speak", ":clear", ":home" ] },
              { meta: 'spell-letter', metaeq: ' ', actions: [":space"] },
            ]
            for (let m2a of meta_to_actions) {
              if ((anode.meta[m2a.meta] &&
                   (m2a.metaeq || anode.meta[m2a.meta] == m2a.metaeq)) ||
                  (m2a.boolmeta != null &&
                   anode.readMetaAsBoolean(m2a.boolmeta, false))) {
                // ret.action = m2a.action
                if (m2a.actions) {
                  ret.actions = m2a.actions
                }
                break
              }
            }
            if (!ret.actions && state.inspellbranch) {
              ret.actions = [ "+" + (anode.meta['spell-word'] || anode.meta['spell-letter'] || anode.text) ]
              if (anode.meta['spell-word']) {
                ret.actions.push(":space")
              }
            }
          } else {
            let inner_state = Object.assign({}, state)
            let aboard = this._generateOBFBoards(anode, options, export_list, boards, inner_state)
            state.nextid = inner_state.nextid
            ret.load_board = {
              "name": aboard.name,
              "path": "boards/" + aboard.id + ".obf",
            }
          }
          return ret
        })
        .filter((a) => !!a)
    let row_len = options.row_len, col_len = options.col_len
    if (!row_len && !col_len) {
      row_len = 1
      col_len = buttons.length
    } else if (col_len > 0) {
      row_len = Math.ceil(buttons.length / col_len)
    } else if (row_len > 0) {
      col_len = Math.ceil(buttons.length / row_len)
    }
    let order = []
    for (let y = 0; y < row_len; y++) {
      let order_row = []
      for (let x = 0; x < col_len; x++) {
        if (y * col_len + x < buttons.length) {
          let button = buttons[y * col_len + x]
          order_row.push(button.id)
        } else {
          order_row.push(null)
        }
      }
      order.push(order_row)
    }
    let board = {
      "format": "open-board-0.1",
      "id": boardid,
      "locale": options.locale || "en",
      "name": node.text,
      // "description_html": "",
      "buttons": buttons,
      "images": [],
      "grid": {
        "rows": row_len,
        "columns": col_len,
        "order": order,
      },
      "sounds": sounds,
    }
    if (ext_spell_branch) {
      board.ext_spell_branch = true
    }
    boards.push(board)
    return board
  }


  /***** START HELPER FUNCTIONS *****/
  _zipAddTextEntry (zipwriter, fn, text) {
    return this._zipAddBlobEntry(zipwriter, fn, new Blob([text], {type:'text/plain'}))
  }
  _zipAddBlobEntry (zipwriter, fn, blob) {
    return new Promise((resolve, reject) => {
      zipwriter.add(fn, new zip.BlobReader(blob), resolve)
    })
  }
  _prepareTreeForExport (tree, node, export_list) {
    let tree_dir = tree.getTreeDir()
    if (node.meta) {
      let audio_meta_list = PascoNode.getAudioMetaList()
      for (let meta_name of PascoNode.getHRefMetaList()) {
        let prefix = audio_meta_list.indexOf(meta_name) == -1 ? '' : 'audio'
        prepare_attr_file_for_export(meta_name, prefix)
      }
    }
    for (let cnode of (node.child_nodes||[])) {
      this._prepareTreeForExport(tree, cnode, export_list)
    }
    function prepare_attr_file_for_export (name, optional_prefix) {
      var val = node.meta[name]
      if (val) {
        let eobj = export_list.find((a) => a.val == val)
        if (eobj != null) {
          eobj.changes.push({ node, meta_name: name })
          node.meta[name] = eobj.newval
        } else {
          if (val.indexOf(tree_dir) == 0) {
            var newval = val.substr(tree_dir.length)
            if (newval[0] == '/') {
              newval = newval.substr(1)
            }
            node.meta[name] = newval
          } else {
            node.meta[name] = (optional_prefix ? optional_prefix + '/' : '') + fsFriendlyName(val)
          }
          export_list.push({
            changes: [ { node, meta_name: name } ],
            val, newval: node.meta[name]
          })
        }
      }
    }
  }
  /***** END HELPER FUNCTIONS *****/

}
