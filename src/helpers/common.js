// expected global variables
//   cordova
import * as alt_sha256 from 'sha256-uint8array'
import * as alt_uuid from 'uuid-random'

export function getRuntimeEnv () {
  return window.cordova ? 'cordova' : 'web'
}

export function uuid () {
  if (typeof crypto != 'undefined') {
    return crypto.randomUUID()
  } else {
    return alt_uuid()
  }
}

export async function sha256Digest (value) {
  if (typeof value == 'string') {
    var enc = new TextEncoder() // always utf-8
    value = enc.encode(value)
  }
  if (value instanceof File || value instanceof Blob) {
    value = await arrayBufferFromFile(value)
  }
  if (!(value instanceof ArrayBuffer) && !(value instanceof Uint8Array)) {
    throw new Error('Unsupported value, cannot digest')
  }
  if (typeof crypto != 'undefined') {
    return await crypto.subtle.digest('sha-256', value)
  } else {
    if (value instanceof ArrayBuffer) {
      value = new Uint8Array(value)
    }
    return alt_sha256.createHash().update(value).digest()
  }
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

export function loadScript (fn) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script')
    s.addEventListener('load', function() {
      resolve(s)
    }, false)
    s.addEventListener('error', function() {
      reject(new Error('Could not load script, ' + fn))
    }, false)
    s.async = true
    s.defer = true
    s.src = fn
    s.type = 'text/javascript'
    document.body.appendChild(s)
  })
}

export function deferredPromise () {
  return new Promise(function (onready) {
    var promise, resolve, reject
    promise = new Promise(function(_resolve, _reject) {
      resolve = _resolve
      reject = _reject
      if (promise) {
        onready([promise,resolve,reject])
      }
    })
    if (promise && resolve) {
      onready([promise,resolve,reject])
    }
  })
}

export function getXScaleClassFromSizePercent (value, step, decimals) {
  decimals = decimals == undefined ? 1 : decimals
  var v = Math.floor(value / step) * step / 100.0
  if(decimals > 0) {
    return v.toFixed(decimals || 1).replace(/0+$/, "")
      .replace(/\.$/, "").replace('.', '_')
  } else {
    return v+''
  }
}

export function copyObject (obj) {
  return JSON.parse(JSON.stringify(obj))
}


export function errorDetailsAsText (error) {
  if (typeof error.message != 'string' || typeof error.stack != 'string') {
    return JSON.stringify(error, null, '  ')
  } else {
    return error.constructor.name  + ": " + error.message + "\n" + error.stack
  }
}

export function fixUrlForCordova (url) {
  return ((/^[a-z]+:\/\//i).test(url) ?
          '' : 'cdvfile://localhost/bundle/www/') + url;
}

export function range (end, start) {
  if (start === undefined) {
    start = 0
  }
  let list = []
  if (end > start) {
    for (let i = start; i < end; i++) {
      list.push(i)
    }
  }
  return list
}

var mkrand_chars = "abcdefghijklmnopqrstuvwxyz01234567890";
export function mkRand (n) {
  var v = ""
  while(n > 0) {
    v += mkrand_chars[Math.floor(Math.random() * mkrand_chars.length)]
    n--
  }
  return v
}
