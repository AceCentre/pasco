const child_process = require('child_process')
const path = require('path')

let CORDOVA_DIR = path.dirname(path.dirname(__filename))
let CORDOVA_ICON_MODULE = path.join(CORDOVA_DIR, 'node_modules', 'cordova-icon')

module.exports = async (ctx) => {
  await (new Promise((resolve, reject) => {
    let proc = child_process.fork(CORDOVA_ICON_MODULE, [ '--icon=model/icon.png' ], { cwd: CORDOVA_DIR })
    proc.on('exit', (code) => {
      if (code != 0) {
        reject(new Error('cordova-icon failed, exit-code: ' + code))
      } else {
        resolve()
      }
    })
  }))
}
