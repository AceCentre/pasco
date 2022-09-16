import * as EventEmitter from 'events'
import $ from 'jquery'

export default class BaseModal extends EventEmitter {
  constructor (document, idprefix) {
    super()
    this._$ = document.querySelector.bind(document)
    this._$a = document.querySelectorAll.bind(document)
    this._document = document
    this._idprefix = idprefix
  }
  open () {
    $('#' + this._idprefix + '-modal').modal('show')
  }
  close () {
    $('#' + this._idprefix + '-modal').modal('hide')
  }
}
