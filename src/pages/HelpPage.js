import BasePage from './BasePage'
import EventManager from '../helpers/EventManager'
import PascoCore from '../lib/PascoCore'

export default class EditConfigPage extends BasePage {
  constructor (document) {
    super(document)
    this._$ = document.querySelector.bind(document)
    this._$a = document.querySelectorAll.bind(document)
    this._event_manager = new EventManager()
    this._help_files = {
      'en': 'help.html',
      'es-ES': 'help/es-ES.html'
    }
  }
  async init () {
    let base_url
    {
      let base_elm = this._$('base')
      if (base_elm && base_elm.href) {
        base_url = base_elm.href
      } else {
        base_url = location+''
      }
    } 
    this._core = new PascoCore(this._document, base_url)
    await this._core.init()
    this._fmanager = this._core.getFileManager()

    let config_url = this._core.resolveUrl(this._core.getEnvValue('default_config_file'))
    await this.loadConfig(config_url)

    this._locale = this._config.locale || this._core.getEnvValue('default_locale')
    this._localizer = this._core.getLocalizer()
    this._t = this._localizer.t

    var help_file = this._help_files[this._locale]
    if (!help_file) {
      help_file = this._help_files[this._locale.split('-')[0]]
    }

    if (help_file) { // redirect to the active locale if needed
      let current_location = location.href+''
      for (let exclude_marker of ['?','#']) {
        let idx = current_location.indexOf(exclude_marker)
        if (idx != -1) {
          current_location = current_location.substring(0, idx)
        }
      }
      let help_file_url = new URL(help_file, base_url).href
      if ((new URL(location+'').searchParams.get('didredirect')) != '1') {
        if (help_file_url != current_location) {
          location.href = help_file_url + '?didredirect=1' // redirect
        }
      }
    }

    await (this._localizer.load(this._locale)
      .catch((err) => {
        console.warn(err) // pass localize error
      }))
    this._localizer.localize()

    this._event_manager.addDOMListenerFor(this._document, 'scroll', this.onScroll.bind(this))
    var tocwrp = this._$('#tocwrp');
    if (tocwrp) {
      var root_list = this._generateTOC(document.body, {
        start_level: 2,
        end_level: 3,
        list_type_map: { 2: 'ol' },
      });
      if(root_list) {
        tocwrp.appendChild(root_list);
      }
    }


  }
  async destroy () {
    this._event_manager.removeAllListeners()
  }
  async loadConfig (config_url) {
    this._config_url = config_url
    this._config = await this._fmanager.loadFileJson(config_url)
  }

  onScroll () {
    var movetoplink = this._$('#move-top-link');
    if (movetoplink) {
      if (window.scrollY > 500) {
        if (movetoplink.classList.contains('hidden')) {
          movetoplink.classList.remove('hidden');
        }
      } else {
        if (!movetoplink.classList.contains('hidden')) {
          movetoplink.classList.add('hidden');
        }
      }
    }
  }

  _generateTOC (element, options) {
    options = options || {}
    let start_level = Math.max(1, options.start_level || 1)
    let end_level = Math.min(6, options.end_level || 6)
    if (end_level < start_level) {
      throw new Error('Ending heading level must be greater than or equal to starting header level')
    }
    let list_type_map = options.list_type_map || {}
    let levels = []
    for (let headerNumber = start_level; headerNumber <= end_level; headerNumber++) {
      levels.push('h' + headerNumber)
    }
    let toc_lists = []
    let headers = element.querySelectorAll(levels.join(','))
    for (let header of headers) {
      let hlevel = parseInt(header.nodeName.substr(1))
      let hindex = hlevel - start_level
      for (let i = 0; i <= hindex; i++) {
        if (toc_lists.length <= i) {
          let list = this._document.createElement(list_type_map[i + start_level] || 'ul')
          if (i > 0) {
            if (toc_lists[i-1].childNodes.length > 0) {
              let tmp = toc_lists[i-1]
              tmp.childNodes[tmp.childNodes.length-1].appendChild(list)
            } else {
              let li = this._document.createElement('li')
              li.appendChild(list)
              toc_lists[i-1].appendChild(li)
            }
          }
          toc_lists.push(list)
        }
      }
      if (toc_lists.length > hindex + 1) {
        toc_lists.splice(hindex + 1, toc_lists.length - hindex - 1)
      }
      let li = this._document.createElement('li')
      let a = this._document.createElement('a')
      let target_anchor = header.querySelector('a.anchor')
      a.href = location + '#' + (header.id || (target_anchor ? target_anchor.name : ''))
      a.textContent = header.textContent
      li.appendChild(a)
      toc_lists[hindex].appendChild(li)
    }
    if (toc_lists.length > 0) {
      return toc_lists[0]
    }
    return null
  }

}
