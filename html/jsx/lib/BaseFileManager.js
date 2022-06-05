import { NotFoundError } from '../exceptions'

/**
 * BaseFileManager only uses http requests to perform the calls
 */
export default class BaseFileManager {
  async acquireFileUrl (url) {
    return url
  }
  releaseFileUrl (url) {
    // pass
  }
  async loadFileJson (url, options) {
    let data await this.loadFileData(url, options)
    return JSON.parse(data)
  }
  async saveFileJson (url, data, options) {
    let jsondata = JSON.stringify(data, null, '  ')
    return await this.saveFileData(url, jsondata, options)
  }
  async loadFileData (url, options) {
    options = Object.assign({ method: 'GET' }, options)
    if (this.isLocalFile(url)) {
      throw new Error('Request not supported!')
    }
    return await this._httpRequest(url, options);
  }
  saveFileData (url, data, options) {
    options = Object.assign({ method: 'POST' }, options)
    if (this.isLocalFile(url)) {
      throw new Error('Request not supported!')
    }
    if (data instanceof Blob || data instanceof File) {
      data = await (new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
          let match = reader.result.match(/^data:[^\/]+\/[^;]+;base64,/)
          if (!match) {
            reject(new Error('Could not convert blob to base64'))
          } else {
            resolve(reader.result.substring(match[0].length))
          }
        }
        reader.readAsDataURL(data)
      }))
    }
    options.data = data
    return await this._httpRequest(url, options);
  }
  async deleteFile (url, options = {}) {
    options = Object.assign({ method: 'DELETE' }, options)
    if (this.isLocalFile(url)) {
      throw new Error('Request not supported!')
    }
    return await this._httpRequest(url, options);
  }
  async fileExists (url, options) {
    if (this.isLocalFile(url)) {
      throw new Error('Request not supported!')
    }
    try {
      await this._httpRequest(url, options)
      return true
    } catch (err) {
      if (err instanceof NotFoundError) {
        return false
      } else {
        throw err
      }
    }
  }
  async mkdirRec () {
    // pass
  }
  async mkdir () {
    // pass
  }
  isLocalFile (url) {
    return url.indexOf('file:///') == 0
  }
  /**
   * options
   *   - responseType [blob]
   */
  async _httpRequest (url, options) {
    options = options || {}
    if (this.isLocalFile(url)) {
      throw new Error('Request not supported!')
    } else {
      return await (new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest()
        if(options.responseType) {
          xhr.responseType = options.responseType
        }
        xhr.open(options.method || 'GET', url)
        xhr.onreadystatechange = () => {
          if(xhr.readyState === 4) {
            if(xhr.status >= 200 && xhr.status < 300) {
              if(!!options.responseType) {
                if (options.responseType == 'blob' && typeof xhr.response == 'string') {
                  resolve(new Blob([xhr.response]))
                } else {
                  resolve(xhr.response)
                }
              } else {
                resolve(xhr.responseText)
              }
            } else if (xhr.status == 404) {
              let err = new NotFoundError('File not found: ' + url)
              err.options = options
              err.url = url
              err.xhr = xhr
              reject(err)
            } else {
              var err = new Error(xhr.statusText || 'unknown status ' + xhr.status + ' for `' + url + '`')
              err.options = options
              err.url = url
              err.xhr = xhr
              reject(err)
            }
          }
        }
        xhr.send(options.data || null)
      }))
    }
  }
}
