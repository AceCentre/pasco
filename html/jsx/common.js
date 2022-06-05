// expected global variables
//   cordova
// NotFoundError, AccessDeniedError, getRuntimeEnv, sha256Digest,
// arrayBufferFromFile, LocalStorageTokens, TokenHandler, BackgroundTask

export function getRuntimeEnv () {
  return window.cordova ? 'cordova' : 'web'
}

export function sha256Digest (value) {
  if (typeof value == 'string') {
    value = new Blob([value])
  }
  if (value instanceof ArrayBuffer) {
    return crypto.subtle.digest('sha-256', value)
  }
  if (!(value instanceof File || value instanceof Blob)) {
    throw new Error('Unsupported value, cannot digest')
  }
  return arrayBufferFromFile(value)
    .then((arraybuffer) => crypto.subtle.digest('sha-256', arraybuffer))
}

export function arrayBufferFromFile (value) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result)
    }
    reader.readAsArrayBuffer(value)
  })
}

export function arrayBufferToHex (a) {
  return Array.prototype.map.call(new Uint8Array(a), (x) => x.toString(16).padStart(2, '0')).join('')
}


export class LocalStorageTokens {
  constructor () {
    this._tokens = this._loadTokens()
  }
  _loadTokens () {
    let output = {}
    let tokensjson = window.localStorage.getItem('__tokens__')
    if (tokensjson) {
      try {
        output = JSON.parse(tokensjson)
        if (!output || typeof output != 'object') {
          output = {}
        }
      } catch (err) {
        // pass
      }
    }
    return output
  }
  async store (name, value) {
    if (value == null) {
      delete this._tokens[name]
    } else {
      this._tokens[name] = value
    }
    window.localStorage.setItem('__tokens__', JSON.stringify(this._tokens))
  }
  async get (name) {
    return this._tokens[name]
  }
}

export class TokenHandler {
  constructor (tokenstorage, name) {
    this._tokenstorage = tokenstorage
    this._name = name
  }
  get () {
    return this._tokenstorage.get(this._name)
  }
  store (value) {
    return this._tokenstorage.store(this._name, value)
  }
}

export class BackgroundTask {
  constructor () {
  }
  setPromise (promise) {
    this._promise = promise
  }
  getPromise () {
    return this._promise
  }
  updateProgress (v) {
    if (this._onprogress) {
      this._onprogress(v)
    }
  }
  setOnProgress (callable) {
    this._onprogress = callable
  }
}

// Converts a FS file path to a friendly name
// https://mysite.com?demo=true -> mysite.com
// https://mysite.com/myurl!hasSpecial/characters -> mysite.com_myurl_hasSpecial_characters
export function fsFriendlyName (s) {
  return s
    .replace(/^[a-z]{1,10}\:\/\//i,"") // Removes the protocol, ie, http://, https:// or cdvfile://
    .replace(/\?.*$/,"") // Removes the query string
    .replace(/[ \(\)\[\]\*\#\@\!\$\%\^\&\+\=\/\\:]/g, '_') //Replace any special characters with a '_'
    .replace(/[\r\n\t]/g, ''); // Removes the newline, tab, and carriage return
}

