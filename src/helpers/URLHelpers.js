

/**
 * expecting the path section of `b` to be one of the parent directories of `a`
 */
export function findURLRelativePath (a, b) {
  if (typeof a == 'string') {
    a = new URL(a)
  }
  if (typeof b == 'string') {
    b = new URL(b)
  }
  let relpath = null
  let a_dirname
  {
    let idx = a.pathname.lastIndexOf('/')
    if (idx != -1) {
      a_dirname = idx == a.pathname.length - 1 ? a.pathname : a.pathname.substring(0, idx + 1)
    }
  }
  if (a.origin == b.origin && b.pathname.startsWith(a_dirname)) {
    relpath = b.pathname.substring(a_dirname.length)
  }
  return relpath
}
