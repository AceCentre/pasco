import { copyObject } from '../helpers/common'

export default class PascoNode {
  constructor (data) {
    data = data || {}
    let props = [
      'level', 'text', 'meta', '_more_meta', 'parent_node', 'child_nodes',
    ]
    for (let prop of props) {
      this[prop] = data[prop]
    }
    for (let name of ['meta', '_more_meta']) {
      if (!this[name]) {
        this[name] = {}
      }
    }
    this.child_nodes = Array.isArray(data.child_nodes) ? data.child_nodes : null
    this.is_leaf = this.child_nodes ? false : true
  }
  static getAudioMetaList () {
    return [ 'audio', 'cue-audio', 'main-audio' ]
  }
  static getHRefMetaList () {
    return [ 'words-file', ...this.getAudioMetaList() ]
  }
  copy () {
    let static_props = [
      'level', 'text', 'meta', '_more_meta',
    ]
    let data = copyObject(Object.fromEntries(static_props.map((a) => [ a, this[a] ])))
    let node_copy = new PascoNode(data)
    if (!this.is_leaf) {
      for (let cnode of this.child_nodes) {
        node_copy.appendChild(cnode.copy())
      }
    }
    return node_copy
  }
  appendChild (node) {
    if (!this.child_nodes || this.is_leaf) {
      this._setIsLeaf(false)
    }
    this.child_nodes.push(node)
    node.level = this.level + 1
    node.parent_node = this
  }
  insertChildBefore (node, other_node) {
    let other_node_idx = this.child_nodes.indexOf(other_node)
    if (other_node_idx == -1) {
      throw new Error('other_node is not in the child_nodes')
    }
    if (!this.child_nodes || this.is_leaf) {
      this._setIsLeaf(false)
    }
    this.child_nodes.splice(other_node_idx, 0, node)
    node.level = this.level + 1
    node.parent_node = this
  }
  removeChild (child_node) {
    if (!this.child_nodes) {
      throw new Error('node does not have any child_nodes')
    }
    let child_node_idx = this.child_nodes.indexOf(child_node)
    if (child_node_idx == -1) {
      throw new Error('child_node is not in the child_nodes')
    }
    let node = this.child_nodes.splice(child_node_idx, 1)[0]
    node.parent_node = null
    if (this.child_nodes.length == 0) {
      this._setIsLeaf(true)
    }
  }
  getChildCount () {
    return this.child_nodes ? this.child_nodes.length : 0
  }
  getChildAtIndex (index) {
    if (index < 0 || index >= this.child_nodes.length) {
      throw new Error('Index out of range')
    }
    return this.child_nodes[index]
  }
  _setIsLeaf (value) {
    this.is_leaf = !!value
    if (this.is_leaf) {
      delete this.child_nodes
    } else {
      if (!Array.isArray(this.child_nodes)) {
        this.child_nodes = []
      }
    }
  }
  getMetaFromTree (name) {
    let getMetaFromTreeSub = (node) => {
      var value = node.meta[name]
      if (value !== undefined && value != 'inherit') {
        return { value, node }
      }
      if (node.parent_node) {
        return getMetaFromTreeSub(node.parent_node)
      }
      return { value: null, node: null }
    }
    return getMetaFromTreeSub(this)
  }
  readMetaAsInt (name, default_val) {
    return PascoNode.parseMetaValueAsInt(this.meta[name], default_val)
  }
  readMetaAsBoolean (name, default_val) {
    return PascoNode.parseMetaValueAsBoolean(this.meta[name], default_val)
  }
  static parseMetaValueAsInt (v, default_val) {
    var i = parseInt(v)
    if (isNaN(i)) {
      return parseInt(default_val)
    }
    return i
  }
  static parseMetaValueAsBoolean (v, default_val) {
    if (v == null) {
      return default_val;
    }
    return v === 'true' || v === '';
  }

  async traverseAsync (callable) {
    await this._traverseAsyncSubrout(callable, 0)
  }
  async _traverseAsyncSubrout (callable, i) {
    while (this.child_nodes && i < this.child_nodes.length) {
      let cnode = this.child_nodes[i]
      let output = await callable(cnode, i, this)
      if (output != null && (output.next_index >= 0)) {
        i = output.next_index
      } else {
        i += 1
      }
      await cnode.traverseAsync(callable)
    }
  }
}
