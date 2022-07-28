import PascoTreeMDReader from '../PascoTreeMDReader'
import PascoTreeMDWriter from '../PascoTreeMDWriter'
import PascoNode from '../PascoNode'
import EventManager from '../../helpers/EventManager'
import lodashTemplate from '../../helpers/lodashTemplate'
import $ from 'jquery'
import PascoMainNodeSettingsController from './PascoMainNodeSettingsController'

export default class PascoMainEditMode {
  constructor (main) {
    this._main = main
    this._pengine = main.getEngine()
    this._document = main.getDocument()
    this._core = main.getCore()
    this._fmanager = this._core.getFileManager()
    this._event_manager = new EventManager()
  }
  toggleEditButtons (b) {
    this._document.querySelector('#edit-config-btn')
      .classList[b?'add':'remove']('hide')
    this._document.querySelector('#help-btn')
      .classList[b?'add':'remove']('hide')
    this._document.querySelector('#edit-mode-btn')
      .classList[b?'add':'remove']('disabled')
    this._document.querySelector('#edit-mode-save-btn')
      .classList[!b?'add':'remove']('hide')
    this._document.querySelector('#edit-mode-cancel-btn')
      .classList[!b?'add':'remove']('hide')
  }
  init () {
    this.toggleEditButtons(true)
    this._root_node = this._main.getRootNode()
    this._tree_url = this._main.getTreeUrl()
    let root_node_element = this._main.getRootNodeElement()
    root_node_element.classList.add('edit-mode')
    this._event_manager.addDOMListenerFor(root_node_element, 'click', this.didClickOnTree.bind(this), false)
    this._event_manager.addNodeListenerFor(this._pengine, 'move', this.didSelectNode.bind(this))
    this._restore_root_node = this._root_node.copy()
  }
  destroy () {
    this.toggleEditButtons(false)
    let root_node_element = this._main.getRootNodeElement()
    root_node_element.classList.remove('edit-mode')
    this._event_manager.removeAllListeners()
    delete this._restore_root_node
    delete this._selected_node
  }

  didSelectNode (node) {
    if (this._selected_node == node) {
      return // already selected
    }
    let evtid = 'input-text'
    // remove previously selected
    if (this._selected_node) {
      this._selected_node.dom_element.classList.remove('selected')
      this._selected_node.content_element.removeChild(this._selected_node._edit_overlay)
      this._event_manager.removeListenersById(evtid)
      delete this._selected_node._edit_overlay
    }
    if (!node.content_element) {
      return // skip, node's ui element is not initialized
    }
    node.dom_element.classList.add('selected')
    let edit_overlay = this._document.createElement('div')
    let edit_overlay_tmpl_elm = this._document.querySelector('#node-edit-overlay')
    if (!edit_overlay_tmpl_elm) {
      throw new Error('#node-edit-overlay element does not exists!')
    }
    edit_overlay.innerHTML = edit_overlay_tmpl_elm.innerHTML
    edit_overlay.classList.add('node-edit-overlay')
    let inp_txt = edit_overlay.querySelector('[name=text]')
    if(inp_txt) {
      let txt = node.text + 
          (node._more_meta['auditory-cue-in-text'] &&
           node.meta['auditory-cue'] ?
           '(' + node.meta['auditory-cue'] + ')' : '')
      inp_txt.value = txt
      let onblur = () => {
        this._main.enableMouseCapture()
        this._main.enableKeyboardCapture()
      }
      let onfocus = () => {
        this._main.disableMouseCapture()
        this._main.disableKeyboardCapture()
      }
      this._event_manager.addDOMListenerFor(inp_txt, 'blur', onblur, false, evtid)
      this._event_manager.addDOMListenerFor(inp_txt, 'focus', onfocus, false, evtid)
      this._event_manager.addDOMListenerFor(inp_txt, 'touchend', onfocus, false, evtid)
      this._event_manager.addDOMListenerFor(inp_txt, 'mouseup', onfocus, false, evtid)
      this._event_manager.addDOMListenerFor(inp_txt, 'input', (evt) => {
        let data = PascoTreeMDReader.parseText(inp_txt.value)
        node.text = data.text
        if (data.meta['auditory-cue']) {
          node.meta['auditory-cue'] = data.meta['auditory-cue']
        } else {
          delete node.meta['auditory-cue']
        }
        node._more_meta['auditory-cue-in-text'] = !!data._more_meta['auditory-cue-in-text']
        if(node.txt_dom_element) {
          node.txt_dom_element.textContent = node.text
        }
      }, false, evtid)
      this._event_manager.addDOMListenerFor(inp_txt, 'keydown', (evt) => {
        let code = evt.keyCode
        evt.stopPropagation()
        if (code == 27 || code == 13) { // escape or enter
          evt.preventDefault()
          inp_txt.blur()
        }
      }, false, evtid)
    }
    node.content_element.appendChild(edit_overlay)
    node._edit_overlay = edit_overlay
    this._selected_node = node
  }

