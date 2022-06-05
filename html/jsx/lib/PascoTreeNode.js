
export default class PascoTreeNode {
  constructor (data) {
    data = data || {}
    let props = [
      'txt_dom_element', 'dom_element', 'level', 'text', 'meta',
      '_more_meta', 'parent'
    ]
    for (let prop of props) {
      this[prop] = data[prop]
    }
    // TODO:: this.nodes is a reference to this.children to keep backward compatibility with the current use of TreeNode. It should be removed in the future
    // Also the relation between is_leaf and children is maintained according to original design. It'd be more desirable to let children always be an array
    this.is_leaf = 'is_leaf' in data ? !!data.is_leaf : false
    if (!this.is_leaf) {
      this.children = this.nodes = Array.isArray(data.children) ? data.children : []
      // this.static_children = this.static_nodes = []
    }
  }
  addChild (cnode) {
    if (!this.children || this.is_leaf) {
      this.setIsLeaf(false)
    }
    this.children.push(cnode)
    // this.static_children.push(cnode)
  }
  setIsLeaf (value) {
    this.is_leaf = !!value
    if (this.is_leaf) {
      delete this.children
      delete this.nodes
    } else {
      if (!Array.isArray(this.children)) {
        this.children = []
      }
      this.nodes = this.children
    }
  }
}
