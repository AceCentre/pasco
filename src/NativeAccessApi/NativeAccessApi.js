import { keyInputByCode, keyCodeByInput } from "./keys";

class NativeAccessApi {
  constructor() {
    this.available = !!window.cordova;
    this.cordova = window.cordova;
    this.keyInputByCode = keyInputByCode;
    this.keyCodeByInput = keyCodeByInput;

    this.isReady = false;

    const readyHandler = (res) => () => {
      this.isReady = true;
      document.removeEventListener("deviceReady");
      res();
    };

    this.onReadyPromise = new Promise((res) => {
      document.addEventListener("deviceready", readyHandler(res), true);
    });
  }

  /*
    If we dont have access to cordova and we try to use this class
    we should just throw an error
  */
  _throwIfNotAvailable() {
    if (!this.available) {
      throw new Error(
        "You tried to use NativeAccessApi when its not available"
      );
    }
  }

  onready() {
    this._throwIfNotAvailable();

    if (this.isReady) return Promise.resolve(true);
    else {
      return this.onReadyPromise;
    }
  }

  _exec(action, args) {
    this._throwIfNotAvailable();

    return new Promise(function(resolve, reject) {
      cordova.exec(resolve, reject, "NativeAccessApi", action, args);
    });
  }

  has_synthesizer(...args) {
    return this._exec("has_synthesizer", args);
  }

  has_audio_device(...args) {
    return this._exec("has_audio_device", args);
  }

  init_synthesizer(...args) {
    return this._exec("init_synthesizer", args);
  }

  init_utterance(...args) {
    return this._exec("init_utterance", args);
  }

  release_synthesizer(...args) {
    return this._exec("release_synthesizer", args);
  }

  release_utterance(...args) {
    return this._exec("release_utterance", args);
  }

  speak_utterance(...args) {
    return this._exec("speak_utterance", args);
  }

  stop_speaking(...args) {
    return this._exec("stop_speaking", args);
  }

  speak_finish(...args) {
    return this._exec("speak_finish", args);
  }

  get_voices(...args) {
    return this._exec("get_voices", args);
  }

  is_software_keyboard_visible(...args) {
    return this._exec("is_software_keyboard_visible", args);
  }

  request_audio_record_permission(...args) {
    return this._exec("request_audio_record_permission", args);
  }

  add_key_command(...args) {
    return this._exec("add_key_command", args);
  }

  remove_key_command(...args) {
    return this._exec("remove_key_command", args);
  }

  set_audio_behavior(...args) {
    return this._exec("set_audio_behavior", args);
  }

  ios_open_manage_output_audio_view(...args) {
    return this._exec("ios_open_manage_output_audio_view", args);
  }
}

export default NativeAccessApi;
