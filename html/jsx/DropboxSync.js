// expected global variables
//   from core.js: set_file_data, get_file_data, mkdir_rec
import { BackgroundTask, PascoState, getRuntimeEnv } from './common'
import { NotFoundError, AccessDeniedError, ErrorMessage } from './exceptions'
import * as qs from 'querystring'
import * as path from 'path'
import * as delay from 'delay'
import PascoDataState from './PascoDataState'

let PASCO_BACKEND_URL = process.env.PASCO_BACKEND_URL
let DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY

let DPAPI2_URL = 'https://api.dropboxapi.com/2'
let DPAPI2_CONTENT_URL = 'https://content.dropboxapi.com/2'

export async function dropbox_request_token (data) {
  let request = new Request(PASCO_BACKEND_URL + '/dropbox-oauth-token', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  let resp = await fetch(request)
  let respdata = await resp.json()
  let tokendata = respdata ? respdata.data : null
  let resp_status = respdata && respdata.status_code ? respdata.status_code : resp.status
  if (!tokendata || !tokendata.access_token ||
      !(tokendata.expires_in > 0) || (data.grant_type != 'refresh_token' && !tokendata.refresh_token)) {
    console.warn(`Unexpected output from ${resp.url}, response [${resp_status}]:`, respdata)
    let failmsg = `Could not authenticate with dropbox`
    if (resp_status == 404 || resp_status == 403) {
      throw new AccessDeniedError(failmsg)
    }
    throw new ErrorMessage(`${failmsg}, Unexpected response from dropbox servers`)
  }
  tokendata.expires_at = Math.floor(new Date().getTime() / 1000) + tokendata.expires_in
  return tokendata
}

export async function dropbox_revoke_token (access_token) {
  let headers = {
    'Authorization': 'Bearer ' + access_token,
  }
  let request = new Request(DPAPI2_URL + "/auth/token/revoke", Object.assign({ method: 'POST', headers }))
  let resp = await fetch(request)
  let data_txt = await resp.text()
  let data, json_error
  try {
    if (data_txt) {
      data = JSON.parse(data_txt)
    }
  } catch (err) {
    json_error = err
  }
  if (resp.status != 200) {
    if (resp.status == 403) {
      throw new AccessDeniedError(data && data.error_summary ? data.error_summary : 'Access denied to the resource')
    }
    console.log(resp.statusText + ' [' + resp.status + '] ' + (data && data.error_summary ? data.error_summary : 'Unexpected error'), '\nbody: ', data_txt)
    throw new Error(resp.statusText + ' [' + resp.status + '] ' + (data && data.error_summary ? data.error_summary : 'Unexpected error'))
  }
}

export async function dropbox_validate_token (tokenhandler) {
  let tokendata = await tokenhandler.get()
  if (!tokendata) {
    throw new AccessDeniedError('Dropbox token not found!')
  }
  let ctime = Math.floor(new Date().getTime() / 1000) + 20
  // check if access_token is expired or time is not close to expire_at
  if (tokendata.expires_at < ctime || Math.abs(tokendata.expires_at - ctime) > tokendata.expires_in) {
    try {
      let refresh_token = tokendata.refresh_token
      let new_tokendata = await dropbox_request_token({ refresh_token, grant_type: 'refresh_token' })
      tokendata.token_type = new_tokendata.token_type
      tokendata.access_token = new_tokendata.access_token
      tokendata.expires_in = new_tokendata.expires_in
      tokendata.expires_at = new_tokendata.expires_at
      await tokenhandler.store(tokendata)
    } catch (err) {
      if ((err instanceof AccessDeniedError)) {
        await tokenhandler.store(null)
      }
      throw err
    }
  }
  return tokendata  
}

export async function dropbox_upload_file (filepath, body, options, tokenhandler) {
  if (!window.fetch) {
    throw new Error('fetch is not defined!')
  }
  let token = await dropbox_validate_token(tokenhandler)
  let headers = {
    'Authorization': 'Bearer ' + token.access_token,
    'Content-Type': 'text/plain; charset=dropbox-cors-hack',
    'Dropbox-API-Arg': JSON.stringify(Object.assign({ path: filepath, mode: 'overwrite' }, options)),
  }
  if (body instanceof File) { // convert file to blob
    body = await (new Promise((resolve) => {
      let reader = new FileReader()
      reader.onload = () => {
        resolve(new Blob([reader.result], { type: body.type }))
      }
      reader.readAsArrayBuffer(body)
    }))
  }
  let req = new Request(DPAPI2_CONTENT_URL + '/files/upload', { method: 'POST', body, headers })
  let resp = await fetch(req)
  let respdata = await resp.json()
  if (resp.status == 404) {
    throw new NotFoundError(respdata && respdata.error_summary ? respdata.error_summary : 'Resource not found')
  }
  if (resp.status == 403) {
    throw new AccessDeniedError(respdata && respdata.error_summary ? respdata.error_summary : 'Access denied to the resource')
  }
  if (resp.status >= 400 || !respdata) {
    console.log(resp.statusText + ' [' + resp.status + '] ' + (respdata && respdata.error_summary ? respdata.error_summary : 'Unexpected error'), '\nbody: ', JSON.stringify(respdata, null, '  '))
    throw new Error(resp.statusText + ' [' + resp.status + '] ' + (respdata && respdata.error_summary ? respdata.error_summary : 'Unexpected error'))
  }
  return respdata
}

export async function dropbox_download_file (filepath, tokenhandler) {
  if (!window.fetch) {
    throw new Error('fetch is not defined!')
  }
  let token = await dropbox_validate_token(tokenhandler)
  let headers = {
    'Authorization': 'Bearer ' + token.access_token,
    // 'Content-Type': 'text/plain; charset=dropbox-cors-hack',
    'Dropbox-API-Arg': JSON.stringify({ path: filepath }),
  }
  let req = new Request(DPAPI2_CONTENT_URL + '/files/download', { method: 'POST', body: '', headers })
  let resp = await fetch(req)
  let errobj = null
  if (resp.status >= 400) {
    try {
      errobj = await resp.json()
    } catch (err) {
      // pass
    }
  }
  if (resp.status == 404 ||
      (errobj && errobj.error && errobj.error.path &&
       errobj.error.path['.tag'] &&
       errobj.error.path['.tag'] == 'not_found')) {
    throw new NotFoundError(errobj && errobj.error_summary ? errobj.error_summary : 'Resource not found')
  }
  if (resp.status == 403) {
    throw new AccessDeniedError(errobj && errobj.error_summary ? errobj.error_summary : 'Access denied to the resource')
  }
  if (resp.status >= 400) {
    console.log(resp.statusText + ' [' + resp.status + '] ' + (errobj && errobj.error_summary ? errobj.error_summary : 'Unexpected error'), '\nbody: ', JSON.stringify(errobj, null, '  '))
    throw new Error(resp.statusText + ' [' + resp.status + '] ' + (errobj && errobj.error_summary ? errobj.error_summary : 'Unexpected error'))
  }
  let result
  try {
    result = JSON.parse(resp.headers.get('Dropbox-Api-Result'))
  } catch (err) {
    // pass
  }
  return { data: result, body: resp.body, response: resp }
}

export async function dropbox_json_request (method, link, body, tokenhandler) {
  if (!window.fetch) {
    throw new Error('fetch is not defined!')
  }
  let token = await dropbox_validate_token(tokenhandler)
  let headers = {
    'Authorization': 'Bearer ' + token.access_token,
  }
  if (method == 'POST') {
    // headers['Content-Type'] = 'application/json'
    headers['Content-Type'] = 'text/plain; charset=dropbox-cors-hack'
    body = JSON.stringify(body)
  }
  /*
  link = link + (link.indexOf('?') == -1 ? '?' : '&') + qs.stringify({
    reject_cors_preflight: 'true'
  })
  */
  let req = new Request(link, Object.assign({ method, body, headers }))
  let resp = await fetch(req)
  let data_txt = await resp.text()
  let data, json_error
  try {
    data = JSON.parse(data_txt)
  } catch (err) {
    json_error = err
  }
  if (resp.status == 404) {
    throw new NotFoundError(data && data.error_summary ? data.error_summary : 'Resource not found')
  }
  if (resp.status == 403) {
    throw new AccessDeniedError(data && data.error_summary ? data.error_summary : 'Access denied to the resource')
  }
  if (resp.status >= 400) {
    console.log(resp.statusText + ' [' + resp.status + '] ' + (data && data.error_summary ? data.error_summary : 'Unexpected error'), '\nbody: ', data_txt)
    throw new Error(resp.statusText + ' [' + resp.status + '] ' + (data && data.error_summary ? data.error_summary : 'Unexpected error'))
  }
  if (json_error) {
    throw json_error
  }
  return data
}

export class DropboxResourceCursor {
  constructor (params, link, continue_link, tokenhandler) {
    this._params = params
    this._has_initiated = false
    this._link = link
    this._continue_link = continue_link
    this._tokenhandler = tokenhandler
    this._cursor = null
  }
  _updateCursor (resp) {
    this._cursor = resp.has_more ? resp.cursor : null
  }
  async fetch () {
    if (!this._has_initiated) {
      this._has_initiated = true
      let resp = await dropbox_json_request('POST', this._link, this._params, this._tokenhandler)
      this._updateCursor(resp)
      return resp
    } else {
      if (!this._cursor) {
        throw new Error('Cursor has ended')
      }
      let body = { cursor: this._cursor }
      let resp = await dropbox_json_request('POST', this._continue_link, body, this._tokenhandler)
      this._updateCursor(resp)
      return resp
    }
  }
  hasMore () {
    return !this._has_initiated || !!this._cursor
  }
}

export default class DropboxSync {
  constructor (tokenhandler) {
    this._tokenhandler = tokenhandler
  }
  _dropbox_json_request (method, link, body) {
    return dropbox_json_request(method, link, body, this._tokenhandler)
  }
  async _delete_batch_sync (data) {
    let result = await dropbox_json_request('POST', DPAPI2_URL + '/files/delete_batch', data, this._tokenhandler)
    if (result['.tag'] != 'async_job_id') {
      return result
    }
    let async_job_id = result.async_job_id
    if (!async_job_id) {
      throw new Error('async_job_id is not defined!')
    }
    do {
      console.log('delete_batch', result)
      await delay(5 * 1000)
      result = await dropbox_json_request('POST', DPAPI2_URL + '/files/delete_batch/check', { async_job_id }, this._tokenhandler)
    } while (result['.tag'] == 'in_progress')
    return result
  }
  async _create_folder_batch_sync (data) {
    let result = await dropbox_json_request('POST', DPAPI2_URL + '/files/create_folder_batch', data, this._tokenhandler)
    if (result['.tag'] != 'async_job_id') {
      return result
    }
    let async_job_id = result.async_job_id
    if (!async_job_id) {
      throw new Error('async_job_id is not defined!')
    }
    do {
      console.log('create_batch', result)
      await delay(5 * 1000)
      result = await dropbox_json_request('POST', DPAPI2_URL + '/files/create_folder_batch/check', { async_job_id }, this._tokenhandler)
    } while (result['.tag'] == 'in_progress')
    return result
  }
  async needAuthorization () {
    try {
      await dropbox_validate_token(this._tokenhandler)
      return false
    } catch (err) {
      if (err instanceof AccessDeniedError) {
        return true
      } else {
        throw err
      }
    }
  }
  getTokenHandler () {
    return this._tokenhandler
  }
  getToken () {
    return this._tokenhandler.get()
  }
  storeToken (v) {
    return this._tokenhandler.store(v)
  }
  async authorizeWithCode (code) {
    let token = await dropbox_request_token({ grant_type: 'authorization_code', code })
    await this.storeToken(token)
  }
  async revokeAuth () {
    let token = await this._tokenhandler.get()
    if (token && token.access_token) {
      await dropbox_revoke_token(token.access_token)
    }
    await this._tokenhandler.store(null)
  }
  getAuthorizeLink (state) {
    let state_data = JSON.stringify(state)
    return `https://www.dropbox.com/oauth2/authorize?` + qs.stringify({
      client_id: DROPBOX_APP_KEY,
      redirect_uri: PASCO_BACKEND_URL + '/dropbox-oauth-return',
      state: state_data,
      response_type: 'code',
      token_access_type: 'offline',
    })
  }
  getFoldersCursor (params) {
    return new DropboxResourceCursor(params, DPAPI2_URL + '/files/list_folder', DPAPI2_URL + '/files/list_folder/continue', this._tokenhandler)
  }
  async downloadFileContent (filepath) {
    let result = await dropbox_download_file(filepath, this._tokenhandler)
    return await result.response.text()
  }
  async downloadFile (filepath) {
    return await dropbox_download_file(filepath, this._tokenhandler)
  }
  async uploadFile (filepath, body, options) {
    return await dropbox_upload_file(filepath, body, options, this._tokenhandler)
  }
  updateFromFolder (datastate, dpstate, source_folder, target_dir_url) {
    let task = new BackgroundTask()
    task.setPromise(new Promise(async (resolve, reject) => {
      try {
        // gather actions
        let write_actions = []
        let delete_actions = []
        let state = datastate ? datastate.getData() : null
        // add write actions
        for (let dpfile of dpstate.files) {
          let file = state ? state.files.find((a) => a.src == dpfile.src) : null
          if (file && file.checksum == dpfile.checksum) {
            continue // skip
          }
          write_actions.push({ src: dpfile.src })
        }
        write_actions.push({ src: 'pasco-state.json' })
        // add delete actions
        if (state) {
          for (let file of state.files) {
            let dpfile = dpstate.files.find((a) => a.src == file.src)
            if (!file) {
              delete_actions.push({ src: file.src })
            }
          }
        }
        // create all sub directories
        {
          let dirs_made = {}
          await mkdir_rec(target_dir_url)
          dirs_made[target_dir_url] = true
          for (let { src } of write_actions) {
            let subdir = path.dirname(src)
            if (!subdir) {
              continue
            }
            let subdir_url = new URL(subdir, target_dir_url).href
            if (!dirs_made[subdir_url]) {
              await mkdir_rec(subdir_url)
              dirs_made[subdir_url] = true
            }
          }
        }
        // perform write actions
        for (let { src } of write_actions) {
          let result = await this.downloadFile(path.join(source_folder, src))
          let body = await result.response.blob()
          await set_file_data(new URL(src, target_dir_url).href, body)
        }
        // perform delete actions
        if (datastate) {
          for (let { src } of delete_actions) {
            await unset_file(datastate.get_file_url(src))
          }
        }
        datastate = await PascoDataState.loadFromFile(new URL('pasco-state.json', target_dir_url).href)
        resolve(datastate)
      } catch (err) {
        reject(err)
      }
    }))
    return task
  }
  updateToFolder (datastate, dpstate, target_folder) {
    let task = new BackgroundTask()
    task.setPromise(new Promise(async (resolve, reject) => {
      try {
        // gather actions
        let write_actions = []
        let delete_actions = []
        let state = datastate.getData()
        // add write actions
        for (let file of state.files) {
          let dpfile = dpstate ? dpstate.files.find((a) => a.src == file.src) : null
          if (dpfile && file.checksum == dpfile.checksum) {
            continue // skip
          }
          write_actions.push({ src: file.src, src_url: datastate.get_file_url(file.src) })
        }
        write_actions.push({ src: 'pasco-state.json', src_url: datastate.getStateSrcUrl() })
        // add delete actions
        if (dpstate) {
          for (let dpfile of dpstate.files) {
            let file = state.files.find((a) => a.src == dpfile.src)
            if (!file) {
              delete_actions.push({ src: dpfile.src })
            }
          }
        }
        // perform write actions
        for (let { src, src_url } of write_actions) {
          let body = await get_file_data(src_url, { responseType: 'blob' })
          await this.uploadFile(path.join(target_folder, src), body)
        }
        // perform delete actions
        if (delete_actions.length > 0) {
          let res = await this._delete_batch_sync({
            entries: delete_actions.map((a) => path.join(target_folder, a.src)),
          })
        }
        // done
        resolve()
      } catch (err) {
        reject(err)
      }
    }))
    return task
  }
  async deleteStateFromDropbox (dpstate_src, dpstate) {
    let state_dir = path.dirname(dpstate_src)
    let entries = [ { path: dpstate_src } ]
    for (let file of dpstate.files) {
      entries.push({ path: path.join(state_dir, file.src) })
    }
    await this._delete_batch_sync({ entries })
  }
}


/*
// dropbox_json_request (method, link, body, tokenhandler)
// get token with authorize
dropbox_request_token({ grant_type: 'authorization_code', code })

  let redirect_url = `${API_URL}/dropbox-oauth-return`
  // req.redirect_url
  let state_data = JSON.stringify({ redirect_url: req.redirect_url })
  
  // res.redirect(redirect_url)
  // res.status(200).json()
  // res.render('index', { title: 'Express' });
*/

