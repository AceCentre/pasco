import NativeAccessApi from "./NativeAccessApi";

let nativeAccessInstance = window.nativeAccessInstance;

if (!nativeAccessInstance) {
  nativeAccessInstance = new NativeAccessApi();
  window.nativeAccessInstance = nativeAccessInstance;
}

export default nativeAccessInstance;
