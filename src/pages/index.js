import PascoMain from './PascoMain'
import EditConfigPage from './EditConfigPage'
import HelpPage from './HelpPage'

import { RedirectPageException } from '../lib/exceptions'

let pages_map = {
  PascoMain,
  EditConfigPage,
  HelpPage,
}

async function run_page (Page) {
  await Page.onDocumentReady()
  let page = new Page(document)
  document.__page = page
  try {
    // show loading
    await page.init()
    page.onReady()
    // hide loading, is ready
  } catch (exc) {
    if (exc instanceof RedirectPageException) {
      location = exc.url
      return
    } else {
      try {
        page.displayError(exc)
      } catch (err) {
        console.error('DISPLAY FAILED', err)
        console.error(exc)
      }
    }
  }
  window.addEventListener('unload', () => {
    page.destroy()
  }, false);
  return page
}

function init () {
  let html = document.querySelector('html')
  if (html) {
    let pagename = html.getAttribute('x-page')
    if (pagename) {
      if (pages_map[pagename]) {
        run_page(pages_map[pagename])
      } else {
        console.error('Unknown page: ' + pagename)
      }
    }
  }  
}

// call init to bootstrap a page if there's one
init()
