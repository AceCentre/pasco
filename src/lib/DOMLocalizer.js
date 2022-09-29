import translate from '../helpers/translate'
import { loadScript } from '../helpers/common'

export default class DOMLocalizer {
  constructor (l10n_url, document) {
    this._document = document
    this._l10n_url = l10n_url
    this.translate = this.t = (...args) => {
      return translate(...args)
    }
  }
  async load (locale) {
    this._icu = await (new Promise((resolve, reject) => {
      let onICUChanged = (event) => {
        resolve(event.detail)
        this._document.removeEventListener('x-icu-changed', onICUChanged, false)
      }
      this._document.addEventListener('x-icu-changed', onICUChanged, false)
      loadScript(this._l10n_url + `/${locale}.js`)
        .then((script) => {
          script.parentNode.removeChild(script) // remove the script, not needed
        })
        .catch(reject)
    }))
    translate.setTranslation(this._icu.dictionary || {})
    // add/remove bootstrap rtl if needed
    this._document.body.classList[this._icu.rtl ? 'add' : 'remove']('rtl')
    var elm = this._document.getElementById('bootstrap-rtl')
    if(!elm && this._icu.rtl) {
      await (new Promise((resolve, reject) => {
        var src = 'webpack/static/css/bootstrap-rtl.css'
        elm = this._document.createElement('link')
        elm.setAttribute('href', src)
        elm.setAttribute('rel', 'stylesheet')
        elm.id = "bootstrap-rtl"
        this._document.body.appendChild(elm)
        elm.addEventListener('load', resolve, false)
        setTimeout(resolve, 3000)
      }))
    } else if(elm && !this._icu.rtl && elm.parentNode) {
      elm.parentNode.removeChild(elm)
    }
  }
  async localize () {
    for (let elm of document.querySelectorAll('[x-l10n]')) {
      let l10n = elm.getAttribute('x-l10n')
      let l10n_cached = elm.getAttribute('x--l10n')
      let text = elm.textContent.trim()
      let l10n_input = l10n_cached || l10n || text
      let default_l10n = elm.getAttribute('x--l10n-default')
      if (l10n != '#NULL#') {
        var localized = translate(l10n_input)
        // initialize x--l10n-default if needed
        if (!default_l10n && l10n && text &&
            localized == l10n && l10n != text) {
          default_l10n = elm.textContent
          elm.setAttribute('x--l10n-default', default_l10n)
        }
        if(!l10n || localized != l10n) {
          elm.textContent = localized
          if(!l10n && !l10n_cached) {
            elm.setAttribute('x--l10n', l10n_input)
          }
        } else if (l10n && l10n != default_l10n) {
          elm.textContent = default_l10n
        }
      }
    }
    for (let elm of document.querySelectorAll('.has-l10n-attr')) {
      let newattrs = []
      for (let attr of elm.attributes) {
        var prefix_const = 'x-l10n-'
        if (attr.name.indexOf(prefix_const) == 0 &&
            attr.name.length > prefix_const.length) {
          var name = attr.name.substr(prefix_const.length)
          newattrs.push([name, translate(attr.value)])
        }
      }
      for (let attr of newattrs) {
        elm.setAttribute(attr[0], attr[1])
      }
    }
  }
}
