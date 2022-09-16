import EventManager from '../../../helpers/EventManager'
import * as EventEmitter from 'events'
import delay from 'delay'
import scrollnav from 'scrollnav'

export default class SubMenuController extends EventEmitter {
  constructor (editConfigPage) {
    super()
    this._editConfigPage = editConfigPage
    this._core = this._editConfigPage.getCore()
    let document = this._document = this._editConfigPage.getDocument()
    this._$ = document.querySelector.bind(document)
    this._$a = document.querySelectorAll.bind(document)
    this._event_manager = new EventManager()
  }
  init () {
    // submenu buttons
    for (let elm of this._$a('.edit-config-container .submenu a')) {
      this._event_manager.addDOMListenerFor(elm, 'click', (evt) => {
        evt.preventDefault()
        var name = elm.getAttribute('data-name')
        history.replaceState({}, name, '#!' + name)
        this.openPage(name)
      })
    }
    // back button
    for (let elm of this._$a('.back-btn')) {
      this._event_manager.addDOMListenerFor(elm, 'click', async (evt) => {
        evt.preventDefault()
        history.replaceState({}, name, location.pathname)
        this._setActiveSubMenu('')
      })
    }
    // update scrollnav positions on collapsible move ends
    this._event_manager.addDOMListenerFor(this._document, 'x-collapsible-move-end', () => {
      if (scrollnav.initialized) {
        scrollnav.updatePositions()
      }
    }, false)
  }
  destroy () {
    this._event_manager.removeAllListeners()
  }
  async openPage (name) {
    let pagehead
    if (name != '') {
      pagehead = this._$('.x-navbar .head .page-head[data-name="' + name + '"]')
      if (!pagehead) {
        throw new Error('pagehead not found!')
      }
    }
    let isactive = pagehead ? pagehead.classList.contains('active') : false
    if (isactive) {
      return
    }
    { // hide currently active page
      let currently_active_set = new Set()
      let fadeout_initiated = false
      for (let elm of this._$a('.edit-config-container .page-sect')) {
        let elm_pagename = elm.getAttribute('data-name')
        if (elm.classList.contains('active') && name != elm_pagename) {
          currently_active_set.add(elm_pagename)
          elm.style.opacity = '1'
          elm.classList.add('fadeout')
          fadeout_initiated = true
        }
      }
      if (fadeout_initiated) {
        await delay(300)
      }
      for (let pagename of Array.from(currently_active_set)) {
        this.emit('page-inactive', pagename)
      }
    }
    if (!name) { // no page to open
      // elements to hide
      for (let elm of this._$a('.x-navbar .head .main-head, .x-navbar .back-btn')) {
        elm.classList.add('hidden')
      }
      // remove has-active from submenu
      for (let elm of this._$a('.edit-config-container .submenu')) {
        elm.classList.remove('has-active')
      }
    } else {
      // elements to hide
      for (let elm of this._$a('.x-navbar .head .main-head')) {
        elm.classList.add('hidden')
      }
      // elements to display
      for (let elm of this._$a('.x-navbar .back-btn')) {
        elm.classList.remove('hidden')
      }
      // add has-active to submenu
      for (let elm of this._$a('.edit-config-container .submenu')) {
        elm.classList.add('has-active')
      }
    }
    // toggle active on page-head
    for (let elm of this._$a('.x-navbar .head .page-head')) {
      let active = name == elm.getAttribute('data-name')
      elm.classList[active ? 'add' : 'remove']('active')
    }
    // toggle active on submenu item
    for (let elm of this._$a('.edit-config-container .submenu a')) {
      let active = name == elm.getAttribute('data-name')
      elm.classList[active ? 'add' : 'remove']('active')
    }
    // fadein & toggle active on page-sect
    {
      for (let elm of this._$a('.edit-config-container .page-sect')) {
        let active = name == elm.getAttribute('data-name')
        if (elm.classList.contains('fadeout')) { // end fadeout
          elm.classList.remove('fadeout')
          elm.style.opacity = ''
        }
        if (active) {
          // set fadein initial state
          elm.style.opacity = '0'
          elm.classList.add('active')
          await delay(10) // wait for next tick
          elm.classList.add('fadein')
        } else {
          elm.classList.remove('active') 
        }
      }
      this.emit('page-active', name)
      await delay(300)
      // transition end
      for (let elm of this._$a('.edit-config-container .page-sect')) {
        let active = name == elm.getAttribute('data-name')
        if (active) {
          elm.style.opacity = ''
          elm.classList.remove('fadein')
        }
      }
    }
    // initialize scrollnav
    let options = {
      updateHistory: false,
      sections: "h3 > .scrollnav-anchor",
    }
    if (scrollnav.initialized) {
      scrollnav.destroy()
      scrollnav.initialized = false
    }
    let include_scrollnav_list = Array.from(this._$a('.edit-config-container .page-sect.active .include-scrollnav'))
    this._document.body.classList[include_scrollnav_list.length > 0 ? 'add' : 'remove']('has-nav-scroll')
    for (let include_scrollnav of include_scrollnav_list) {
      scrollnav.init(include_scrollnav, options)
      scrollnav.initialized = true
    }
    setTimeout(() => {
      if (scrollnav.initialized) {
        scrollnav.updatePositions()
      }
    }, 500)
  }
}
