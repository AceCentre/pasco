import EventManager from '../../helpers/EventManager'

export default class MainDebugTools {
  constructor (main) {
    this._main = main
    this._document = main.getDocument()
    this._core = main.getCore()
    this._pengine = main.getEngine()
    this._nbridge = this._core.getNativeBridge()
    this._fmanager = this._core.getFileManager()
    this._event_manager = new EventManager()
    this._$ = this._document.querySelector.bind(this._document)
    this._$a = this._document.querySelectorAll.bind(this._document)
  }
  async init () {
    let config = this._main.getConfig()
    this._toggleDebugMode(!!config.debug_mode)
    // some hooks
    for (let elm of this._$a('#debug-clear-storage')) {
      this._event_manager.addDOMListenerFor(elm, 'click', async () => {
        if (!confirm('Are you sure you want to remove your pasco settings?')) {
          return
        }
        // for cordova
        if (window.cordova) {
          await this._fmanager.deleteFile(this._main.getConfigUrl())
        } else {
          localStorage.clear()
        }
        location.reload()
      }, false)
    }
    for (let elm of this._$a('#debug-with-fake-scroll-toggle')) {
      this._event_manager.addDOMListenerFor(elm, 'click', async () => {
        var html = this._$('html')
        var active = !html.classList.contains('with-fake-scroll')
        if (active) {
          html.classList.add('with-fake-scroll')
        } else {
          html.classList.remove('with-fake-scroll')
        }
        fake_scroll_toggle_elm.innerHTML = "Wheel With Fake Scroll " + (active ? '[ON]' : '[OFF]')
        await this._main.restartEngine()
      }, false)
    }
    this._event_manager.addDOMListenerFor(window, "keydown", (evt) => {
      let code = evt.charCode || evt.keyCode
      if (evt.shiftKey && evt.ctrlKey && code == 190) { // CTRL + SHIFT + . (toggle debug mode)
        this._toggleDebugMode()
      }
      if (!this._debug_mode_enabled) {
        return // debug_mode is not enabled, skip
      }
      if (code == 80) { // P (restart engine)
        this._main.restartEngine()
      }
    })
    // debug-hi-console-toggle
    this._hiconsole_enabled = false
    for (let elm of this._$a('#debug-hiconsole-toggle')) {
      this._event_manager.addDOMListenerFor(elm, 'click', async () => {
        this._toggleHIConsole()
      })
    }
    let navbar = this._$('.x-navbar')
    if (navbar) {
      this._initEnableDebugWithSwipeGesture(navbar)
    }
  }
  async destroy () {
    for (let elm of this._$a('#debug-hiconsole')) {
      this._disableHIConsole(elm)
    }
    this._event_manager.removeAllListeners()
  }
  _toggleDebugMode (toggle) {
    if (toggle == null) {
      toggle = !this._debug_mode_enabled
    }
    if (toggle) {
      this._document.body.classList.add('debug-mode')
    } else {
      this._document.body.classList.remove('debug-mode')
    }
    this._debug_mode_enabled = toggle
  }
  _initEnableDebugWithSwipeGesture (navbar) {
    // impl to enable/disable debug-mode by swipe gesture
    let Y_THRESHOLD = 50
    let SWIPE_LENGTH = Math.max(Math.min(200, window.innerWidth - 330), 100)
    let ENABLE_SWIPE_REQUIRED = 4
    let swipe_count = 0
    let gesture_initial_state
    let gesture_event_groups = [
      {
        start_name: 'touchstart',
        end_name: 'touchend',
      },
      {
        start_name: 'mousedown',
        end_name: 'mouseup',
      },
    ]
    for (let event_group of gesture_event_groups) {
      let _getEventClientPos = (evt) => {
        let clientX, clientY
        if (evt.type == 'touchstart') {
          clientX = evt.targetTouches[0].clientX
          clientY = evt.targetTouches[0].clientY
        } else if (evt.type == 'touchend') {
          clientX = evt.changedTouches[0].clientX
          clientY = evt.changedTouches[0].clientY
        } else if (event_group.start_name == 'mousedown') {
          clientX = evt.clientX
          clientY = evt.clientY
        }
        return [ clientX, clientY ]
      }
      this._event_manager.addDOMListenerFor(navbar, event_group.start_name, (evt) => {
        let [ clientX, clientY ] = _getEventClientPos(evt)
        gesture_initial_state = { clientX, clientY, event_group }
      })
      this._event_manager.addDOMListenerFor(navbar, event_group.end_name, (evt) => {
        if (gesture_initial_state && gesture_initial_state.event_group == event_group) {
          let [ clientX, clientY ] = _getEventClientPos(evt)
          if (Math.abs(clientX - gesture_initial_state.clientX) > SWIPE_LENGTH &&
              Math.abs(clientY - gesture_initial_state.clientY) < Y_THRESHOLD) {
            if (++swipe_count >= ENABLE_SWIPE_REQUIRED) {
              this._toggleDebugMode()
              swipe_count = 0 // reset swipe count
            }
          }
        }
      })
      this._event_manager.addDOMListenerFor(this._document, event_group.start_name, (evt) => {
        if (evt.targetTouches) {
          if (Array.from(evt.touches).filter((a) => a.target != navbar).length > 0) {
            swipe_count = 0 // reset swipe count
          }
        } else {
          if (evt.target != navbar) {
            swipe_count = 0 // reset swipe count
          }
        }
      })
    }
  }
  _toggleHIConsole (toggle) {
    if (toggle == null) {
      toggle = !this._hiconsole_enabled
    }
    for (let elm of this._$a('#debug-hiconsole')) {
      if (toggle) {
        this._enableHIConsole(elm)
      } else {
        this._disableHIConsole(elm)
      }
    }
    this._hiconsole_enabled = toggle
  }
  _enableHIConsole (hiconsole_elm) {
    this._hientries = []
    hiconsole_elm.classList.remove('hidden')
    let evtid = 'hiconsole'
    this._event_manager.addNodeListenerFor(this._main, 'hievent', (event) => {
      let date = new Date()
      let entry = {
        date, time: date.getTime(),
        name: event.name,
        summary: event.summary,
      }
      this._hientries.push(entry)
      for (let elm of this._$a('#debug-hiconsole')) {
        this._updateHIConsole(elm)
      }
    }, evtid)

    this._active_hi_listeners = this._main.getActiveHIListeners()
    this._event_manager.addNodeListenerFor(this._main, 'active-human-input-listeners-change', (hi_listeners) => {
      this._active_hi_listeners = hi_listeners
    }, evtid)
    this._updateHIConsole(hiconsole_elm)
    this._update_interval_id = setInterval(() => {
      this._updateHIConsole(hiconsole_elm)
    }, 1000)
  }
  _disableHIConsole (hiconsole_elm) {
    this._hientries = null
    hiconsole_elm.classList.add('hidden')
    if (this._update_interval_id != null) {
      clearInterval(this._update_interval_id)
      this._update_interval_id = null
    }
    let evtid = 'hiconsole'
    this._event_manager.removeListenersById(evtid)
  }
  _updateHIConsole (hiconsole_elm) {
    let ENTRY_MAX_LIFE = 60 * 1000
    let MAX_ENTRIES = 10
    let ctime = new Date().getTime()
    // limit to MAX_ENTRIES
    if (this._hientries.length > MAX_ENTRIES) {
      this._hientries = this._hientries.slice(this._hientries.length - MAX_ENTRIES)
    }
    // remove dead entries
    this._hientries = this._hientries.filter((entry) => ctime - entry.time < ENTRY_MAX_LIFE)
    // display
    let content = hiconsole_elm.querySelector('.content')
    let entries_container = this._document.createElement('div')
    entries_container.classList.add('entries-container')
    if (this._hientries.length == 0) {
      entries_container.innerHTML = '<div class="text-center">No recent inputs</div>'
    } else {
      let prefixWithZero = (a, s) => '0'.repeat(Math.max(0, s - (a+'').length)) + a
      for (let entry of this._hientries) {
        if (entry._content_elm) {
          if (entry._content_elm.parentNode) {
            entry._content_elm.parentNode.removeChild(entry._content_elm)
          }
          entries_container.appendChild(entry._content_elm)
          continue
        }
        let entry_content = this._document.createElement('div')
        entry_content.classList.add('entry')
        let time_repr = prefixWithZero(entry.date.getMinutes(), 2) + ':' + prefixWithZero(entry.date.getSeconds(), 2) + '.' + prefixWithZero(entry.date.getMilliseconds(), 3)
        entry_content.textContent = [time_repr, entry.name, entry.summary].join(' -- ')
        entry._content_elm = entry_content
        entries_container.appendChild(entry_content)
      }
    }
    let ahil_head = this._document.createElement('div')
    ahil_head.classList.add('active-hi-listeners-head')
    ahil_head.innerHTML = '<span>Active Input Listeners</span>'
    let ahil_container = this._document.createElement('ul')
    ahil_container.classList.add('active-hi-listeners-container')
    for (let listener of this._active_hi_listeners) {
      let elm = this._document.createElement('li')
      elm.classList.add('item')
      elm.textContent = listener.name
      ahil_container.appendChild(elm)
    }
    content.innerHTML = ''
    content.appendChild(entries_container)
    content.appendChild(ahil_head)
    content.appendChild(ahil_container)
  }
}
