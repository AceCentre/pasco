import { getRuntimeEnv } from '../helpers/common'
import FileManagerWithCordova from './internal/FileManagerWithCordova'
import FileManagerWithLocalStorage from './internal/FileManagerWithLocalStorage'

/**
 * PascoFileManager is a wrapper for FileManager's used 
 * based on runtime environment
 */
export default class PascoFileManager {
  constructor (base_url) {
    this._base_url = base_url
    this._imanager = getRuntimeEnv() == 'cordova' ?
      new FileManagerWithCordova() :
      new FileManagerWithLocalStorage()
    // all of these methods have url as their first argument
    let method_names = [
      'acquireFileUrl', 'releaseFileUrl',
      'loadFileJson', 'saveFileJson',
      'loadFileData', 'saveFileData',
      'deleteFile', 'mkdirRec', 'mkdir',
      'fileExists', 'isLocalFile',
    ]
    for (let name of method_names) {
      this[name] = (url, ...args) => this._imanager[name](this.resolveUrl(url), ...args)
    }
  }
  resolveUrl (url) {
    if (url.indexOf('://') == -1) {
      url = new URL(url, this._base_url).href
    }
    return url
  }
}
