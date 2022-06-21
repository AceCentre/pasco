import BaseModule from './BaseModule'
import PascoTreeNode from '../PascoTreeNode'
import _ from 'underscore'

export class TreeSwitcherModule extends BaseModule {
  constructor (pascoEngine) {
    this._pengine = pascoEngine
    this._core = pascoEngine.getCore()
    this._fmanager = this._core.getFileManager()
  }
  getName () {
    return 'trees-switcher'
  }
  generate (dynnode) {
    let current_tree = config.tree || window.default_tree
    let trees_info = await this._fmanager.loadFileJson(default_trees_info_fn)
    return {
      nodes: _.filter(
        _.map(trees_info.list, (item) => {
          if (item.tree_fn == current_tree) {
            return null
          }
          return {
            text: item.name,
            meta: {
              'change-tree': item.tree_fn,
            },
          }
        }),
        (v) => !!v // remove null node
      ),
    }
  }
}
