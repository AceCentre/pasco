import PascoTreeNode from './PascoTreeNode'
import showdown from 'showdown'
import sanitizeHtml from 'sanitize-html'

export default class PascoTreeMDReader {
  constructor () {
    this._pttrn01 = /^H([0-9])$/
    this._pttrn02 = /^LI$/
    this._pttrn03 = /\(([^\)]*)\)$/
  }
  readFromText (data) {
    // #46 \t to h1-6
    var tabsize = 0
    data = data.replace(/^([ \t]{1,})(.+)/gm, (all, indents, text) => {
      var tmp = text.trim()
      if(!tmp || tmp[0] == '-') {
        return all
      }
      var level = 0,
          spaces = 0
      for (let indent of indents) {
        if (indent == "\t") {
          spaces = 0
          level++
        } else if (indent == " ") {
          spaces++
          if (tabsize > 0 && spaces >= tabsize) {
            spaces = 0
            level++
          }
        }
      }
      if (tabsize == 0 && spaces > 0) {
        tabsize = Math.min(spaces, 8)
        level = 1
      }
      return '    '.repeat(level) + '- ' + tmp
    })
    // start of line with a letter or number is level0
    data = data.replace(/^\s*[^\#\@\<\-\*\_\ \t\n\r]/gm, (all) => '- ' + all)
    var html_data = new showdown.Converter().makeHtml(data)
    html_data = sanitizeHtml(html_data, {
      allowedTags:
      sanitizeHtml.defaults.allowedTags.concat([ 'h1', 'h2', 'meta' ]),
      allowedAttributes:
      Object.assign({}, sanitizeHtml.defaults.allowedAttributes, {
        meta: [ 'data-*' ]
      })
    })
    let tmpelm = document.createElement('div')
    tmpelm.innerHTML = html_data
    return this._parseNode(tmpelm)
  }
  _parseText (text) {
    text = text.trim()
    let meta = {}, match, _more_meta = {}
    // special format for auditory-cue meta (#8)
    if((match = text.match(this._pttrn03)) != null) {
      text = text.substr(0, text.length - (match[1].length + 2))
      if(match[1].length > 0) {
        meta['auditory-cue'] = match[1]
        _more_meta['auditory-cue-in-text'] = true
      }
    }
    return {
      text: text,
      meta: meta,
      _more_meta: _more_meta
    }
  }
  _parseNode (elm, continue_at, node) {
    continue_at = continue_at || { i: 0 }
    node = node || new PascoTreeNode({ level: 0, meta: {}, _more_meta: {} })
    for (var len = elm.childNodes.length; continue_at.i < len; continue_at.i++) {
      var elm_cnode = elm.childNodes[continue_at.i],
          match
      if(elm_cnode.nodeType == Node.ELEMENT_NODE) {
        if((match = elm_cnode.nodeName.match(this._pttrn01)) ||
           this._pttrn02.test(elm_cnode.nodeName)) { // branch
          var level = match ? parseInt(match[1]) : node.level + 1,
              is_list = !match
          if(level > node.level) {
            var txt_dom_elm = is_list ? elm_cnode.querySelector(":scope > p") : elm_cnode,
                txt_elm_content
            if(!txt_dom_elm) {
              txt_elm_content = []
              for (let second_elm_cnode of elm_cnode.childNodes) {
                if (second_elm_cnode.nodeType == Node.TEXT_NODE) {
                  txt_elm_content.push(second_elm_cnode.textContent)
                }
              }
              txt_elm_content = txt_elm_content.join(" ")
            } else {
              txt_elm_content = txt_dom_elm.textContent
            }
            var td = this._parseText(txt_elm_content)
            var anode = new PascoTreeNode({
              txt_dom_element: txt_dom_elm,
              dom_element: elm_cnode,
              level: level,
              text: td.text,
              meta: td.meta,
              _more_meta: td._more_meta,
              parent: node
            })
            if(is_list) {
              node.addChild(this._parseNode(elm_cnode, null, anode))
            } else {
              // process inner nodes
              this._parseNode(elm_cnode, null, anode)
              continue_at.i += 1
              node.addChild(this._parseNode(elm, continue_at, anode))
            }
            anode.setIsLeaf(anode.children.length == 0)
          } else {
            if(continue_at.i > 0)
              continue_at.i -= 1
            break // return to parent call
          }
        } else if(elm_cnode.nodeName == 'META') {
          var thenode = node.children.length > 0 ?
              node.children[node.children.length - 1] : node
          for (let attr of elm_cnode.attributes) {
            if(attr.name.indexOf('data-') == 0) {
              thenode.meta[attr.name.substr(5)] = attr.value
            }
          }
        } else { // go deeper
          this._parseNode(elm_cnode, null, node)
        }
      }
    }
    return node
  }
}
