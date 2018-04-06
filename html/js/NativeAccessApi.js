(function(){
  var slice = [].slice;
  
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
    'speak_finish',
    'get_voices',
    'is_software_keyboard_visible',
    'request_audio_record_permission',
    'add_key_command', 'remove_key_command',
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

  NativeAccessApi.keyInputByCode = {
    "13": "RETURN",
    "32": "SPACE",
    "39": "RIGHT",
    "37": "LEFT",
    "38": "UP",
    "40": "DOWN",
    "87": "w",
    "68": "d",
    "83": "s",
    "65": "a",
    "49": "1",
    "50": "2",
    "51": "3",
    "52": "4",
    "80": "p",
    "190": "."
  };
  NativeAccessApi.keyCodeByInput = {};
  for(var key in NativeAccessApi.keyInputByCode) {
    if(NativeAccessApi.keyInputByCode.hasOwnProperty(key)) {
      NativeAccessApi.keyCodeByInput[NativeAccessApi.keyInputByCode[key]] = key;
    }
  }


  window.NativeAccessApi = NativeAccessApi;

})();
