
export default class DOMEventManager {
  constructor () {
    this._event_handlers_list = []
  }
  addNodeListenerFor (node, name, handler, id) {
    node.addListener(name, handler)
    this._event_handlers_list.push({ type: 'node', node, name, handler, id })
  }
  addDOMListenerFor (node, name, handler, capture, id) {
    node.addEventListener(name, handler, capture)
    this._event_handlers_list.push({ type: 'dom', node, name, handler, capture, id })
  }
  /* remove listeners work on both types of event controllers
   */
  removeListenersById (id) {
    let idx
    while ((idx = this._event_handlers_list.findIndex((a) => a.id == id)) != -1) {
      this._removeItem(this._event_handlers_list[idx])
      this._event_handlers_list.splice(idx, 1)
    }
  }
  removeAllListeners () {
    for (let item of this._event_handlers_list) {
      this._removeItem(item)
    }
    this._event_handlers_list = []
  }
  _removeItem (item) {
    switch (item.type) {
      case 'dom': {
        let { node, name, handler, capture } = item
        node.removeEventListener(name, handler, capture)
        break
      }
      case 'node': {
        let { node, name, handler } = item
        node.removeListener(name, handler)
        break
      }
    }
  }
}
