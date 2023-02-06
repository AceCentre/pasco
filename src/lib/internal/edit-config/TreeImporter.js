import * as path from 'path'
import { fsFriendlyName } from '../../../helpers/common'
import { ImportError } from '../../exceptions'
import PascoNode from '../../PascoNode'
import PascoTreeMDReader from '../../PascoTreeMDReader'
import PascoTreeMDWriter from '../../PascoTreeMDWriter'
/* helpers/zip is a copy of static/zipjs/zip.js, It's not an ideal setup, It'd be better if It's replaced with a superior module. */
import zip from '../../../helpers/zip'

export default class TreeImporter {
  constructor (core) {
    this._core = core
    this._fmanager = core.getFileManager()
  }
  async importTreeFromZipFile (file, dest_url) {
    let [zipreader,entries] = await (new Promise((resolve, reject) => {
      zip.createReader(new zip.BlobReader(file), (reader) => {
        reader.getEntries((entries) => resolve([reader,entries]))
      })
    }))
    try {
      let mdfiles = entries.filter((entry) => entry.filename.endsWith('.md'))
      let filesmap = Object.fromEntries(entries.map((entry) => [ entry.filename, entry ]))
      if (mdfiles.length == 0) {
        throw new Error('No tree found in zip file')
      } else {
        await this._importTreeMDFromZip(mdfiles[0], filesmap, dest_url)
      }
    } finally {
      zipreader.close()
    }
  }
  async _importTreeMDFromZip (mdfile, filesmap, dest_url) {
    let tree_dir = path.dirname(mdfile.filename)
    let tree_data = await this._readZipEntryAsText(mdfile, 'text/markdown')
    let tree_reader = new PascoTreeMDReader()
    let root_node = tree_reader.readFromText(tree_data)
    let import_list = []
    let save_state = this._initSaveState()
    this._prepareTreeForImport(root_node, import_list)
    await this._saveFilesInImportList(import_list, tree_dir, filesmap, dest_url, save_state)
    await this._saveTree(root_node, dest_url, save_state)
  }

