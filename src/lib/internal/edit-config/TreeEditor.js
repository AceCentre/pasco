import * as bootbox from 'bootbox'
import * as waitingDialog from 'bootstrap-waitingfor'
import { fsFriendlyName } from '../../../helpers/common'
import EventManager from '../../../helpers/EventManager'
import { NotFoundError } from '../../exceptions'
import PascoTree from '../../PascoTree'
import TreeExporter from './TreeExporter'
import TreeImporter from './TreeImporter'

export default class TreeEditor {
  constructor (editConfigPage) {
    this._editConfigPage = editConfigPage
    this._core = this._editConfigPage.getCore()
    this._fmanager = this._core.getFileManager()
    this._t = this._core.getLocalizer().t
    let document = this._document = this._editConfigPage.getDocument()
    this._$ = document.querySelector.bind(document)
    this._$a = document.querySelectorAll.bind(document)
    this._event_manager = new EventManager()
    this._importer = new TreeImporter(this._core)
    this._exporter = new TreeExporter(this._core)
  }
  init () {
    this._updateSelectedTree()
    // #tree-name-input
    for (let elm of this._$a('#tree-name-input')) {
      this._event_manager.addDOMListenerFor(elm, 'change', this.didChangeEditorTree.bind(this), false)
    }
    // #tree-new-btn
    for (let elm of this._$a('#tree-new-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', this.didClickNewTreeButton.bind(this), false)
    }
    // #tree-delete-btn
    for (let elm of this._$a('#tree-delete-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', this.didClickDeleteTreeButton.bind(this), false)
    }
    for (let elm of this._$a('#tree-default-select')) {
      this._event_manager.addDOMListenerFor(elm, 'change', this.didChangeDefaultTreeSelect.bind(this), false)
    }
    this.didChangeDefaultTreeSelect()
    for (let elm of this._$a('#tree-revert')) {
      this._event_manager.addDOMListenerFor(elm, 'click', this.didClickRevertTree.bind(this), false)
    }
    for (let elm of this._$a('form[name=edit-tree]')) {
      this._event_manager.addDOMListenerFor(elm, 'submit', this.didSubmitTreeForm.bind(this), false)
    }
    // import/export tree as zip or plain text
    for (let elm of this._$a('#tree-import-inp')) {
      this._event_manager.addDOMListenerFor(elm, 'change', this.didSelectFileToImportTree.bind(this), false)
    }
    for (let elm of this._$a('#tree-export-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', this.didClickExportTree.bind(this), false)
    }
    // import/export obz files
    for (let elm of this._$a('#tree-export-obz-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', this.didClickExportTreeAsOBZ.bind(this), false)
    }
    for (let elm of this._$a('#tree-import-obz-inp')) {
      this._event_manager.addDOMListenerFor(elm, 'change', this.didSelectOBZFileToImportTree.bind(this), false)
    }
    // load a default tree
    for (let elm of this._$a('#tree-default-select-load-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', this.didClickLoadDefaultTree.bind(this), false)
    }
  }
  destroy () {
    this._event_manager.removeAllListeners()
  }

