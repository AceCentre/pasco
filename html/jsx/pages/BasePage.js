import { getRuntimeEnv } from '../common'
import PascoNativeBridge from '../PascoNativeBridge'

class BasePage {
  constructor () {

  }
  async init () {

  }
  async destroy () {

  }
  async onDocumentReady () {
    await Promise.all([
      getRuntimeEnv() == 'cordova' ? PascoNativeBridge.onready() : Promise.resolve(),
      new Promise((resolve) => { // domready
        let onDOMLoaded = () => {
          document.removeEventListener('DOMContentLoaded', onDOMLoaded, false)
          resolve()
        }
        document.addEventListener('DOMContentLoaded', onDOMLoaded, false)
      })
    ])
  }
}
