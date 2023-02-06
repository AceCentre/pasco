import showdown from 'showdown'
import { JSDOM } from 'jsdom'

export default class PascoTreeMDWriter {
  constructor () {
    let dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`)
    this._window_Node = dom.window.Node
    this._document = dom.window.document
  }
  writeToText (node) {
    var md_lines = []
    this._insertMDLines(node, 0, md_lines)
    return md_lines.join('\r\n')
  }
  _insertMDLines(node, level, md_lines) {
    if (node._more_meta.istmp) {
      // temporary nodes will not be listed for next save
      return
    }
    let text = level > 0 ?
        (node.text +
         (node._more_meta['auditory-cue-in-text'] ?
          '('+node.meta['auditory-cue']+')' : '')) : null
    let meta_html = this._genNodeMetaTag(node)
    let line = (text != null ? '#'.repeat(level) + ' ' + text : '') +
        (meta_html ? (level == 0 ? '' : ' ') + meta_html : '')
    if (line) {
      md_lines.push(line)
      md_lines.push("") // empty line
    }
    if(!node.is_leaf) {
      for (let cnode of node.child_nodes) {
        this._insertMDLines(cnode, level + 1, md_lines)
      }
    }
  }
  _genNodeMetaTag (anode) {
    let tmp_meta = this._document.createElement('meta')
    let auditory_cue_in_text = anode._more_meta['auditory-cue-in-text']
    let len = 0
    for (let key of Object.keys(anode.meta)) {
      if (!auditory_cue_in_text || key != 'auditory-cue') {
        tmp_meta.setAttribute('data-' + key, anode.meta[key])
        len++
      }
    }
    if(len > 0) {
      var tmp2 = this._document.createElement('div')
      tmp2.appendChild(tmp_meta)
      return tmp2.innerHTML
    }
    return null
  }
}
