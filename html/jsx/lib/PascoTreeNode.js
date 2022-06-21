
export default class PascoTreeNode {
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
    this.is_leaf = 'is_leaf' in data ? !!data.is_leaf : false
    if (!this.is_leaf) {
      this.child_nodes = Array.isArray(data.child_nodes) ? data.child_nodes : []
    }
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
    this.child_nodes.splice(child_node_idx, 1)
    node.parent_node = null
    if (!this.child_nodes.length == 0) {
      this._setIsLeaf(true)
    }
  }
  getChildCount () {
    return this.child_nodes.length
  }
  getChildAtIndex (index) {
    if (index < 0 || index >= parent_node.child_nodes.length) {
      throw new Error('Index out of range')
    }
    return parent_node.child_nodes[index]
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
}
