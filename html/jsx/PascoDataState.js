// expected global variables
//   from core.js: set_file_data, get_file_data,
//     parse_tree, tree_to_markdown, mkdir_rec
import * as path from 'path'
import { getRuntimeEnv, arrayBufferFromFile, sha256Digest,
         arrayBufferToHex } from './common'
import { NotFoundError } from './exceptions'
import { v4 as uuidv4 } from 'uuid'

let CONFIG_DEPENDENCY_PARAMS = [ 'helper_back_option_main_audio', 'helper_back_option_cue_audio' ]
export default class PascoDataState {
  constructor (state_src_url) {
    this._version = '1.0'
    this._state_src_url = state_src_url
    this._state_dir_url = new URL('.', this._state_src_url).href
  }
  getVersion () {
    return this._version
  }
  getStateSrcUrl () {
    if (!this._state_src_url) {
      throw new Error('state_src_url has not defined')
    }
    return this._state_src_url
  }
  getStateDirUrl () {
    if (!this._state_dir_url) {
      throw new Error('state_dir_url has not defined')
    }
    return this._state_dir_url
  }
  get_file_url (src, base) {
    if (!this._state_src_url) {
      throw new Error('state_src_url has not defined')
    }
    return this.constructor.get_file_url(src, base || this._state_src_url)
  }
  resolve_internal_path (src, basedir) {
    return this.constructor.resolve_internal_path(src, basedir)
  }
  static get_file_url (src, base) {
    return new URL(src, base).href
  }
  static resolve_internal_path (src, basedir) {
    src = src.replace(/[:;]/g, '')
    basedir = typeof basedir == 'string' ? basedir.replace(/[:;]/g, '') : basedir
    basedir = typeof basedir == 'string' && path.isAbsolute(basedir) ? basedir.replace(/^[\/\\]+/, '') : basedir
    return path.normalize(path.isAbsolute(src) ? src.replace(/^[\/\\]+/, '') : (basedir ? path.join(basedir, src) : src))
  }
  reinit () {
    if (!this._data) {
      throw new Error('state is not initialized')
    }
    return this.init(this._data.config, this._data.trees_info)
  }
  async init (config_src, trees_info_src) {
    if (!this._state_src_url) {
      throw new Error('Cannot init, state_src_url has not defined')
    }
    // collect all local pasco files
    this._data = {
      id: (this._data ? this._data.id : null) || uuidv4(),
      version: this._version,
      files: [],
      config: config_src,
      trees_info: trees_info_src,
      tree_list: [],
    }
    let config_json = await get_file_data(this.get_file_url(config_src))
    let trees_info_json = await get_file_data(this.get_file_url(trees_info_src))
    await this._addFileWithBlob({ src: this.resolve_internal_path(trees_info_src) }, new Blob([trees_info_json]))
    await this._addFileWithBlob({ src: this.resolve_internal_path(config_src) }, new Blob([config_json]))
    let config = JSON.parse(config_json)
    let trees_info = JSON.parse(trees_info_json)
    await this.includeFromTreesInfo(trees_info, trees_info_src)
    await this.includeFromConfig(config, config_src)
  }
  async storeTree (src, src_url, src_url_base) {
    if (!this._state_dir_url) {
      throw new Error('state_dir_url has not defined')
    }
    return this.constructor.storeTree(src, src_url, src_url_base, this._state_dir_url)
  }
  static async storeTree (src, src_url, src_url_base, target_dir_url) {
    if (!src_url_base) {
      src_url_base = new URL('.', src_url).href
    }
    let rewrite_list = []
    let rewrite_tree = await this.makeTreeRewriteForImport(src, src_url, src_url_base, rewrite_list)
    await this.performRewrite(rewrite_list, target_dir_url)
  }
  async deleteTree (src_url) {
    let processTree = (tree) => {
      let add_dep = (dep_src) => {
        if (dep_src.indexOf('://') != -1) {
          return
        }
        delete_list.push({ src_url: this.get_file_url(dep_src, src_url) })
      }
      process_node_subrout(tree)
      function process_node_subrout (node) {
        // dyn=spell-word-prediction
        if (['spell-word-prediction','spell-letter-prediction'].indexOf(node.meta.dyn) != -1) {
          if (node.meta['words-file']) {
            add_dep(node.meta['words-file'])
          }
        }
        for (let audio_metaname of ['cue-audio', 'main-audio', 'audio']) {
          if (node.meta[audio_metaname]) {
            add_dep(node.meta[audio_metaname])
          }
        }
        if (Array.isArray(node.nodes)) {
          for (let cnode of node.nodes) {
            process_node_subrout(cnode)
          }
        }
      }
    }
    let tree_data
    try {
      tree_data = await get_file_data(src_url)
    } catch (err) {
      if (err instanceof NotFoundError) {
        return
      }
      throw err
    }
    let delete_list = []
    let tree_element = document.createElement('div')
    let tree = parse_tree(tree_element, tree_data)
    processTree(tree)
    delete_list.push({ src_url })
    for (let delete_item of delete_list) {
      try {
        await unset_file(delete_item.src_url)
      } catch (err) {
        if (!(err instanceof NotFoundError)) {
          throw err
        }
      }
    }
  }
  static async makeTreeRewriteForImport (src, src_url, src_url_base, rewrite_list, is_legacy) {
    let translateTree = (tree, tree_src) => {
      let tree_src_dir = path.dirname(src)
      let tree_src_dir_url = new URL('.', src_url).href
      let add_dep = (dep_src) => {
        let dep_url
        let dep_new_src = null
        let dep_new_rel_src = null
        if (is_legacy && dep_src.indexOf('://') == -1) {
          dep_url = this.get_file_url(dep_src, location+'')
          dep_new_rel_src = path.normalize(dep_src)
          dep_new_src = this.resolve_internal_path(dep_new_rel_src, tree_src_dir)
        } else {
          dep_url = this.get_file_url(dep_src, src_url)
          if (dep_url.startsWith(tree_src_dir_url) && dep_url.length > tree_src_dir_url.length) {
            dep_new_rel_src = path.normalize(dep_url.substring(tree_src_dir_url.length))
            dep_new_src = this.resolve_internal_path(dep_new_rel_src, tree_src_dir)
          } else if (dep_url.startsWith(src_url_base) && dep_url.length > src_url_base.length) {
            dep_new_rel_src = path.normalize(dep_url.substring(src_url_base.length))
            dep_new_src = this.resolve_internal_path(dep_url.substring(src_url_base.length), tree_src_dir)
          }
        }
        if (!dep_new_src) {
          // cannot convert to local tree file, instead accept is as a link
          return dep_url
        }
        let idx = rewrite_list.findIndex((a) => a.src == dep_new_src)
        if (idx == -1) {
          rewrite_list.push({ src: dep_new_src, src_url: dep_url, rel_src: dep_new_rel_src  })
        }
        return dep_new_rel_src
      }
      node_append_files(tree)
      function node_append_files (node) {
        // dyn=spell-word-prediction
        if (['spell-word-prediction','spell-letter-prediction'].indexOf(node.meta.dyn) != -1) {
          if (node.meta['words-file']) {
            node.meta['words-file'] = add_dep(node.meta['words-file'])
          }
        }
        for (let audio_metaname of ['cue-audio', 'main-audio', 'audio']) {
          if (node.meta[audio_metaname]) {
            node.meta[audio_metaname] = add_dep(node.meta[audio_metaname])
          }
        }
        if (Array.isArray(node.nodes)) {
          for (let cnode of node.nodes) {
            node_append_files(cnode)
          }
        }
      }
    }
    let tree_data = await get_file_data(src_url)
    let tree_element = document.createElement('div')
    let tree = parse_tree(tree_element, tree_data)
    translateTree(tree, src)
    let new_tree_data = tree_to_markdown(tree)
    rewrite_list.push({ src, src_url, data: new_tree_data })
  }
  static async performRewrite (rewrite_list, target_dir_url) {
    if (!target_dir_url.endsWith('/')) {
      target_dir_url = target_dir_url + '/'
    }
    // create all sub directories
    {
      let dirs_made = {}
      await mkdir_rec(target_dir_url)
      dirs_made[target_dir_url] = true
      for (let rewrite_file of rewrite_list) {
        let subdir = path.dirname(rewrite_file.src)
        let subdir_url = new URL(subdir, target_dir_url).href
        if (!dirs_made[subdir_url]) {
          await mkdir_rec(subdir_url)
          dirs_made[subdir_url] = true
        }
      }
    }
    // write files
    for (let rewrite_file of rewrite_list) {
      let data = rewrite_file.data ? rewrite_file.data : await get_file_data(rewrite_file.src_url, { responseType: 'blob' })
      let dest_url = new URL(rewrite_file.src, target_dir_url).href
      await set_file_data(dest_url, data)
    }
  }
  async _addFileWithBlob (file, data_blob) {
    await this.evalFileFromBlob(file, data_blob)
    let idx = this._data.files.findIndex((a) => a.src == file.src)
    if (idx == -1) {
      this._data.files.push(file)
    } else {
      this._data.files.splice(idx, 1, file)
    }
  }
  async _addFileFromSource (file, src_url) {
    await this.evalFileFromSource(file, src_url)
    let idx = this._data.files.findIndex((a) => a.src == file.src)
    if (idx == -1) {
      this._data.files.push(file)
    } else {
      this._data.files.splice(idx, 1, file)
    }
  }
  async includeFromConfig (config, config_src) {
    let configdir = path.dirname(config_src)
    if (config.tree && this._data.tree_list.indexOf(config.tree) == -1) {
      let tree_src = this.resolve_internal_path(config.tree, configdir)
      try {
        await this._addTreeFromSource(tree_src, this.get_file_url(tree_src))
      } catch (err) {
        if (!(err instanceof NotFoundError)) {
          throw err
        } else {
          console.warn(err)
        }
      }
    }
    for (let name of CONFIG_DEPENDENCY_PARAMS) {
      if (!!config[name] && typeof config[name] == 'string') {
        let file = { src: this.resolve_internal_path(config[name], configdir) }
        try {
          await this._addFileFromSource(file, this.get_file_url(file.src))
        } catch (err) {
          if (!(err instanceof NotFoundError)) {
            throw err
          } else {
            console.warn(err)
          }
        }
      }
    }
  }
  async includeFromTreesInfo (trees_info, trees_info_src) {
    // translate tree files path
    let trees_info_dir = path.dirname(trees_info_src)
    for (let treeinf of trees_info.list) {
      if (this._data.tree_list.indexOf(treeinf.tree_fn) != -1) {
        continue
      }
      let tree_src = this.resolve_internal_path(treeinf.tree_fn, trees_info_dir)
      await this._addTreeFromSource(tree_src, this.get_file_url(tree_src))
    }
  }
  async _addTreeFromSource (src, src_url) {
    let tree_file = { src }
    let tree_data = await get_file_data(src_url)
    await this._addFileWithBlob(tree_file, new Blob([tree_data]))
    if (this._data.tree_list.indexOf(tree_file.src) == -1) {
      this._data.tree_list.push(tree_file.src)
    }
    let tree_element = document.createElement('div')
    let tree = parse_tree(tree_element, tree_data)
    await this.includeFromTree(tree, tree_file)
  }
  async includeFromTree (tree, tree_file) {
    let treedir = path.dirname(tree_file.src)
    let add_dep = async (v) => {
      if (v.indexOf('://') != -1) {
        return
      }
      let file = { src: this.resolve_internal_path(v, treedir) }
      try {
        await this._addFileFromSource(file, this.get_file_url(file.src))
      } catch (err) {
        if (!(err instanceof NotFoundError)) {
          throw err
        } else {
          console.warn(err)
        }
      }
    }
    let node_append_files = async (node) => {
      // dyn=spell-word-prediction
      if (['spell-word-prediction','spell-letter-prediction'].indexOf(node.meta.dyn) != -1) {
        if (node.meta['words-file']) {
          await add_dep(node.meta['words-file'])
        }
      }
      for (let audio_metaname of ['cue-audio', 'main-audio', 'audio']) {
        if (node.meta[audio_metaname]) {
          await add_dep(node.meta[audio_metaname])
        }
      }
      if (Array.isArray(node.nodes)) {
        for (let cnode of node.nodes) {
          await node_append_files(cnode)
        }
      }
    }
    await node_append_files(tree)
  }
  /* NEEDS RE-IMPL
  onFileModified (src, base
) {
    // NOT USED :(
    ;(async () => {
      // if the fn exists in data then update it
      let subfiles = this.files.filter((a) => a.src == src)
      if (subfiles.length > 0) {
        for (let subfile of subfiles) {
          await this.evalFileFromSource(subfile, src)
          if (subfile.src == this._data.config) {
            try {
              let config = JSON.parse(await this.get_file_data(subfile.src))
              this.includeFromConfig(config)
            } catch (err) {
              console.error(`Could not parse config! [${subfile.src}] (on pasco-state onFileModified)`, err)
            }
          } else if (subfile.src == this._data.trees_info) {
            try {
              let trees_info = JSON.parse(await this.get_file_data(subfile.src))
              this.includeFromTreesInfo(trees_info)
            } catch (err) {
              console.error(`Could not parse trees-info! [${subfile.src}] (on pasco-state onFileModified)`, err)
            }
          } else if (this._data.tree_list.indexOf(subfile.src) != -1) {
            try {
              let tree_data = await this.get_file_data(subfile.src)
              let tree_element = document.createElement('div')
              let tree = parse_tree(tree_element, tree_data)
              this.includeFromTree(tree)
              this._trees_src[subfile.src] = subfile.src
            } catch (err) {
              console.error(`Could not parse tree! [${subfile.src}] (on pasco-state onFileModified)`, err)
            }
          }
        }
      }
      if (this._state_src) {
        this.setNeedsSave()
      }
    })()
  }
*/
  async evalFileFromBlob (file, data_blob) {
    let data_arraybuff = await arrayBufferFromFile(data_blob)
    file.checksum = arrayBufferToHex(await sha256Digest(data_arraybuff))
    file.filesize = data_arraybuff.byteLength
    return file
  }
  async evalFileFromSource (file, src_url) {
    let data_blob = await get_file_data(src_url, { responseType: 'blob' })
    let data_arraybuff = await arrayBufferFromFile(data_blob)
    file.checksum = arrayBufferToHex(await sha256Digest(data_arraybuff))
    file.filesize = data_arraybuff.byteLength
    return file
  }
  getData () {
    return this._data
  }
  toJSON () {
    if (this._data.files.length == 0) {
      throw new Error('pasco-state is emtpy!')
    }
    return JSON.stringify(this._data, null, '  ')
  }
  static fromJSON (jsondata) {
    let inst = new this()
    let data = JSON.parse(jsondata)
    if (data.version != inst.getVersion()) {
      throw new Error('version do not match: ' + data.version + ' != ' + inst.getVersion())
    }
    inst._data = data
    return inst
  }
  setNeedsSave () {
    if (this._needsSaveTimeout) {
      clearTimeout(this._needsSaveTimeout)
    }
    this._needsSaveTimeout = setTimeout(() => {
      this._needsSaveTimeout = null
      ;(async () => {
        if (this._state_src_url == null) {
          console.error(new Error('state_src_url is not defined'))
          return
        }
        try {
          await this.save()
        } catch (err) {
          console.error('Failed to save pasco-state file at: ', this._state_src_url, err)
        }
      })()
    }, 500)
  }
  async getChecksum () {
    let list = this._data.files.map((a) => a.checksum)
    list = list.sort()
    return await sha256Digest(list.join(''))
  }
  async save () {
    if (this._state_src_url == null) {
      throw new Error('state_src_url is not defined')
    }
    await mkdir_rec(this._state_dir_url)
    return await set_file_data(this._state_src_url, this.toJSON())
  }
  static async loadFromFile (src) {
    let inst = new this(src)
    let data = JSON.parse(await get_file_data(src))
    if (data.version != inst.getVersion()) {
      throw new Error('version do not match: ' + data.version + ' != ' + inst.getVersion())
    }
    inst._data = data
    return inst
  }
  static async rebuildStateFromLegacy (config_url, trees_info_url, target_dir_url) {
    if (!target_dir_url.endsWith('/')) {
      target_dir_url = target_dir_url + '/'
    }
    let rewrite_list = []
    async function includeTreeToRewrite (src_url, base_url) {
      let found_list = rewrite_list.filter((a) => a.src_url == src_url)
      if (found_list.length > 0) {
        return found_list[0].src
      }
      let base_url_dir = new URL('.', base_url).href
      if (!(src_url.startsWith(base_url_dir) && src_url.length > base_url_dir.length)) {
        // cannot convert to local tree file, instead accept is as a link
        return null
      }
      let src = datastate.resolve_internal_path(src_url.substring(base_url_dir.length))
      await PascoDataState.makeTreeRewriteForImport(src, src_url, base_url_dir, rewrite_list, true)
      return src
    }
    let state_src = 'pasco-state.json'
    let datastate = new PascoDataState(new URL(state_src, target_dir_url).href)
    let config_json = await get_file_data(config_url)
    let trees_info_json = await get_file_data(trees_info_url)
    let config = JSON.parse(config_json)
    let trees_info = JSON.parse(trees_info_json)
    if (config.tree) {
      let tree_url = (config.tree.indexOf('://') == -1 ? 'file:///' : '') + config.tree
      let new_src = await includeTreeToRewrite(tree_url, config_url)
      if (new_src != null) {
        config.tree = new_src
      }
    }
    for (let treeinf of trees_info.list) {
      let tree_url = (treeinf.tree_fn.indexOf('://') == -1 ? 'file:///' : '') + treeinf.tree_fn
      let new_src = await includeTreeToRewrite(tree_url, trees_info_url)
      if (new_src != null) {
        treeinf.tree_fn = new_src
      }
    }
    await PascoDataState.performRewrite(rewrite_list, target_dir_url)
    let target_config_fn = 'config.json'
    let target_trees_info_fn = 'trees-info.json'
    let new_config_data = JSON.stringify(config, null, '  ')
    let new_trees_info_data = JSON.stringify(trees_info, null, '  ')
    await set_file_data(new URL(target_config_fn, target_dir_url).href, new_config_data)
    await set_file_data(new URL(target_trees_info_fn, target_dir_url).href, new_trees_info_data)
    await datastate.init(target_config_fn, target_trees_info_fn)
    await datastate.save()
    return datastate
  }
}