  async didClickOnTree (evt) {
    let elm = evt.target
    let node, node_elm, btn, edit_overlay
    if (elm.classList.contains('children')) {
      return // no good
    }
    while (elm != null) {
      if (!btn && elm.nodeName == 'BUTTON') {
        btn = elm
      }
      if (elm.classList.contains('node-edit-overlay')) {
        edit_overlay = elm
      }
      if (elm.classList.contains('node')) {
        node_elm = elm
        node = node_elm.target_node
        break
      }
      elm = elm.parentNode
    }
    if (elm == null || !node || !node.parent_node) { // not found or invalid
      return
    }
    let content_template
    try {
      let tmp = document.querySelector('#tree-node-template')
      content_template = lodashTemplate(tmp.innerHTML)
    } catch (err) {
      throw new Error('Failed to parse template from #tree-node-template')
    }
    let mkNode = () => {
      return new PascoNode({
        text: 'New',
        meta: {},
        _more_meta: {},
      })
    }
    if (btn) {
      // clicked on a button, perform the request if it's a known button
      if (btn.classList.contains('add-node-before')) {
        var idx = node.parent_node.child_nodes.indexOf(node)
        if (idx == -1) {
          throw new Error("Corrupt tree!")
        }
        let newnode = this._main.insertNodeBefore(mkNode(), node.parent_node, idx)
        await this._pengine.changeCurrentNode(newnode, { silent: true })
      } else if (btn.classList.contains('add-node-after')) {
        var idx = node.parent_node.child_nodes.indexOf(node)
        if(idx == -1) {
          throw new Error("Corrupt tree!")
        }
        let newnode = this._main.insertNodeBefore(mkNode(), node.parent_node, idx + 1)
        await this._pengine.changeCurrentNode(newnode, { silent: true })
      } else if (btn.classList.contains('add-child-node')) {
        let newnode = this._main.insertNodeBefore(mkNode(), node, node.is_leaf ? 0 : node.child_nodes.length)
        await this._pengine.changeCurrentNode(newnode, { silent: true })
      } else if (btn.classList.contains('remove-node')) {
        var idx = node.parent_node.child_nodes.indexOf(node)
        if(idx == -1) {
          throw new Error("Corrupt tree!")
        }
        let parent_node = node.parent_node
        this._main.removeNodeFromParent(node)
        // move to another node
        var anode
        if (!parent_node.child_nodes || parent_node.child_nodes.length == 0) {
          anode = parent_node
        } else {
          anode = idx >= parent_node.child_nodes.length ?
            parent_node.child_nodes[parent_node.child_nodes.length - 1] :
            parent_node.child_nodes[idx]
        }
        await this._pengine.changeCurrentNode(anode, { silent: true })
      } else if (btn.classList.contains('node-setting')) {
        // bootstrap modal
        let on_modal_hidden = () => {
          $('#node-setting-modal').off('hidden.bs.modal', on_modal_hidden)
          this._main.enableMouseCapture()
          this._main.enableKeyboardCapture()
          this._node_settings_controller.destroy()
          this._node_settings_controller = null
        }
        $('#node-setting-modal').modal('show')
          .on('hidden.bs.modal', on_modal_hidden)
        this._main.disableMouseCapture()
        this._main.disableKeyboardCapture()
        this._node_settings_controller = new PascoMainNodeSettingsController(this._main)
        await this._node_settings_controller.init(node)
      }
    } else {
      if(edit_overlay && evt.target != edit_overlay) {
        return // click was for overlay elements
      }
      // select
      evt.preventDefault()
      await this._pengine.changeCurrentNode(node, { silent: true })
    }
  }


  async onSave () {
    let user_dir_prefix = this._core.getEnvValue('user_dir_prefix')
    let onSaveSub = async (node) => {
      let promises = []

      let audio_reverts = node._more_meta.audio_reverts
      if (audio_reverts) {
        for (let name in audio_reverts) {
          if (audio_reverts[name] !== true) { // true is for first record
            let fnurl = this._core.resolveUrl(audio_reverts[name], this._tree_url)
            if (fnurl.indexOf(user_dir_prefix) == 0) {
              promises.push(this._fmanager.deleteFile(fnurl))
            }
          }
        }
        delete node._more_meta.audio_reverts
      }

      if (node.child_nodes) {
        for (let cnode of node.child_nodes) {
          promises.push(onSaveSub(cnode))
        }
      }
      await Promise.all(promises)
    }
    await onSaveSub(this._root_node)
  }

  async onRestore () {
    let onRestoreSub = async (node) => {
      let promises = []

      let audio_reverts = node._more_meta.audio_reverts
      if (audio_reverts) {
        for (let name in audio_reverts) {
          if (node.meta[name]) {
            let fnurl = this._core.resolveUrl(node.meta[name], this._tree_url)
            promises.push(this._fmanager.deleteFile(fnurl))
          }
          if (audio_reverts[name] !== true) { // true is for first record
            node.meta[name] = audio_reverts[name]
          } else {
            delete node.meta[name]
          }
        }
        delete node._more_meta.audio_reverts
      }

      if (node.child_nodes) {
        for (let cnode of node.child_nodes) {
          promises.push(onRestoreSub(cnode))
        }
      }
      await Promise.all(promises)
    }
    await onRestoreSub(this._root_node)
  }

  async save () {
    await this.onSave()
    let writer = new PascoTreeMDWriter()
    let tree_md = writer.writeToText(this._root_node)
    this._fmanager.saveFileData(this._tree_url, tree_md)
    await this._core.updateDataState()
    return this._root_node
  }
  async restore () {
    await this.onRestore()
    return this._restore_root_node
  }
}
