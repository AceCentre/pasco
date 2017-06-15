(function(){
  var slice = [].slice;
  
  /**
   *  Currently connection is based on cordova
   */
  function NativeAccessApi() {
    if(!window.cordova) {
      // no access to api
      // throw new Error("Cannot find cordova")
      this.has_synthesizer = this.has_audio_device = function() {
        return Promise.resolve(false);
      }
    }
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
    'is_software_keyboard_visible'
  ];

  for(var i = 0, len = direct_delegates.length; i < len; ++i)
    proto[direct_delegates[i]] = mk_direct_delegate(direct_delegates[i]);

  NativeAccessApi.onready = function() {
    if(!window.cordova) {
      return Promise.resolve();
    } else {
      return new Promise(function(resolve, reject) {
        document.addEventListener('deviceready', function() {
          document.removeEventListener('deviceready', arguments.callee);
          resolve();
        }, true);
      });
    }
  }

  window.NativeAccessApi = NativeAccessApi;

})();
