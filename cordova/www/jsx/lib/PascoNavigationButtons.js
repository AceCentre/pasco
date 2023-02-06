import * as EventEmitter from 'events'
import EventManager from '../helpers/EventManager'

export default class PascoNavigationButtons extends EventEmitter {
  constructor (document, config) {
    super()
    this._document = document
    this._config = config
    this._event_manager = new EventManager()
  }
  destroy () {
    this._event_manager.removeAlListeners()
  }
  init () {
    let navbtns_wrp = this._document.querySelector('#navbtns-wrp')
    let main_outline = this._document.querySelector('.main-stroke-outline')
    let move_started = false
    let cache = null
    let down_timeout_ms = 2000
    this.initResizeFeature(navbtns_wrp)
    if (this._config.nav_pos) {
      this.setButtonsPosition(navbtns_wrp, this._config.nav_pos)
    }
    if (this._config.nav_scale > 0) {
      this.setButtonsScale(navbtns_wrp, this._config.nav_scale)
    }
    this._event_manager.addDOMListenerFor(main_outline, 'mousedown', (evt) => {
      evt.preventDefault()
      if (!move_started) {
        this._document.addEventListener('mousemove', onmousemove, true)
        this._document.addEventListener('mouseup', onmouseup, true)
        move_started = true
        cache = {
          pos: [ evt.clientX, evt.clientY ],
          offsetLeft: navbtns_wrp.offsetLeft,
          offsetTop: navbtns_wrp.offsetTop,
          offsetWidth: navbtns_wrp.offsetWidth,
          offsetHeight: navbtns_wrp.offsetHeight,
        }
        cache.down_timeout = setTimeout(ondown_timeout, down_timeout_ms)
      }
    }, false)
    let ondown_timeout = () => {
      if (!cache) {
        return
      }
      if (!cache.end_pos) {
        if (cache.is_touch) {
          onmousecancel()
        } else {
          ontouchcancel()
        }
        if (this._toggleResizeMode) {
          this._toggleResizeMode()
        }
      } else {
        delete cache.down_timeout
      }
    }
    let onmousecancel = () => {
      this._document.removeEventListener('mousemove', onmousemove, true)
      this._document.removeEventListener('mouseup', onmouseup, true)
      move_started = false
      cache = null
    }
    let onmouseup = (evt) => {
      if (move_started) {
        evt.preventDefault()
        evt.stopPropagation()
        end()
        move_started = false
        cache = null
        document.removeEventListener('mousemove', onmousemove, true)
        document.removeEventListener('mouseup', onmouseup, true)
      }
    }
    let onmousemove = (evt) => {
      if (move_started) {
        evt.preventDefault()
        evt.stopPropagation()
        var new_pos = [ evt.clientX, evt.clientY ]
        cache.end_pos = move(new_pos[0]-cache.pos[0], new_pos[1]-cache.pos[1])
      }
    }
    this._event_manager.addDOMListenerFor(main_outline, 'touchstart', (evt) => {
      if (evt.touches.length == 1) {
        evt.preventDefault()
        evt.stopPropagation()
        if (!move_started) {
          move_started = true
          this._document.addEventListener('touchmove', ontouchmove, true)
          this._document.addEventListener('touchend', ontouchend, true)
          cache = {
            pos: [ evt.touches[0].clientX, evt.touches[0].clientY ],
            offsetLeft: navbtns_wrp.offsetLeft,
            offsetTop: navbtns_wrp.offsetTop,
            offsetWidth: navbtns_wrp.offsetWidth,
            offsetHeight: navbtns_wrp.offsetHeight,
            is_touch: true
          }
          cache.down_timeout = setTimeout(ondown_timeout, down_timeout_ms)
        }
      }
    }, false)
    let ontouchmove = (evt) => {
      if (move_started) {
        evt.preventDefault()
        evt.stopPropagation()
        let new_pos = [ evt.touches[0].clientX, evt.touches[0].clientY ]
        cache.end_pos = move(new_pos[0]-cache.pos[0], new_pos[1]-cache.pos[1])
      }
    }
    let ontouchcancel = () => {
      this._document.removeEventListener('touchmove', ontouchmove, true)
      this._document.removeEventListener('touchend', ontouchend, true)
      move_started = false
      cache = null
    }
    let ontouchend = (evt) => {
      if (move_started) {
        evt.preventDefault()
        evt.stopPropagation()
        end()
        move_started = false
        cache = null
        this._document.removeEventListener('touchmove', ontouchmove, true)
        this._document.removeEventListener('touchend', ontouchend, true)
      }
    }
    let end = () => {
      if (cache.down_timeout != null) {
        clearTimeout(cache.down_timeout)
        cache.down_timeout = null
      }
      if (cache.end_pos) {
        this.setNeedsToNotifyConfig({ nav_pos: cache.end_pos })
      }
    }
    let move = (dx, dy) => {
      let top = cache.offsetTop + dy
      let right = window.innerWidth - cache.offsetLeft - cache.offsetWidth - dx
      let bottom = window.innerHeight - cache.offsetTop - cache.offsetHeight - dy
      let left = cache.offsetLeft + dx
      let pos = {}
      if(top < bottom) {
        pos.top = top // top
      } else {
        pos.bottom = bottom // bottom
      }
      if(right < left) {
        pos.right = right // right
      } else {
        pos.left = left // left
      }
      this.setButtonsPosition(navbtns_wrp, pos)
      return pos
    }
  }
  initResizeFeature (navbtns_wrp) {
    // resize section
    let edit_wrp = navbtns_wrp.querySelector('.edit-bound')
    let reset_btn = navbtns_wrp.querySelector('.reset-btn')
    let _cache
    navbtns_wrp._scale_end = this._config.nav_scale
    this._event_manager.addDOMListenerFor(reset_btn, 'click', (evt) => {
      navbtns_wrp._scale_end = 1
      reset_btn.disabled = true
      this.setButtonsPosition(navbtns_wrp, null)
      this.setButtonsScale(navbtns_wrp, 1.0)
      this._toggleResizeMode(false)
      setNeedsToNotifyConfig({
        nav_scale: 1,
        nav_pos: null
      })
      reset_btn.disabled = false
    })
    // stop propagation for the following events
    for (let name of [ 'mousedown', 'touchstart' ]) {
      this._event_manager.addDOMListenerFor(reset_btn, name, (evt) => {
        evt.stopPropagation()
      }, true)
    }
    this._toggleResizeMode = (toggle) => {
      if (toggle == null) {
        toggle = !!navbtns_wrp.querySelector('.edit-bound').classList.contains('hide')
      }
      navbtns_wrp.querySelector('.edit-bound').classList[toggle?'remove':'add']('hide')
      if (_cache) {
        this._document.removeEventListener('mouseup', resize_onmouseup, true)
        this._document.removeEventListener('mousemove', resize_onmousemove, true)
        _cache = null
      }
      if (toggle) {
        this._document.addEventListener('mousedown', edit_onmousedown, false)
        this._document.addEventListener('touchstart', edit_ontouchstart, false)
      } else {
        this._document.removeEventListener('mousedown', edit_onmousedown, false)
        this._document.removeEventListener('touchstart', edit_ontouchstart, false)
      }
    }
    let edit_onmousedown = (evt) => {
      if (_cache) {
        return
      }
      evt.preventDefault()
      _cache = {}
      let elm = evt.target
      if(elm.classList.contains('dot'))
        elm = elm.parentNode
      let found_class = Array.from(elm.classList).find((a) => a.indexOf('resize-') == 0)
      this._document.addEventListener('mouseup', resize_onmouseup, true)
      if (found_class != null) {
        let dir = found_class.substr('resize-'.length, 2)
        let rect = navbtns_wrp.getBoundingClientRect()
        _cache.rect = rect
        _cache.resize = true
        _cache.dir = dir
        _cache.move_pos = [evt.clientX, evt.clientY]
        this._document.addEventListener('mousemove', resize_onmousemove, true)
      } else {
        _cache.down_timeout = setTimeout(edit_ondown_timeout, down_timeout_ms)
      }
    }
    let edit_ontouchstart = (evt) => {
      if (_cache) {
        return
      }
      if (evt.touches.length == 1) {
        evt.preventDefault()
        _cache = {}
        let elm = evt.touches[0].target
        if(elm.classList.contains('dot'))
          elm = elm.parentNode
        let found_class = Array.from(elm.classList).find((a) => a.indexOf('resize-') == 0)
        if (found_class != null) {
          var dir = found_class.substr('resize-'.length, 2)
          var rect = navbtns_wrp.getBoundingClientRect()
          _cache.rect = rect
          _cache.resize = true
          _cache.dir = dir
          _cache.move_pos = [evt.touches[0].clientX, evt.touches[0].clientY]
          this._document.addEventListener('touchend', resize_ontouchend, true)
          this._document.addEventListener('touchmove', resize_ontouchmove, true)
        } else {
          _cache.down_timeout = setTimeout(edit_ondown_timeout, down_timeout_ms)
        }
      }
    }
    let edit_ondown_timeout = () => {
      if(!_cache) {
        return
      }
      this._toggleResizeMode(false)
    }
    let resize_onmouseup = (evt) => {
      if (!_cache) {
        return
      }
      evt.preventDefault()
      if (_cache.down_timeout != null) {
        clearTimeout(_cache.down_timeout)
        _cache.down_timeout = null
      }
      if (_cache.resize) {
        this._document.removeEventListener('mouseup', resize_onmouseup, true)
        this._document.removeEventListener('mousemove', resize_onmousemove, true)
      }
      resize_onend()
      _cache = null
    }
    let resize_ontouchend = (evt) => {
      if (!_cache) {
        return
      }
      evt.preventDefault()
      if (_cache.down_timeout) {
        clearTimeout(_cache.down_timeout)
      }
      if (_cache.resize) {
        this._document.removeEventListener('touchend', resize_ontouchend, true)
        this._document.removeEventListener('touchmove', resize_ontouchmove, true)
      }
      resize_onend()
      _cache = null
    }
    let resize_onmousemove = (evt) => {
      if (_cache.resize) {
        evt.preventDefault()
        let new_move = [evt.clientX, evt.clientY]
        resize_onmove(_cache.dir, new_move[0]-_cache.move_pos[0], new_move[1]-_cache.move_pos[1])
      }
    }
    let resize_ontouchmove = (evt) => {
      if(_cache.resize) {
        evt.preventDefault()
        var new_move = [evt.touches[0].clientX, evt.touches[0].clientY]
        resize_onmove(_cache.dir, new_move[0]-_cache.move_pos[0], new_move[1]-_cache.move_pos[1])
      }
    }
    let resize_onmove = (dir, dx, dy) => {
      if (_cache && _cache.resize) {
        let start_diagonal = Math.sqrt(_cache.rect.width * _cache.rect.width +
                                       _cache.rect.height * _cache.rect.height)
        let new_width = _cache.rect.width
        let new_height = _cache.rect.height
        let scale = 0.2
        switch(dir) {
          case 'tl': {
            new_width -= dx*2
            new_height -= dy*2
            break
          }
          case 'tr': {
            new_width += dx*2
            new_height -= dy*2
            break
          }
          case 'br': {
            new_width += dx*2
            new_height += dy*2
            break
          }
          case 'bl': {
            new_width -= dx*2
            new_height += dy*2
            break
          }
        }
        if(new_width > 0 && new_height > 0) {
          let new_diagonal = Math.sqrt(new_width*new_width + new_height*new_height)
          scale = Math.max(scale, new_diagonal/start_diagonal*(navbtns_wrp._scale_end||1))
        }
        _cache.scale = scale
        this.setButtonsScale(navbtns_wrp, scale)
      }
    }
    let resize_onend = () => {
      if (_cache.resize && _cache.scale > 0) {
        navbtns_wrp._scale_end = _cache.scale
        this.setNeedsToNotifyConfig({ nav_scale: _cache.scale })
      }
    }
  }
  setButtonsScale (elm, scale) {
    elm.style.transform = 'scale('+scale.toFixed(2)+')'
    elm._scale = scale
    let edit_elm = elm.querySelector('.edit-bound')
    if (edit_elm) {
      let divs = edit_elm.querySelectorAll(':scope > div')
      let iscale = 1/scale
      for (let div of divs) {
        let found_class = Array.from(div.classList).find((a) => a.indexOf('resize-') == 0)
        if (found_class != null) {
          let dir = found_class.substr('resize-'.length, 2)
          let move_str = '', scale_str = 'scale('+iscale.toFixed(2)+')'
          switch(dir) {
          case 'tr':
            move_str = 'translate(50%, -50%)'
            break
          case 'tl':
            move_str = 'translate(-50%, -50%)'
            break
          case 'br':
            move_str = 'translate(50%, 50%)'
            break
          case 'bl':
            move_str = 'translate(-50%, 50%)'
            break
          }
          div.style.transform = move_str + ' ' + scale_str
        }
      }
    }
  }
  setButtonsPosition (elm, pos) {
    pos = pos || {}
    if (pos.top != null) {
      elm.style.top = pos.top + 'px'
      elm.style.bottom = 'initial'
    } else if (pos.bottom != null) {
      elm.style.bottom = pos.bottom + 'px'
      elm.style.top = 'initial'
    } else {
      elm.style.top = ''
      elm.style.bottom = ''
    }
    if (pos.left != null) {
      elm.style.left = pos.left + 'px'
      elm.style.right = 'initial'
    } else if (pos.right != null) {
      elm.style.right = pos.right + 'px'
      elm.style.left = 'initial'
    } else {
      elm.style.right = ''
      elm.style.left = ''
    }
  }
  setNeedsToNotifyConfig (change) {
    if (this._set_needs_save_config_timeout != null) {
      clearTimeout(this._set_needs_save_config_timeout)
    }
    this._set_needs_save_config_timeout = setTimeout(() => {
      this._set_needs_save_config_timeout = null
      this.emit('config-changed', change)
    }, 1000)
  }
}