  async loadTreeByName (name) {
    let trees_info_url = this._editConfigPage.getTreesInfoUrl()
    let trees_info = this._editConfigPage.getTreesInfo()
    let entry = trees_info.list.find((a) => a.name == name)
    if (!entry) {
      throw new Error('tree not found, tree name: ' + name)
    }
    return await this.loadTreeFromFile(this._core.resolveUrl(entry.tree_fn, trees_info_url))
  }
  async loadTreeFromFile (tree_url) {
    try {
      this._tree = new PascoTree(this._core)
      await this._tree.initAndReadFromFile(tree_url)
      this.setTreeData(this._tree.getTreeData())
      this._tree_url = this._tree.getTreeUrl()
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error
      }
      this._tree_url = tree_url
      this.setTreeData('')
    } finally {
      this._updateSelectedTree()
    }
  }
  getTreeUrl () {
    return this._tree_url
  }
  getTreeData () {
    return this._tree_data
  }
  async saveTreeDataFromInput () {
    this._updateTreeDataFromInput()
    await this._fmanager.saveFileData(this.getTreeUrl(), this._tree_data)
    await this._core.updateDataState()
  }
  setTreeData (tree_data) {
    this._tree_data = tree_data
    this._insertInputTreeData(tree_data)
  }
  _updateTreeDataFromInput () {
    let tree_input = this._$('form[name=edit-tree] [name=tree-input]')
    if (!tree_input) {
      throw new Error('[name=tree-input] not found!')
    }
    this._tree_data = tree_input.value
  }
  _insertInputTreeData (tree_data) {
    let tree_input = this._$('form[name=edit-tree] [name=tree-input]')
    if (tree_input) {
      tree_input.value = tree_data
    }
  }

  async getDefaultTreeUrl (name, locale) {
    let file_url = 'trees/' + name + '/' + locale + '-' + name + '.md'
    let default_locale = this._core.getEnvValue('default_locale')
    try {
      await this._fmanager.loadFileData(file_url)
    } catch (err) {
      if (default_locale == locale) {
        throw err
      }
      file_url = 'trees/' + name + '/' + default_locale + '-' + name + '.md'
      try {
        await this._fmanager.loadFileData(file_url)
      } catch (err2) {
        file_url = 'trees/' + name + '/' + name + '.md'
        await this._fmanager.loadFileData(file_url)
      }
    }
    return new URL(file_url, location+'').href
  }
  async getDefaultTreeData (name, locale) {
    let file_url = await this.getDefaultTreeUrl(name, locale)
    return await this._fmanager.loadFileData(file_url)
  }

  /****** START EVENT HANDLERS ******/
  async didSubmitTreeForm (evt) {
    evt.preventDefault()
    try {
      await this.saveTreeDataFromInput()
      this.alertWithNotice({ type: 'success', message: 'Saved!' })
    } catch (error) {
      this.alertWithNotice({ type: 'failure', error })
    }
  }
  didClickRevertTree () {
    this._insertInputTreeData(this._tree_data)
  }
  didChangeDefaultTreeSelect () {
    var value = this._$('#tree-default-select').value
    for (let elm of this._$a('#tree-default-select-load-btn')) {
      elm.disabled = !value
    }
  }
  // this method is called by EditConfigPage
  async didChangeEditorTree (evt) {
    let trees_info_url = this._editConfigPage.getTreesInfoUrl()
    let tree_input = this._$('form[name=edit-tree] [name=tree-input]')
    tree_input.disabled = true
    try {
      await this.loadTreeFromFile(this._core.resolveUrl(evt.target.value, trees_info_url))
    } finally {
      tree_input.disabled = false
    }
  }
  didClickNewTreeButton () {
    bootbox.prompt(this._t("Please write a name for the new tree"), async (name) => {
      if (!name) {
        this.alertWithNotice({ type: 'failure', message: this._t("Empty name is not allowed") })
      } else {
        // disable buttons
        for (let btn of this._$a('#tree-delete-btn,#tree-name-input')) {
          btn.disabled = true
        }
        try {
          let trees_info_url = this._editConfigPage.getTreesInfoUrl()
          let tmp = fsFriendlyName(name)
          let tree_fn = tmp + '/' + tmp + '.md'
          let tree_url = this._core.resolveUrl(tree_fn, trees_info_url)
          let dir_url = this._core.resolveUrl(tmp, trees_info_url)
          await this._fmanager.mkdirRec(dir_url)
          await this._fmanager.saveFileData(tree_url, '')
          let trees_info = this._editConfigPage.getTreesInfo()
          trees_info.list.push({ name, tree_fn })
          await this._editConfigPage.saveTreesInfo(trees_info)
          await this._core.updateDataState()
          await this.loadTreeFromFile(tree_url)
          this.alertWithNotice({ type: 'success', message: 'Tree added' })
        } catch (error) {
          this.alertWithNotice({ type: 'failure', error })
        } finally {
          // enable buttons
          for (let btn of this._$a('#tree-delete-btn,#tree-name-input')) {
            btn.disabled = false
          }
        }
      }
    })
  }
  didClickDeleteTreeButton () {
    let config = this._editConfigPage.getConfig()
    let trees_info_url = this._editConfigPage.getTreesInfoUrl()
    let trees_info = this._editConfigPage.getTreesInfo()
    if (trees_info.list.length == 1) {
      this.alertWithNotice({ type: 'failure', message: this._t("Could not delete the last item. Try the New button") })
    } else {
      bootbox.confirm(this._t("Are you sure you want to delete this item?"), async (confirmed) => {
        if (!confirmed) {
          return
        }
        let tree_fn = this._$('#tree-name-input').value
        let ptree_info_idx = trees_info.list.findIndex((a) => a.tree_fn == tree_fn)
        if (ptree_info_idx == -1) {
          this.alertWithNotice({ type: 'failure', message: this._t("Could not delete, tree info not found!") })
        } else {
          // disable buttons
          for (let btn of this._$a('#tree-delete-btn,#tree-name-input')) {
            btn.disabled = true
          }
          try {
            let tinfo = trees_info.list[ptree_info_idx];
            let datastate = this._core.getDataState()
            await datastate.deleteTree(this._core.resolveUrl(tinfo.tree_fn, trees_info_url))
            trees_info.list.splice(ptree_info_idx, 1);
            var nexttinfo = trees_info.list.length > ptree_info_idx ?
                trees_info.list[ptree_info_idx] :
                trees_info.list[trees_info.list.length - 1];
            await this._editConfigPage.saveTreesInfo(trees_info)
            // change tree if it has been deleted
            if (config.tree == tree_fn) {
              config.tree = ''
              await this._editConfigPage.saveConfig(config)
            }
            await this._core.updateDataState()
            await this.loadTreeFromFile(this._core.resolveUrl(nexttinfo.tree_fn, trees_info_url))
            this.alertWithNotice({ type: 'success', message: 'Tree deleted' })
          } catch (error) {
            this.alertWithNotice({ type: 'failure', error })
          } finally {
            // enable buttons
            for (let btn of this._$a('#tree-delete-btn,#tree-name-input')) {
              btn.disabled = false
            }
          }
        }
      })
    }
  }
  async didClickExportTree (evt) {
    evt.preventDefault()
    let btn = this._$('#tree-export-btn')
    if(btn._working) {
      return
    }
    btn._working = true
    waitingDialog.show()
    try {
      let zipblob = await this._exporter.exportTreeToZipBlob(this._tree)
      this._editConfigPage.displaySaveModal('tree.zip', zipblob)
    } catch (error) {
      this.displayError(error)
    } finally {
      btn._working = false
      waitingDialog.hide()
    }
  }
  async didSelectFileToImportTree (evt) {
    let files = evt.target.files
    if (files && files.length > 0) {
      var file = files[0]
      if(file.type.indexOf('text/') == 0) {
        var reader = new FileReader();
        reader.onload = () => {
          this.setTreeData(reader.result)
        }
        reader.readAsText(file);
      } else {
        waitingDialog.show()
        try {
          // TODO:: ask the user if they want to import the tree as a new entry
          // At the moment the current open tree is used as destination to import the tree
          let tree_url = this.getTreeUrl()
          await this._importer.importTreeFromZipFile(file, tree_url)
          // update tree from file
          await this.loadTreeFromFile(tree_url)
        } catch (error) {
          this.displayError(error)
        } finally {
          waitingDialog.hide()
        }
      }
    }
  }
  async didClickExportTreeAsOBZ (evt) {
    evt.preventDefault()
    waitingDialog.show()
    try {
      let zipblob = await this._exporter.exportTreeAsOBZBlob(this._tree, { row_len: 5 })
      this._editConfigPage.displaySaveModal('tree.obz', zipblob)
    } catch (error) {
      this.displayError(error)
    } finally {
      waitingDialog.hide()
    }
  }
  async didSelectOBZFileToImportTree (evt) {
    let files = evt.target.files
    if (files && files.length > 0) {
      let file = files[0]
      waitingDialog.show()
      try {
        // TODO:: ask the user if they want to import the tree as a new entry
        // At the moment the current open tree is used as destination to import the tree
        let tree_url = this.getTreeUrl()
        await this._importer.importTreeFromOBZFile(file, tree_url)
        // update tree from file
        await this.loadTreeFromFile(tree_url)
      } catch (error) {
        this.alertWithNotice({ type: 'failure', error })
      } finally {
        waitingDialog.hide()
      }
    }
  }
  async didClickLoadDefaultTree () {
    try {
      let locale = this._editConfigPage.getLocale()
      let default_tree_select = this._$('#tree-default-select')
      if (!default_tree_select) {
        throw new Error('Cannot find #tree-default-select')
      }
      let default_name = default_tree_select.value
      let name = await (new Promise((resolve, reject) => {
        bootbox.prompt(this._t("Please write a name for the new tree"), resolve)
      }))
      if (!name) {
        this.alertWithNotice({ type: 'failure', message: this._t('Empty name is not allowed')})
        return // exit
      }
      let trees_info_url = this._editConfigPage.getTreesInfoUrl()
      let trees_info = this._editConfigPage.getTreesInfo()
      let basename = fsFriendlyName(name)
      let dest_name = name
      let dest_filename = basename + '/' + basename + '.md'
      let exists = !!trees_info.list.find((a) => a.name == dest_name || a.tree_fn == dest_filename)
      for (let i = 0; i < 1000; i++) {
        if (!exists) {
          break
        }
        let suffix = '_' + (i + 1)
        dest_name = name + suffix
        dest_filename = basename + suffix + '/' + basename + '.md'
        exists = !!trees_info.list.find((a) => a.name == dest_name || a.tree_fn == dest_filename)
      }
      if (exists) {
        throw new Error('A tree with this name already exists!')
      }
      let default_file_url = await this.getDefaultTreeUrl(default_name, locale)
      let datastate = this._core.getDataState()
      let host_tree_dir_prefix = this._core.getEnvValue('host_tree_dir_prefix')
      await datastate.storeTree(dest_filename, default_file_url, new URL(host_tree_dir_prefix, location+'').href)
      // add the tree to trees_info
      trees_info.list.push({ name: dest_name, tree_fn: dest_filename })
      await this._editConfigPage.saveTreesInfo(trees_info)
      await this._core.updateDataState()
      await this.loadTreeFromFile(this._core.resolveUrl(dest_filename, trees_info_url))
      this.alertWithNotice({ type: 'success', message: 'Saved!' })
    } catch (error) {
      this.displayError(error)
    }
  }
  /******  END EVENT HANDLERS ******/
  
  alertWithNotice (...args) {
    return this._editConfigPage.alertWithNotice(...args)
  }
  displayError (...args) {
    return this._editConfigPage.displayError(...args)
  }
  _updateSelectedTree () {
    let config = this._editConfigPage.getConfig()
    let config_tree = config.tree
    let trees_info = this._editConfigPage.getTreesInfo()
    let trees_info_url = this._editConfigPage.getTreesInfoUrl()
    for (let select_elm of this._$a('.tree-name-selection')) {
      select_elm.innerHTML = ''
      if (!trees_info) {
        continue // no entries!
      }
      trees_info.list.forEach((item) => {
        let option = this._document.createElement('option')
        option.setAttribute('value', item.tree_fn)
        option.textContent = item.name
        select_elm.appendChild(option)
        // set selected state
        let selected = false
        if (select_elm.id == 'tree-name-input') {
          let tree_url = this._core.resolveUrl(item.tree_fn, trees_info_url)
          selected = tree_url == this._tree_url // (current_tree_url)
        } else {
          selected = item.tree_fn == config_tree
        }
        if (selected) {
          option.setAttribute('selected',  '')
        } else {
          option.removeAttribute('selected')
        }
      })
    }
  }
}
