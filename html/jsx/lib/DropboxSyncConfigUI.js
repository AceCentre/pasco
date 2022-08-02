/* used global variables:
   1. _t (translate function)
   2. _ (lodash)
   3. show_error (shows an error message from, core.js)
   4. waitingDialog (included explicitly by script tag, bootstrap-waitingfor.min.js)
   5. show_message
*/
import $ from 'jquery'
import * as path from 'path'
import * as qs from 'querystring'
import PascoDataState from './PascoDataState'
import { getRuntimeEnv } from '../common'
import { NotFoundError } from '../exceptions'

export default class DropboxSyncConfigUI {
  constructor (dpsync, ctrelm) {
    this._ctrelm = ctrelm
    this._dpsync = dpsync
    this._auth_btn = ctrelm.querySelector('.auth-btn')
    this._revoke_btn = ctrelm.querySelector('.revoke-btn')
    this._auth_status = ctrelm.querySelector('.auth-status')
    this._select_folder_btn = ctrelm.querySelector('.select-folder-btn')
    this._selected_folder_status = ctrelm.querySelector('.selected-folder-status')
    this._save_btn = ctrelm.querySelector('.save-btn')
    this._load_btn = ctrelm.querySelector('.load-btn')
    this._select_folder_modal = ctrelm.querySelector('.select-folder-modal')
    this._main_loading_notice = ctrelm.querySelector('.main-loading-notice')
    this._main_error_alert = ctrelm.querySelector('.main-error-alert')
    window.dpsync = this._dpsync
  }
  init () {
    ;(async () => {
      this.hideErrorAlert()
      this.toggleLoadingNotice(true)
      this._ctrelm.classList.add('initiating')
      try {
        let query = qs.parse(window.location.search.substr(1))
        if (!!query.dropboxauth) {
          let locurl = window.location+''
          {
            let idx = locurl.indexOf('?')
            if (idx != -1) {
              locurl = locurl.substring(0, idx)
            }
          }
          let $error_modal
          if (query.code) {
            // authorize
            waitingDialog.show()
            try {
              await this._dpsync.authorizeWithCode(query.code)
            } catch (err) {
              console.error(err)
              $error_modal = show_error({ title: _t('Failed to authorize with dropbox'), message: err.message || 'Unknown error' })
            } finally {
              waitingDialog.hide()
            }
          } else {
            $error_modal = show_error({ title: _t('Failed to authorize with dropbox'), message: query.error || 'Unknown error' })
          }
          if ($error_modal) {
          // reload error modal has closed
            $error_modal.on('hide.bs.modal', () => {
              window.location = locurl + '#!sync'
            })
          } else {
            window.location = locurl + '#!sync'
          }
          return
        }
        let needs_auth = await this._updateAuthStatus()
        if (!needs_auth) {
          await this._updateSelectedFolder()
        }
      } catch (err) {
        this.onError(err)
      } finally {
        this._ctrelm.classList.remove('initiating')
        this.toggleLoadingNotice(false)
      }
    })()
    this._didClickSelectFolder = this.didClickSelectFolder.bind(this)
    this._didClickSave = this.didClickSave.bind(this)
    this._didClickLoad = this.didClickLoad.bind(this)
    this._select_folder_btn.addEventListener('click', this._didClickSelectFolder, false)
    this._save_btn.addEventListener('click', this._didClickSave, false)
    this._load_btn.addEventListener('click', this._didClickLoad, false)
    this._didClickAuthorize = this.didClickAuthorize.bind(this)
    this._auth_btn.addEventListener('click', this._didClickAuthorize, false)
    this._didClickRevoke = this.didClickRevoke.bind(this)
    this._revoke_btn.addEventListener('click', this._didClickRevoke, false)
  }
  setState (data) {
    this._pasco_data_state = data.pasco_data_state
    this._state_config_fn = data.config_fn
    this._state_trees_info_fn = data.trees_info_fn
  }
  toggleLoadingNotice (turn_on) {
    this._main_loading_notice.classList[turn_on ? 'remove' : 'add']('hidden')
  }
  onError (err, msg) {
    let sronly_elm = this._main_error_alert.querySelector('.sr-only')
    let text_elm = this._main_error_alert.querySelector('.text')
    sronly_elm.textContent = _t('Error:')
    text_elm.textContent = msg || err.message || 'Unknown error'
    this._main_error_alert.classList.remove('hidden')
    console.error(err)
  }
  hideErrorAlert () {
    this._main_error_alert.classList.add('hidden')
  }
  didClickSelectFolder () {
    let select_list = this._select_folder_modal.querySelector('.select-folder-list')
    let current_path = ""
    let current_path_elm = this._select_folder_modal.querySelector('.current-path')
    let more_btn = this._select_folder_modal.querySelector('.more-btn')
    let loading_notice = this._select_folder_modal.querySelector('.loading-notice')
    let select_btn = this._select_folder_modal.querySelector('.select-btn')
    let error_alert = this._select_folder_modal.querySelector('.error-alert')
    let didClose = () => {
      clear()
    }
    let didClickSelect = async () => {
      clear()
      let token = await this._dpsync.getToken()
      token.pasco_folder = current_path
      await this._dpsync.storeToken(token)
      this._updateSelectedFolder()
      $(this._select_folder_modal).modal('hide')
    }
    let clear = () => {
      $(this._select_folder_modal).off('hide.bs.modal', didClose)
      select_btn.removeEventListener('click', didClickSelect, false)
      more_btn.removeEventListener('click', didClickMore, false)
      select_list.removeEventListener('click', didClickOnList, false)
    }
    let setFoldersPath = (folderpath) => {
      updateCurrentPath(folderpath)
      select_list.innerHTML = ''
      cursor = this._dpsync.getFoldersCursor({ path: folderpath })
      loadMore()
    }
    let loadMore = async () => {
      if (!cursor || !cursor.hasMore()) {
        return
      }
      loading_notice.classList.remove('hidden')
      try {
        let resp = await cursor.fetch()
        let hasmore = cursor.hasMore()
        more_btn.classList[hasmore ? 'remove' : 'add']('hidden')
        addFoldersToList(resp.entries.filter((a) => a[".tag"] == 'folder'))
        _hideError()
      } catch (err) {
        let msg = _t('Failed to receive folders: ') + (err.message || 'Unknown error')
        _onError(err, msg)
      } finally {
        loading_notice.classList.add('hidden')
      }
    }
    let didClickMore = () => {
      loadMore()
    }
    let _hideError = () => {
      error_alert.classList.add('hidden')
    }
    let _onError = (err, msg) => {
      let sronly_elm = error_alert.querySelector('.sr-only')
      let text_elm = error_alert.querySelector('.text')
      sronly_elm.textContent = _t('Error:')
      text_elm.textContent = msg || err.message || 'Unknown error'
      error_alert.classList.remove('hidden')
      console.error(err)
    }
    let updateCurrentPath = (newpath) => {
      if (newpath[0] != '/') {
        newpath = '/' + newpath
      }
      if (newpath) {
        current_path_elm.textContent = newpath
        select_btn.disabled = false
      } else {
        current_path_elm.textContent = ''
        select_btn.disabled = true
      }
      current_path = newpath
    }
    let addFoldersToList = (records) => {
      for (let record of records) {
        let tmp = document.createElement('div')
        tmp.innerHTML = folder_item_tmpl(record)
        let elm = Array.from(tmp.childNodes).filter((a) => a.nodeType == Node.ELEMENT_NODE)[0]
        select_list.appendChild(elm)
      }
    }
    let didClickOnList = (event) => {
      let elm = event.target
      while (elm && elm != select_list) {
        if (elm.hasAttribute('data-name')) {
          event.stopPropagation()
          event.preventDefault()
          let name = elm.getAttribute('data-name')
          let folderpath = current_path ? path.join(current_path, name) : name
          setFoldersPath(folderpath)
          break
        }
        elm = elm.parentNode
      }
    }
    let cursor = null
    var folder_item_tmpl = _.template(this._select_folder_modal.querySelector('.select-folder-item-template').innerHTML)
    select_btn.addEventListener('click', didClickSelect, false)
    more_btn.addEventListener('click', didClickMore, false)
    select_list.addEventListener('click', didClickOnList, false)
    $(this._select_folder_modal).on('hide.bs.modal', didClose)
    $(this._select_folder_modal).modal('show')
    setFoldersPath(current_path)
  }
  didClickAuthorize () {
    // for cordova generate another link
    if (getRuntimeEnv() == 'cordova') {
      let redirect_uri = 'pasco:///edit-config.html?' + qs.stringify({ dropboxauth: '1' })
      window.open(this._dpsync.getAuthorizeLink({ redirect_uri }), '_system')
    } else {
      let locurl = (window.location+'')
      if (locurl.indexOf('#') != -1) {
        locurl = locurl.substring(0, locurl.indexOf('#'))
      }
      let redirect_uri = locurl + (locurl.indexOf('?') == -1 ? '?' : '&') + qs.stringify({ dropboxauth: '1' }) + (window.location.hash||'')
      window.location = this._dpsync.getAuthorizeLink({ redirect_uri })
    }
  }
  async didClickRevoke () {
    try {
      await this._dpsync.revokeAuth()
    } catch (err) {
      console.error(err)
      let $error_modal = show_error({ title: _t('Failed to revoke authorization'), message: err.message || 'Unknown error' })
      this._dpsync.storeToken()
    } finally {
      this._updateAuthStatus()
    }
  }
  async didClickSave () {
    if (!confirm(_t('This action will overwrite existing pasco data on dropbox, Please confirm you the action'))) {
      return
    }
    waitingDialog.show()
    try {
      let token = await this._dpsync.getToken()
      if (!token.pasco_folder) {
        throw new Error('pasco_folder is not defined')
      }
      let should_restart = false
      let datastate = this._pasco_data_state
      if (!datastate) {
        if (!this._state_config_fn || !this._state_trees_info_fn) {
          throw new Error('state config or trees_info is not defined!')
        }
        if (!confirm('Cannot save to dropbox in the legacy version, Would you like to update to v1?')) {
          return
        }
        let state_dir_url = (window.cordova ? window.cordova_user_dir_prefix : 'file:///') + 'v1/'
        datastate = await PascoDataState.rebuildStateFromLegacy(this._state_config_fn, this._state_trees_info_fn, state_dir_url)
        should_restart = true
      }
      // get existing pasco-state.json
      let pasco_state_src = path.join(token.pasco_folder, 'pasco-state.json')
      let state = datastate.getData()
      let dpstate
      try {
        let dpstate_txt = await this._dpsync.downloadFileContent(pasco_state_src)
        let doubleconfirm = false
        try {
          dpstate = JSON.parse(dpstate_txt)
          doubleconfirm = dpstate && dpstate.id != state.id
        } catch (err) {
          console.error('dpstate parse json failed', err)
          doubleconfirm = true
        }
        if (doubleconfirm) {
          if (!confirm(_t('The id of dropbox pasco-state is not equal to current state id. Would you like to delete the current state of pasco on dropbox?'))) {
            return
          }
          if (!confirm(_t('This action is not reversible, Are you sure you want to delete the current pasco state on dropbox?'))) {
            return
          }
        }
      } catch (err) {
        if (!(err instanceof NotFoundError)) {
          throw err
        }
      }
      let bkgtask = this._dpsync.updateToFolder(datastate, dpstate, token.pasco_folder)
      await bkgtask.getPromise()
      let $message_modal = show_message({ title: _t('Update was successful'), message: '' })
      if (should_restart) {
        $message_modal.on('hide.bs.modal', () => {
          location.reload()
        })
      }
    } catch (err) {
      console.error(err)
      let $error_modal = show_error({ title: _t('Failed to save to dropbox'), message: err.message || 'Unknown error' })
    } finally {
      waitingDialog.hide()
    }
  }
  async didClickLoad () {
    if (!confirm(_t('This action will overwrite existing pasco data, Please confirm you the action'))) {
      return
    }
    waitingDialog.show()
    try {
      let token = await this._dpsync.getToken()
      if (!token.pasco_folder) {
        throw new Error('pasco_folder is not defined')
      }
      let should_restart = true
      let state_dir_url = (window.cordova ? window.cordova_user_dir_prefix : 'file:///') + 'v1/'
      let datastate = this._pasco_data_state
      let target_dir_url
      if (datastate) {
        target_dir_url = datastate.getStateDirUrl()
      } else {
        target_dir_url = state_dir_url
      }

      // get pasco-state.json from dropbox
      let pasco_state_src = path.join(token.pasco_folder, 'pasco-state.json')
      let state = datastate ? datastate.getData() : null
      let dpstate = JSON.parse(await this._dpsync.downloadFileContent(pasco_state_src))
      if (!dpstate) {
        throw new Error('pasco-state.json is not defined')
      }
      if (!state || dpstate.id != state.id) {
        if (!confirm(_t('The id of current pasco-state is not equal to dropbox state id. Would you like to delete the current state from your local storage?'))) {
          return
        }
        if (!confirm(_t('This action is not reversible, Are you sure you want to delete the current local pasco state?'))) {
          return
        }
      }

      let bkgtask = this._dpsync.updateFromFolder(datastate, dpstate, token.pasco_folder, target_dir_url)
      await bkgtask.getPromise()
      let $message_modal = show_message({ title: _t('Update was successful'), message: '' })
      if (should_restart) {
        $message_modal.on('hide.bs.modal', () => {
          location.reload()
        })
      }
    } catch (err) {
      console.error(err)
      let $error_modal = show_error({ title: _t('Failed to load from dropbox'), message: err.message || 'Unknown error' })
    } finally {
      waitingDialog.hide()
    }
  }
  async _updateSelectedFolder () {
    let token = await this._dpsync.getToken()
    if (token.pasco_folder) {
      this._selected_folder_status.textContent = _t('Selected folder: ') + token.pasco_folder
    } else {
      this._selected_folder_status.textContent = _t('Please select a folder for pasco data')
    }
    this._ctrelm.classList[!token.pasco_folder ? 'add' : 'remove']('needs-setup')
  }
  async _updateAuthStatus () {
    let needs_auth = await this._dpsync.needAuthorization()
    if (needs_auth) {
      this._auth_status.textContent = _t('Authorization is required with dropbox')
    } else {
      this._auth_status.textContent = _t('Dropbox account is connected')
    }
    this._auth_btn.classList[needs_auth ? 'remove' : 'add']('hidden')
    this._revoke_btn.classList[!needs_auth ? 'remove' : 'add']('hidden')
    this._ctrelm.classList[needs_auth ? 'add' : 'remove']('needsauth')
    return needs_auth
  }
}

