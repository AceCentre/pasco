import { getRuntimeEnv } from '../common'
import FileManagerWithCordova from './internal/FileManagerWithCordova'
import FileManagerWithLocalStorage from './internal/FileManagerWithLocalStorage'

/**
 * PascoFileManager is a wrapper for FileManager's used 
 * based on runtime environment
 */
export default class PascoFileManager {
  constructor () {
    this._imanager = getRuntimeEnv() == 'cordova' ?
      new FileManagerWithCordova() :
      new FileManagerWithLocalStorage()
    let method_names = [
      'acquireFileUrl', 'releaseFileUrl',
      'loadFileJson', 'saveFileJson',
      'loadFileData', 'saveFileData',
      'deleteFile', 'mkdirRec', 'mkdir',
      'fileExists', 'isLocalFile',
    ]
    for (let name of method_names) {
      this[name] = (...args) => this._imanager[name](...args)
    }
  }
}
