import BaseFileManager from './BaseFileManager'
import { NotFoundError } from '../exceptions'

function blobFromBase64 (base64, options) {
  let binary_string = window.atob(base64)
  let len = binary_string.length
  let bytes = new Uint8Array(len)
  for (let i = 0 i < len i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return new Blob([bytes], options)
}

export default class PascoFileManagerWithLocalStorage extends BaseFileManager {
  async acquireFileUrl (url) {
    let key = url
    if (key.startsWith('file:///')) {
      key = key.substring('file:///'.length).replace(/^\/+/, '')
    }
    let result = localStorage.getItem('file_'+key);
    if (result != null) {
      let type = localStorage.getItem('filetype_'+key);
      let blob
      if (type == "blob") {
        let contenttype = localStorage.getItem("filecontenttype_"+key);
        blob = blobFromBase64(result, { type: contenttype || 'application/octet-stream' })
      } else {
        blob = new Blob([result], { type: 'text/plain;charset=UTF-8' })
      }
		  return URL.createObjectURL(blob)
    }
    return url
  }
  releaseFileUrl (url) {
    if (url.indexOf("blob:") == 0) {
      URL.revokeObjectURL(url);
    }
  }
  async loadFileData (url, options) {
    let key = url
    let withfileproto = key.startsWith('file:///')
    if (withfileproto) {
      key = key.substring('file:///'.length).replace(/^\/+/, '')
    }
    options = options || {};
    let result = localStorage.getItem('file_'+key);
    if(result == null) {
      if (withfileproto) {
        throw new NotFoundError('File not found: ' + url)
      } else {
        return await super.loadFileData(url, options);
      }
    } else {
      let type = localStorage.getItem('filetype_'+key);
      if (type == "blob") {
        let contenttype = localStorage.getItem("filecontenttype_"+key);
        result = blobFromBase64(result, { type: contenttype || 'application/octet-stream' })
      }
      if (options.responseType == "blob") {
        if (!(result instanceof Blob || result instanceof File)) {
          result = new Blob([result], { type: 'text/plain;charset=UTF-8' })
        }
        return result
      } else {
        if (result instanceof Blob || result instanceof File) {
          return await (new Promise(function (resolve) {
            let reader = new FileReader();
            reader.onloadend = function(e) {
              resolve(this.result)
            }
            reader.readAsText(result);
          }))
        } else {
          return result
        }
      }
    }
  }
  async saveFileData (url, data, options) {
    let key = url
    if (key.startsWith('file:///')) {
      key = key.substring('file:///'.length).replace(/^\/+/, '')
    }
    options = options || {};
    let internal_type = null
    await (new Promise(function (resolve, reject) {
      if (data instanceof Blob || data instanceof File) {
        let reader = new FileReader();
        reader.onload = function(e) {
          internal_type = 'blob'
          let match = reader.result.match(/^data:[^\/]+\/[^;]+;base64,/)
          if (!match) {
            reject(new Error('Could not convert blob to base64'))
          } else {
            data = reader.result.substring(match[0].length)
            resolve()
          }
        }
        reader.readAsDataURL(data)
      } else {
        resolve();
      }
    }))
    localStorage.setItem('file_'+key, data);
    if (internal_type) {
      localStorage.setItem('filetype_'+key, internal_type);
      localStorage.setItem('filecontenttype_'+key, options.contentType || 'application/octet-stream');
    } else {
      localStorage.removeItem('filetype_'+key);
      localStorage.removeItem('filecontenttype_'+key);
    }
  }
  async deleteFile () {
    if (key.startsWith('file:///')) {
      key = key.substring('file:///'.length).replace(/^\/+/, '')
    }
    localStorage.removeItem('file_'+key);
    localStorage.removeItem('filetype_'+key);
    localStorage.removeItem('filecontenttype_'+key);
  }
  async fileExists (url, options) {
    let key = url
    let withfileproto = key.startsWith('file:///')
    if (withfileproto) {
      key = key.substring('file:///'.length).replace(/^\/+/, '')
    }
    let result = localStorage.getItem('file_'+key)
    if(result == null) {
      if (withfileproto) {
        return false
      } else {
        return super.fileExists(url, options)
      }
    } else {
      return true
    }
  }
}

