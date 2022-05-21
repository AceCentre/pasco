(function(){
  var slice = [].slice;

  // declare global function for capturing
  var handleOpenURLCallListeners = []
  var lastHandleOpenURLValue = null
  window.handleOpenURL = function (url) {
    lastHandleOpenURLValue = url
    _.each(handleOpenURLCallListeners, function (listener) {
      try {
        listener(url)
      } catch (err) {
        console.error(err)
      }
    })
    console.log("received url: " + url);
  }

  
  /**
   *  Currently connection is based on cordova
   */
  function NativeAccessApi() {
    this.available = !!window.cordova;
  }

  function cordovaExecAsPromise(service, action, args) {
    return new Promise(function(resolve, reject) {
      cordova.exec(resolve, reject, service, action, args)
    });
  }

  var proto = NativeAccessApi.prototype;

  proto._exec = function(action, args) {
    return cordovaExecAsPromise('NativeAccessApi', action, args);
  }

  function mk_direct_delegate(action) {
    return function() {
      return this._exec(action, slice.call(arguments));
    };
  }
  
  var direct_delegates = [
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
  ];

  for(var i = 0, len = direct_delegates.length; i < len; ++i)
    proto[direct_delegates[i]] = mk_direct_delegate(direct_delegates[i]);

  NativeAccessApi.onready = function() {
    return new Promise(function(resolve, reject) {
      document.addEventListener('deviceready', function() {
        document.removeEventListener('deviceready', arguments.callee);
        resolve();
      }, true);
    });
  }
  NativeAccessApi.addOpenURLHandler = function (handler) {
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

  NativeAccessApi.keyInputByCode = {
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
    
  };
  NativeAccessApi.keyCodeByInput = {};
  for(var key in NativeAccessApi.keyInputByCode) {
    if(NativeAccessApi.keyInputByCode.hasOwnProperty(key)) {
      NativeAccessApi.keyCodeByInput[NativeAccessApi.keyInputByCode[key]] = key;
    }
  }


  window.NativeAccessApi = NativeAccessApi;

})();