  // import obz
  async importTreeFromOBZFile (obzfile, dest_url) {
	  let [zipreader,entries] = await (new Promise((resolve, reject) => {
      zip.createReader(new zip.BlobReader(obzfile), (reader) => {
        reader.getEntries((entries) => resolve([reader,entries]))
      })
    }))
    try {
      let filesmap = Object.fromEntries(entries.map((entry) => [ entry.filename.replace(/^\//, ""), entry ]))
      if (!filesmap["manifest.json"]) {
        throw new ImportError("manifest.json does not exists!")
      }
      let manifest
      try {
        manifest = JSON.parse((await this._readZipEntryAsText(filesmap["manifest.json"])))
      } catch (err) {
        console.error(err)
        throw new ImportError("Could not parse manifest.json")
      }
      await this._importTreeFromOBZSub0(manifest, filesmap, dest_url)
    } finally {
      zipreader.close()
    }
  }
  async _importTreeFromOBZSub0 (manifest, filesmap, dest_url) {
    let rootfn = manifest.root
    let boardsfn = manifest.paths ? manifest.paths.boards : null
    if (!rootfn || boardsfn == null || typeof boardsfn != 'object') {
      throw new Error("!rootfn or !boardsfn{}")
    }
    let board = await this._requireOBZBoardFromZipEntry(filesmap[rootfn], rootfn)
    let getboard = async (source, value) => {
      if (source == "id") {
        let fn = boardsfn[value]
        if (!fn) {
          throw new ImportError("No match file for board id: " + value)
        }
        return await this._requireOBZBoardFromZipEntry(filesmap[fn], fn)
      } else if (source == "zippath") {
        if (!filesmap[value]) {
          throw new ImportError("No match board file in obz: " + value)
        }
        return await this._requireOBZBoardFromZipEntry(filesmap[value], value)
      } else if (source == "url") {
        let board
        try {
          board = JSON.parse((await this._fmanager.loadFileData(value)))
        } catch (err) {
          throw new ImportError("Could not load board: " + value)
        }
        if (board.format != "open-board-0.1") {
          throw new ImportError("json file is not a board(obf): " + value)
        }
        return board
      } else {
        throw new Error("Unknown source!")
      }
    }
    let save_state = this._initSaveState()
    let root_node = new PascoNode({ level: 0, meta: {}, _more_meta: {} })
    // import tree data from boards
    await this._importTreeFromOBZSub1(root_node, board, getboard, {inboardids:[board.id]})
    // prepare import_list for saving (sound files)
    let import_list = []
    this._prepareTreeForImport(root_node, import_list)
    await this._saveFilesInImportList(import_list, '', filesmap, dest_url, save_state)
    // save tree .md file
    await this._saveTree(root_node, dest_url, save_state)
  }
  async _importTreeFromOBZSub1 (node, board, getboard, state) {
    if (board.ext_spell_branch) {
      node.meta['spell-branch'] = true
      state.inspellbranch = true
    }
    let soundsbyid = Object.fromEntries((board.sounds||[]).map((a) => [ a.id, a ]))
    let buttons = board.buttons
    let nodes = []
    if (board.grid && board.grid.sort && board.grid.sort[0]) {
      let nodesbyid = Object.fromEntries(buttons.map((a) => [ a.id, a ]))
      nodes = board.grid.sort[0].map((id) => nodesbyid[id]).filter((a) => !!a)
    }
    (await Promise.all(buttons.map(async (button) => {
      let asound = button.sound_id ? soundsbyid[button.sound_id] : null
      let anode = new PascoNode({
        level: node.level + 1,
        text: button.label,
        meta: Object.fromEntries([
          ['auditory-cue', button.vocalization],
          ['audio', asound ? asound.path || asound.url : null]
        ].filter((v) => !!v[1])),
      })
      if (button.load_board) {
        let inner_board
        if (button.load_board.path) {
          inner_board = await getboard("zippath", button.load_board.path)
        } else if (button.load_board.id) {
          inner_board = await getboard("id", button.load_board.id)
        } else if (button.load_board.url) {
          inner_board = await getboard("url", button.load_board.url)
        }
        if (inner_board && state.inboardids.indexOf(inner_board.id) == -1) {
          let inner_state = Object.assign({}, state)
          inner_state.inboardids = [inner_board.id].concat(state.inboardids)
          await this._importTreeFromOBZSub1(anode, inner_board, getboard, inner_state)
        }
      } else {
        if (state.inspellbranch) {
          // check for spelling meta and add to state
          let actions_to_meta = [
            { meta: 'spell-delchar', value: true, action: ":backspace" },
            { meta: 'spell-finish', value: true, action: ":speak" },
            { meta: 'spell-letter', value: ' ', action: ":space" },
          ]
          for (let a2m of actions_to_meta) {
            if (button.action == a2m.action) {
              anode.meta[a2m.meta] = a2m.value
              break
            }
          }
          // check for add to spell
          if (typeof button.action == 'string' && button.action.indexOf('+') == 0) {
            if (button.actions && button.actions[0] == button.action &&
                button.actions[1] == ":space") {
              anode.meta['spell-word'] = button.action.substr(1)
            } else if (button.action.length == 2) {
              if (button.action.substr(1) != anode.text) {
                anode.meta['spell-letter'] = button.action.substr(1)
              }
            }
          }
        }
      }
      return anode
    })))
      .forEach((cnode) => {
        node.appendChild(cnode)
      })
  }
  async _requireOBZBoardFromZipEntry (entry, fn) {
    if (!entry) {
      throw new ImportError(fn + " does not exists in zip file!")
    }
    let board
    try {
      board = JSON.parse((await this._readZipEntryAsText(entry)))
    } catch (err) {
      throw new ImportError("Could not load board: " + entry.filename)
    }
    if (board.format != "open-board-0.1") {
      throw new ImportError("json file is not a board(obf): " + fn)
    }
    return board
  }

  /***** START HELPER FUNCTIONS *****/
  _initSaveState () {
    return { called_mkdir_dict: {} }
  }
  async _saveFile (file_url, blob, save_state) {
    await this._mkdirRecForFile(file_url, save_state)
    await this._fmanager.saveFileData(file_url, blob)
  }
  async _saveTree (root_node, dest_url, save_state) {
    let tree_writer = new PascoTreeMDWriter()
    let tree_data = tree_writer.writeToText(root_node)
    await this._mkdirRecForFile(dest_url, save_state)
    await this._fmanager.saveFileData(dest_url, tree_data)
    await this._core.updateDataState()
  }
  async _mkdirRecForFile (file_url, save_state) {
    let dir_url = this._core.resolveUrl('.', file_url)
    if (!save_state.called_mkdir_dict[dir_url]) {
      save_state.called_mkdir_dict[dir_url] = true
      await this._fmanager.mkdirRec(dir_url)
    }
  }
  async _saveFilesInImportList (import_list, tree_dir, files_map, dest_url, save_state) {
    for (let item of import_list) {
      var tmp = item.val
      if (tmp.indexOf("://") == -1 && tree_dir) {
        tmp = path.resolve("/" + tree_dir, tmp)
        if (tmp[0] == "/") {
          tmp = tmp.substr(1)
        }
      }
      var entry = files_map[tmp]
      if (entry) {
        let blob = await this._readZipEntryAsBlob(entry)
        let file_url = this._core.resolveUrl(item.newval, dest_url)
        await this._saveFile(file_url, blob, save_state)
      } else {
        // revert
        for (let change of item.changes) {
          change.node.meta[change.meta_name] = item.val
        }
      }
    }
  }
  _prepareTreeForImport (node, import_list) {
    if (node.meta) {
      for (let meta_name of PascoNode.getHRefMetaList()) {
        prepare_attr_file_for_import(meta_name)
      }
    }
    for (let cnode of (node.child_nodes||[])) {
      this._prepareTreeForImport(cnode, import_list)
    }
    function prepare_attr_file_for_import (name) {
      var val = node.meta[name]
      if (val && val.indexOf("://") == -1 && val.indexOf("../") == -1) {
        let iobj = import_list.find((a) => a.val == val)
        if (iobj == null) {
          // no change in value is needed
          import_list.push({
            changes: [ ],
            val: val, newval: val,
          })
        }
      }
    }
  }
  _readZipEntryAsBlob (entry, mimetype) {
    return new Promise((resolve, reject) => {
      entry.getData(new zip.BlobWriter(mimetype || 'application/octet-stream'), (blob) => {
        resolve(blob)
      })
    })
  }
  _readZipEntryAsText (entry, mimetype) {
    return new Promise((resolve, reject) => {
		  entry.getData(new zip.BlobWriter(mimetype || 'text/markdown'), (blob) => {
        var reader = new FileReader()
        reader.onload = () => {
          resolve(reader.result)
        }
        reader.readAsText(blob)
      })
    })
  }
  /***** END HELPER FUNCTIONS *****/
}

