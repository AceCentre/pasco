import { getRuntimeEnv } from '../common'
import PascoTreeMDWriter from './PascoTreeMDWriter'
import PascoTreeMDReader from './PascoTreeMDReader'
import PascoTreeNode from './PascoTreeNode'


let newElm = document.createElement.bind(document);


export default class PascoTree {
  constructor (core) {
    this._core = core
    this._fmanager = this._core.getFileManager()
    this._datastate = this._core.getDataState()
    this._tree_reader = new PascoTreeMDReader()
    this._root_node = null
  }
  getRootNode () {
    return this._root_node
  }
  async initFromFile (tree_file) {
    this._tree_file_info = await this._getTreeFileInfo(tree_file)
    this._tree_data = await this._fmanager.loadFileData(this._tree_file_info.tree_fn)
  }
  getTreeData () {
    if (!this._tree_data) {
      throw new Error('Tree file is not initialized!')
    }
    return this._tree_data
  }
  getTreeUrl () {
    return this._requireTreeFileInfo().tree_fn
  }
  getTreeDir () {
    return this._requireTreeFileInfo().dirpath
  }
  getAudioDir () {
    return this._requireTreeFileInfo().audio_dirname
  }
  initNodesFromTreeData () {
    this._root_node = this._tree_reader.readFromText(this.tree_data)
  }
  async _getTreeFileInfo (tree_file) {
    // Determines place of tree and prepares it if default does not exists
    if (!tree_file) {
      throw new Error("Invalid argument")
    }
    if (!tree_file.includes("://")) {
      if (this._datastate) {
        // This will be the current browser URL
        const currentLocation = location + ""
        // Create a new URL with the tree file name as the pathname and the current browser location
        const newUrl = new URL(tree_file, currentLocation)
        return {
          tree_fn: newUrl.href,
          dirpath: new URL(".", newUrl.href).href,
          audio_dirname: null,
        }
      } else {
        const exists = await this.fmanager.fileExists("file:///" + tree_file)
        if (exists) {
          return {
            tree_fn: "file:///" + tree_file,
            dirpath: new URL(".", "file:///" + tree_file).href,
            audio_dirname: null,
          }
        } else {
          return {
            tree_fn: tree_file,
            dirpath: new URL(".", tree_file).href,
            audio_dirname: null,
          }
        }
      }
    }
    let audio_dirname = getRuntimeEnv() == 'cordova' ? "audio" : null
    let tree_dir = new URL(".", tree_file).href
    if (audio_dirname) {
      await this._fmanager.mkdirRec(new URL(audio_dirname, tree_dir).href)
    }
    return {
      tree_fn: tree_file,
      dirpath: tree_dir,
      audio_dirname: audio_dirname,
    }
  }
  makeNodeElements (node, element, content_template) {
    element.target_node = node
    node.dom_element = element;
    element.classList.add('level-' + node.level);
    element.classList.add('node')
    var text = node.text || '';
    if(content_template) {
      var celm = newElm('div');
      celm.classList.add('content');
      element.appendChild(celm);
      node.content_element = celm;
      celm.innerHTML = content_template({
        text: text,
        node // BREAKING CHANGE: change tree => node
        // at the moment only one tree template is available in index.html
      });
      var txtelm = celm.querySelector('.text');
      if(txtelm) {
        node.txt_dom_element = txtelm;
      }
    } else {
      var celm = newElm('div');
      celm.classList.add('content');
      element.appendChild(celm);
      node.content_element = celm;
      var txtelm = newElm('p');
      txtelm.classList.add('text');
      txtelm.textContent = text;
      celm.appendChild(txtelm);
      node.txt_dom_element = txtelm;
    }
    if(!node.is_leaf) {
      var ulwrp = newElm('div')
      ulwrp.classList.add('children-wrp')
      var ul = newElm('ul');
      node.nodes_ul_dom_element = ul;
      ul.classList.add('children');
      for (let cnode of node.nodes) {
        let li = newElm('li');
        this.mkNodeElements(cnode, li, content_template);
        ul.appendChild(li);
      }
      ulwrp.appendChild(ul)
      element.appendChild(ulwrp);
    }
  }
  _requireTreeFileInfo () {
    if (!this._tree_file_info) {
      throw new Error('Tree file is not initialized!')
    }
    return this._tree_file_info
  }
}

