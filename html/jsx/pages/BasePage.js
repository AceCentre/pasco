import { getRuntimeEnv, errorDetailsAsText } from '../common'
import PascoNativeBridge from '../lib/PascoNativeBridge'
import * as EventEmitter from 'events'
import $ from "jquery"

export default class BasePage extends EventEmitter {
  constructor (document) {
    super()
    this._document = document
  }
  async init () {

  }
  async destroy () {

  }
  onReady () {
    this._document.body.classList.remove('notready')
  }
  static async onDocumentReady () {
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

  displayError (err) {
    console.error(err)
    return this.displayAlertDialog({
      title: err.message ? 'Error: ' + err.message  : 'Unexpected error',
      details: errorDetailsAsText(err)
    })
  }
  
  displayAlertDialog (data) {
    var $modal = $('#alert-modal')
    if ($modal.length > 0) {
      $modal.find('.modal-title').text(data.title)
      $modal.find('.alert-details-wrp').toggleClass('hidden', !data.details)
      var details_btn = $modal.find('.copy-details-btn')[0]
      if (details_btn) {
        if (details_btn._onclick_handler) {
          details_btn.removeEventListener('click', details_btn._onclick_handler, false)
        }
        details_btn.addEventListener('click', details_btn._onclick_handler = function () {
          window.copy($modal.find('.alert-details').text())
        }, false)
      }
      $modal.find('.alert-details').text(data.details || '')
      $modal.find('.alert-message').toggleClass('hidden', !data.message)
      $modal.find('.alert-message').text(data.message || '')
      $modal.modal('show')
      // make sure it is visible despite view is not ready
      $('body').removeClass('notready')
      return $modal
    } else {
      alert(data.message || data.title)
    }
  }
}
