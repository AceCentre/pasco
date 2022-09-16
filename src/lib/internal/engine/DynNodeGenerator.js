
export default class PascoDynNodeGenerator {
  constructor () {
    this._modules = []
  }
  addModule (module) {
    this._modules.push(module)
  }
  async generate (node) {
    return await node.traverseAsync(async (node, index, parent_node) => {
      var dyn_name = node.meta.dyn
      if (dyn_name) {
        var module = this._modules.find((a) => a.getName() == dyn_name)
        if (module) {
          let { nodes } = await module.generate(node)
          for (let cnode of nodes) {
            cnode._isdynnode = true
            cnode._dynnode = node
            cnode.parent_node = parent_node
            cnode.level = parent_node.level + 1
            parent_node.child_nodes.splice(index++, 0, cnode)
          }
          // delete node.parent
          parent_node.child_nodes.splice(index, 1)
          return { next_index: index }
        }
      }
    })
  }
}


