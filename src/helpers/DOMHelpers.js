
export function createElementFromHTML (html) {
  let tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp = tmp.firstChild
  while (tmp) {
    if (tmp.nodeType == 1) { // ELEMENT_NODE
      return tmp
    }
    tmp = tmp.nextSibling
  }
  return null
}


export function findElementFromParents (element, condf, target_parent) {
  let tmp = element
  while (tmp) {
    if (tmp.nodeType == 1 && condf(tmp)) {
      return tmp
    }
    if (target_parent != null && target_parent == tmp) {
      break
    }
    tmp = tmp.parentNode
  }
  return null
}
