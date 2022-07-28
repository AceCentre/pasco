import BaseModule from './BaseModule'
import PascoNode from '../PascoNode'

export default class TreeSwitcherModule extends BaseModule {
  constructor (pascoEngine) {
    super()
    this._pengine = pascoEngine
    this._core = pascoEngine.getCore()
    this._fmanager = this._core.getFileManager()
  }
  getName () {
    return 'trees-switcher'
  }
  async generate (dynnode) {
    let current_tree_url = this._pengine.getTreeUrl()
    let trees_info_url = this._core.getEnvValue('default_trees_info_file')
    let trees_info = await this._fmanager.loadFileJson(trees_info_url)
    return {
      nodes: trees_info.list
        .map((item) => {
          let tree_url = this.resolveUrl(item.tree_fn, trees_info_url)
          if (tree_url == current_tree) {
            return null
          }
          return new PascoNode({
            text: item.name,
            meta: {
              'change-tree': item.tree_fn,
            },
          })
        })
        .filter((v) => !!v), // remove null node
    }
  }
}
