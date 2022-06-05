import BaseFileManager from './BaseFileManager'
import { NotFoundError } from '../exceptions'

function fixCordovaUrl (url) {
  return ((/^[a-z]+:\/\//i).test(url) ?
          '' : 'cdvfile://localhost/bundle/www/') + url
}

export default class FileManagerWithCordova extends BaseFileManager {
  async loadFileData (url, options) {
    options = options || {}
    if (this.isLocalFile(url)) {
      return await (new Promise(function(resolve, reject) {
        url = fixCordovaUrl(url)
        let onSuccess = (fileEntry) => {
          fileEntry.file(function(file) {
            if(options.responseType == 'blob') {
              resolve(file)
            } else {
              var reader = new FileReader()
              reader.onloadend = function(e) {
                resolve(this.result)
              }
              reader.readAsText(file)
            }
          })
        }
        let onFail = (err) => {
          if (err instanceof FileError && err.code == 1) {
            let err2 = new NotFoundError('File not found: ' + url)
            err2.options = options
            err2.url = url
            return reject(err2)
          }
          // err contains {code}. more info https://github.com/apache/cordova-plugin-file#list-of-error-codes-and-meanings
          var newerr = new Error("Fail to load `" + url + "` -- " + err.code)
          newerr.caused_by = err
          reject(newerr)
        }
        window.resolveLocalFileSystemURL(url, onSuccess, onFail)
      }))
    } else {
      return await super.loadFileData(url, options)
    }
  }
  saveFileData (url, data, options) {
    if (!this.isLocalFile(url)) {
      return await super.saveFileData(url, data, options)
    }
    return await (new Promise(function(resolve, reject) {
      url = fixCordovaUrl(url)
      var parts = url.split('/'),
          filename = parts[parts.length - 1],
          dirname = parts.slice(0, parts.length - 1).join("/")
      let onEntry = (dirEntry) => {
        dirEntry.getFile(filename, { create: true }, function (fileEntry) {
          // Create a FileWriter object for our FileEntry
          fileEntry.createWriter((fileWriter) => {
            fileWriter.onwriteend = () => {
              resolve()
            }
            fileWriter.onerror = (err) => {
              var newerr = new Error("Fail to write `" + url + "` -- " + (err.message || err.code))
              newerr.caused_by = err
              reject(newerr)
            }
            if(!(data instanceof Blob || data instanceof File)) {
              if(typeof data != 'string') {
                reject(new Error("Unexpected input data, string or Blob/File accepted, type: " + typeof(data)))
                return
              }
              data = new Blob([data], { type: options.contentType || 'application/octet-stream' })
            }
            fileWriter.write(data)
          })
        }, onFail)
      }
      let onFail = (err) => {
        console.error(err)
        reject(new Error("Fail to write `" + url + "` -- " + err.message))
      }
      window.resolveLocalFileSystemURL(dirname, onEntry, onFail)
    }))
  }
  async deleteFile (url, options = {}) {
    // cordova specific
    if (this.isLocalFile(url)) {
      url = fixCordovaUrl(url)
      return await (new Promise(function(resolve, reject) {
        function onEntry(entry) {
          entry.remove(resolve, onFail)
        }
        function onFail(err) {
          console.error(err)
          reject("Fail to delete `" + url + "` -- " + err+'')
        }
        window.resolveLocalFileSystemURL(url, onEntry, () => resolve())
      }))
    } else {
      return await super.deleteFile(url, options)
    }
  }
  async fileExists (url, options) {
    if (this.isLocalFile(url)) {
      return await (new Promise(function (resolve, reject) {
        let onResolveFail = function (err) {
          if (err instanceof FileError && err.code == 1) {
            resolve(false)
          } else {
            err.message = 'Could not resolve file: ' + url
            reject(err)
          }
        }
        window.resolveLocalFileSystemURL(url, () => resolve(true), onResolveFail)
      }))
    } else {
      return await super.fileExists(url, options)
    }
  }
  async mkdirRec (dir_url) {
    if (!this.isLocalFile(dir_url)) {
      return await super.mkdir(dir_url)
    }
    let protocol_idx = dir_url.indexOf('://')
    if (protocol_idx == -1) {
      throw new Error('dir_url has no protocol: ' + dir_url)
    }
    let first_slash_idx = dir_url.indexOf('/', protocol_idx + 3)
    if (first_slash_idx == -1 || first_slash_idx >= dir_url.length) {
      return await this.mkdir(dir_url)
    }
    let prefix = dir_url.substring(0, first_slash_idx)
    let dirpath = dir_url.substring(first_slash_idx)
    let mkdir_queue = []
    // build mkdir_queue
    while (true) {
      if (!dirpath || dirpath == '/') {
        break
      }
      try {
        await this.mkdir(prefix + dirpath)
        break
      } catch (err) {
        if (err instanceof FileError && err.code == 1) {
          mkdir_queue.unshift(dirpath)
          dirpath = path.dirname(dirpath) // try the parent directory
        } else {
          throw err
        }
      }
    }
    // call all mkdir requests in the queue
    while (true) {
      let dirpath = mkdir_queue.shift()
      if (!dirpath) {
        break
      }
      await this.mkdir(prefix + dirpath)
    }
  }
  async mkdir (dir_url) {
    if (!this.isLocalFile(dir_url)) {
      return await super.mkdir(dir_url)
    }
    return await (new Promise(function(resolve, reject) {
      // strip slashes from left, MAY NOT BE NEEDED
      while (dir_url.length > 0 && dir_url[dir_url.length - 1] == '/') {
        dir_url = dir_url.substring(0, dir_url.length - 1)
      }
      var parts = dir_url.split('/'),
          basename = parts[parts.length - 1],
          dirname = parts.slice(0, parts.length - 1).join("/")
      let onEntry = (dirEntry) => {
        dirEntry.getDirectory(basename, { create: true }, function (secondDirEntry) {
          resolve()
        }, onFail)
      }
      let onFail = (err) => {
        let err2 = new Error("Failed to mkdir `" + dir_url + "` -- " + err.code + ", " + err.message)
        err2.caused_by = err
        reject(err2)
      }
      window.resolveLocalFileSystemURL(dirname, onEntry, onFail)
    }))
  }
  isLocalFile (url) {
    // The path is a local cordova path if it starts with cdvfile:// or file:///
    return url.indexOf('cdvfile://') == 0 || url.indexOf('file:///') == 0
  }
}

