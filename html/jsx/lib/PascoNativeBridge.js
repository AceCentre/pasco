import { getRuntimeEnv } from '../common'

// declare global function for capturing open url request
var handleOpenURLCallListeners = []
var lastHandleOpenURLValue = null
window.handleOpenURL = (url) => {
  lastHandleOpenURLValue = url
  for (let listener of handleOpenURLCallListeners) {
    try {
      listener(url)
    } catch (err) {
      console.error(err)
    }
  }
}

function cordovaExecAsPromise (service, action, args) {
  return new Promise((resolve, reject) => {
    cordova.exec(resolve, (err) => {
      var msg = 'Error on executing cordova action: ' + action + '  ' + JSON.stringify(args, null, '  ') + '\n'
      if (err instanceof Error) {
        console.error(msg)
        reject(err)
      } else {
        msg += typeof err == 'object' ? JSON.stringify(err, null, '  ') : err+'';
        reject(new Error(msg))
      }
    }, service, action, args)
  })
}

// define bridge methods
let BRIDGE_METHODS = [
  'has_synthesizer',
  'has_audio_device',
  'init_synthesizer',
  'init_utterance',
  'release_synthesizer',
  'release_utterance',
  'speak_utterance',
  'stop_speaking',
  'get_voices',
  'is_software_keyboard_visible',
  'request_audio_record_permission',
  'add_key_command', 'remove_key_command',
  'set_audio_behavior', 'ios_open_manage_output_audio_view'
]

/**
 *  PascoNativeBridge is the bridge used with cordova to access native apis
 *  for accessing native features on smartphones (at the moment mainly ios) 
 */
export default class PascoNativeBridge {
  constructor () {
    this.available = getRuntimeEnv() == 'cordova'
    for (let methodname of BRIDGE_METHODS) {
      this[methodname] = this._exec.bind(this, methodname)
    }
  }
  static addOpenURLHandler (handler) {
    if (typeof handler != 'function') {
      throw new Error('handler should be a function')
    }
    handleOpenURLCallListeners.push(handler)
    if (lastHandleOpenURLValue != null) {
      setTimeout(function () {
        handler(lastHandleOpenURLValue)
      }, 0)
    }
  }
  _exec (action, args) {
    return cordovaExecAsPromise('NativeAccessApi', action, args);
  }
  static onready () {
    return new Promise((resolve, reject) => {
      document.addEventListener('deviceready', function() {
        document.removeEventListener('deviceready', arguments.callee)
        resolve()
      }, true)
    })
  }
  static keyInputByCode = {
    "13": "RETURN",
    "32": "SPACE",
    "39": "RIGHT",
    "37": "LEFT",
    "38": "UP",
    "40": "DOWN",
    
    "192": "`",
    "48": "0",
    "49": "1",
    "50": "2",
    "51": "3",
    "52": "4",
    "53": "5",
    "54": "6",
    "55": "7",
    "56": "8",
    "57": "9",

    "173": "-",
    "61": "=",
    "219": "[",
    "221": "]",
    "220": "\\",
    "59": ";",
    "222": "'",
    "188": ",",
    "190": ".",
    "191": "/",

    "81": "q",
    "87": "w",
    "69": "e",
    "82": "r",
    "84": "t",
    "89": "y",
    "85": "u",
    "73": "i",
    "79": "o",
    "80": "p",
    "65": "a",
    "83": "s",
    "68": "d",
    "70": "f",
    "71": "g",
    "72": "h",
    "74": "j",
    "75": "k",
    "76": "l",
    "90": "z",
    "88": "x",
    "67": "c",
    "86": "v",
    "66": "b",
    "78": "n",
    "77": "m",
  }
}

PascoNativeBridge.keyCodeByInput = {};
for(var key in PascoNativeBridge.keyInputByCode) {
  if(PascoNativeBridge.keyInputByCode.hasOwnProperty(key)) {
    PascoNativeBridge.keyCodeByInput[PascoNativeBridge.keyInputByCode[key]] = key
  }
}

