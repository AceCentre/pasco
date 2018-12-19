
// Cordova specific
document.addEventListener('deviceready', function() { 
  if(window.device) {
    document.querySelector('html').classList
      .add(window.device.platform.toLowerCase());
  }
}, false);

window.newEl = document.createElement.bind(document);
window.default_locale = 'en-GB';
window.default_config = 'config.json';
window.default_trees_info_fn = 'trees-info.json';
window.host_tree_dir_prefix = 'trees/';
window.default_tree = window.host_tree_dir_prefix + 'default/default.md';
window.cordova_user_dir_prefix = 'cdvfile://localhost/persistent/';

function fs_friendly_name (s) {
  return s.replace(/^[a-z]{1,10}\:\/\//i,"").replace(/\?.*$/,"")
    .replace(/[ \(\)\[\]\*\#\@\!\$\%\^\&\+\=\/\\:]/g, '_')
    .replace(/[\r\n\t]/g, '');
}

function get_trees_info (trees_info_fn) {
  return get_file_json(trees_info_fn)
    .catch(function (error) {
      console.warn("Could not load trees_info file, " + trees_info_fn, error);
      return { list: [
        {
          name: info.dirname,
          tree_fn: info.tree_fn,
        }
      ] };
    })
}

/**
 * determines place of tree and prepares it if default does not exists
 */
function prepare_tree(tree_fn) {
  if(!tree_fn)
    throw new Error("Invalid argument");
  if (window.cordova && tree_fn.indexOf(window.cordova_user_dir_prefix) == 0) {
    tree_fn = tree_fn.substr(window.cordova_user_dir_prefix.length);
  }
  var parts = tree_fn.split('/'),
      basename = parts[parts.length - 1],
      dirname = parts.slice(0, parts.length - 1).join("/");
  // remove host dir prefix
  if(dirname.indexOf(window.host_tree_dir_prefix) == 0) {
    dirname = dirname.substr(window.host_tree_dir_prefix.length);
  }
  // should have a dirname
  if(!dirname) {
    tree_fn = 'default/' + tree_fn;
    dirname = 'default';
  }
  // make dirname fs friendly
  var dirpath = dirname = fs_friendly_name(dirname);
  // for cordova
  if(window.cordova) {
    var path = tree_fn;
    dirpath = window.cordova_user_dir_prefix + dirname;
    var newpath = dirpath + '/' + basename,
        audio_dir = dirpath + '/audio';
    return new Promise(function(resolve, reject) {
      window.resolveLocalFileSystemURL(newpath, resolve, continue_proc);
      function continue_proc(err) {
        // if not found
        cordova_mkdir(dirpath)
          .then(function() {
            return read_file(path)
          })
          .catch(function(err) {
            if (err.caused_by && err.caused_by.code == 1) { // not found
              return ""; // write empty file
            } else {
              throw err;
            }
          })
          .then(function(data) {
            return write_file(newpath, data)
          })
          .then(resolve, reject);
      }
    })
      .then(function() {
        return cordova_mkdir(audio_dir);
      })
      .then(function() {
        return {
          tree_fn: newpath,
          dirpath: dirpath,
          audio_dir: audio_dir
        };
      });
  } else {
    return Promise.resolve({
      tree_fn: tree_fn,
      dirpath: dirpath,
      audio_dir: null // Not implemented
    });
  }
}

function initialize_app() {
  var replaceFileKeys = ['default_config','default_trees_info_fn'];
  // for cordova
  if(window.cordova) {
    var promises = [];
    _.each(replaceFileKeys, function(key) {
      var path = window[key],
          newpath = window.cordova_user_dir_prefix + window[key];
      promises.push(
        new Promise(function(resolve, reject) {
          window.resolveLocalFileSystemURL(newpath, resolve, continue_proc);
          function continue_proc(err) {
            // if not found, write it, if it exists
            read_file(path)
              .catch(function (err) {
                if (err.caused_by && err.caused_by.code == 1) { // not found
                  return {__notfound:true};
                } else {
                  throw err;
                }
              })
              .then(function (data) {
                if (!data.__notfound) {
                  return write_file(newpath, data)
                }
              })
              .then(resolve, reject);
          }
        })
          .then(function() {
            window[key] = newpath;
          })
      );
    });
    return Promise.all(promises);
  } else {
    function new_read(key) {
      var result = localStorage.getItem('file_'+key);
      if(result == null) {
        return read_file(key);
      } else {
        return Promise.resolve(result);
      }
    }
    function new_write(key, data) {
      localStorage.setItem('file_'+key, data);
      return Promise.resolve();
    }
    function delete_entry(key) {
      localStorage.removeItem('file_'+key);
      return Promise.resolve();
    }
    window.get_file_json = function(key) {
      return new_read(key) 
        .then(function(data) {
          var config = JSON.parse(data);
          if(!config)
            throw new Error("No input json!, " + key);
          return config;
        });
    }
    window.get_file_data = new_read
    window.set_file_data = new_write
    window.unset_file = delete_entry
    return Promise.resolve();
  }
}
function tree_mk_list_base(tree, el, content_template) {
  el.target_node = tree
  tree.dom_element = el;
  el.classList.add('level-' + tree.level);
  el.classList.add('node')
  var text = tree.text || '';
  if(content_template) {
    var cel = newEl('div');
    cel.classList.add('content');
    el.appendChild(cel);
    tree.content_element = cel;
    var tmp = newEl('div');
    tmp.textContent = text;
    cel.innerHTML = content_template({
      text: tmp.innerHTML,
      tree: tree
    });
    var txtel = cel.querySelector('.text');
    if(txtel) {
      tree.txt_dom_element = txtel;
    }
  } else {
    var cel = newEl('div');
    cel.classList.add('content');
    el.appendChild(cel);
    tree.content_element = cel;
    var txtel = newEl('p');
    txtel.classList.add('text');
    txtel.textContent = text;
    cel.appendChild(txtel);
    tree.txt_dom_element = txtel;
  }
  if(!tree.is_leaf) {
    var nodes = tree.nodes,
        ul = newEl('ul');
    tree.nodes_ul_dom_element = ul;
    ul.classList.add('children');
    for(var i = 0, len = nodes.length; i < len; ++i) {
      var node = nodes[i],
          li = newEl('li');
      tree_mk_list_base(node, li, content_template);
      ul.appendChild(li);
    }
    el.appendChild(ul);
  }
}
var _parse_dom_tree_pttrn01 = /^H([0-9])$/,
    _parse_dom_tree_pttrn02 = /^LI$/,
    _parse_dom_tree_pttrn03 = /\(([^\)]*)\)$/;
function parse_dom_tree_subrout_parse_text(text) {
  text = text.trim()
  var meta = {}, match, _more_meta = {};
  // special format for auditory-cue meta (#8)
  if((match = text.match(_parse_dom_tree_pttrn03)) != null) {
    text = text.substr(0, text.length - (match[1].length + 2))
    if(match[1].length > 0) {
      meta['auditory-cue'] = match[1]
      _more_meta['auditory-cue-in-text'] = true;
    }
  }
  return {
    text: text,
    meta: meta,
    _more_meta: _more_meta
  }
}
function tree_add_node(parent_node, at, data, content_template) {
  // data can contain (_more_meta, meta, text, nodes)
  var node = {
    is_leaf: !data.nodes || data.nodes.length == 0,
    level: parent_node.level + 1,
    text: data.text,
    meta: data.meta,
    _more_meta: data._more_meta,
    parent: parent_node
  };
  if(at == null) {
    at = parent_node.nodes.length;
  } else if(at > parent_node.nodes.length || at < 0) {
    throw new Error("`at` should be in range of parent's nodes");
  }
  if (parent_node.is_leaf) {
    parent_node.is_leaf = false;
    parent_node.nodes = [];
    parent_node.static_nodes = [];
    var ul = newEl('ul');
    ul.classList.add('children');
    parent_node.nodes_ul_dom_element = ul;
    parent_node.dom_element.appendChild(ul);
  }
  var after_node, static_node_idx;
  if(at < parent_node.nodes.length) {
    after_node = parent_node.nodes[at];
    static_node_idx = parent_node.static_nodes.indexOf(after_node);
    if (static_node_idx == -1) {
      throw new Error("tree_add_node at node is not static node");
    }
  } else {
    static_node_idx = parent_node.static_nodes.length;
  }
  parent_node.nodes.splice(at, 0, node);
  parent_node.static_nodes.splice(static_node_idx, 0, node);
  var li = newEl('li');
  if(after_node) {
    parent_node.nodes_ul_dom_element.insertBefore(li, after_node.dom_element);
  } else {
    parent_node.nodes_ul_dom_element.appendChild(li);
  }
  tree_mk_list_base(node, li, content_template);
  return node;
}
function tree_attach_node (node, parent, at) {
  if(at == null) {
    at = parent_node.nodes.length;
  } else if(at > parent_node.nodes.length || at < 0) {
    throw new Error("`at` should be in range of parent's nodes");
  }
  tree_setup_node(node, parent);
  if (parent_node.is_leaf) {
    parent_node.is_leaf = false;
    parent_node.nodes = [];
    parent_node.static_nodes = [];
    var ul = newEl('ul');
    ul.classList.add('children');
    parent_node.nodes_ul_dom_element = ul;
    parent_node.dom_element.appendChild(ul);
  }
  var after_node, static_node_idx;
  if(at < parent_node.nodes.length) {
    after_node = parent_node.nodes[at];
    static_node_idx = parent_node.static_nodes.indexOf(after_node);
    if (static_node_idx == -1) {
      throw new Error("tree_add_node at node is not static node");
    }
  } else {
    static_node_idx = parent_node.static_nodes.length;
  }
  parent_node.nodes.splice(at, 0, node);
  parent_node.static_nodes.splice(static_node_idx, 0, node);
  var li = newEl('li');
  if(after_node) {
    parent_node.nodes_ul_dom_element.insertBefore(li, after_node.dom_element);
  } else {
    parent_node.nodes_ul_dom_element.appendChild(li);
  }
  return node;
}
function tree_remove_node_from_parent (node) {
  var parent = node.parent;
  if (parent && !parent.is_leaf) {
    var idx = parent.nodes.indexOf(node);
    if (idx != -1) {
      parent.nodes.splice(idx, 1);
    }
    var static_node_idx = parent.static_nodes.indexOf(node);
    if (static_node_idx != -1) {
      parent.static_nodes.splice(static_node_idx, 1);
    }
    delete node.parent;
    node.level = 0;
    parent.nodes_ul_dom_element.removeChild(node.dom_element);
    if (parent.nodes.length == 0) {
      parent.nodes_ul_dom_element.parentNode.removeChild(parent.nodes_ul_dom_element);
      delete parent.nodes_ul_dom_element;
      parent.is_leaf = true;
      delete parent.nodes;
      delete parent.static_nodes;
    }
  }
}
function tree_setup_node (anode, parent) {
  anode.parent = parent;
  anode.level = parent.level + 1;
  if (!anode.meta)
    anode.meta = {};
  if (!anode._more_meta)
    anode._more_meta = {};
  var hasnodes = !!anode.nodes && anode.nodes.length > 0;
  anode.is_leaf = !hasnodes;
  if (hasnodes) {
    anode.static_nodes = [].concat(anode.nodes);
    _.each(anode.nodes, function (a) { tree_setup_node(a, anode); });
  }
}


function parse_dom_tree(el, continue_at, tree) {
  continue_at = continue_at || { i: 0 };
  tree = tree || { level: 0, meta: {}, _more_meta: {} };
  tree.nodes = tree.nodes || [];
  for(var len = el.childNodes.length; continue_at.i < len; continue_at.i++) {
    var cnode = el.childNodes[continue_at.i],
        match;
    if(cnode.nodeType == Node.ELEMENT_NODE) {
      if((match = cnode.nodeName.match(_parse_dom_tree_pttrn01)) ||
         _parse_dom_tree_pttrn02.test(cnode.nodeName)) { // branch
        var level = match ? parseInt(match[1]) : tree.level + 1,
            is_list = !match;
        if(level > tree.level) {
          var txt_dom_el = is_list ? cnode.querySelector(":scope > p") : cnode,
              txt_elm_content;
          if(!txt_dom_el) {
            txt_elm_content = [];
            _.each(cnode.childNodes, function (cnode) {
              if (cnode.nodeType == Node.TEXT_NODE) {
                txt_elm_content.push(cnode.textContent);
              }
            });
            txt_elm_content = txt_elm_content.join(" ");
          } else {
            txt_elm_content = txt_dom_el.textContent;
          }
          var td = parse_dom_tree_subrout_parse_text(txt_elm_content);
          var anode = {
            txt_dom_element: txt_dom_el,
            dom_element: cnode,
            level: level,
            text: td.text,
            meta: td.meta,
            _more_meta: td._more_meta,
            parent: tree
          };
          if(is_list) {
            tree.nodes.push(parse_dom_tree(cnode, null, anode));
          } else {
            // process inner nodes
            parse_dom_tree(cnode, null, anode);
            continue_at.i += 1;
            tree.nodes.push(parse_dom_tree(el, continue_at, anode));
          }
          if(anode.nodes.length == 0) { // is a leaf
            anode.is_leaf = true;
            delete anode.nodes;
          }
        } else {
          if(continue_at.i > 0)
            continue_at.i -= 1;
          break; // return to parent call
        }
      } else if(cnode.nodeName == 'META') {
        var thenode = tree.nodes.length > 0 ?
                      tree.nodes[tree.nodes.length - 1] : tree;
        for(var i = 0, xlen = cnode.attributes.length; i < xlen; ++i) {
          var attr = cnode.attributes[i];
          if(attr.name.indexOf('data-') == 0) {
            thenode.meta[attr.name.substr(5)] = attr.value;
          }
        }
      } else { // go deeper
        parse_dom_tree(cnode, null, tree);
      }
    }
  }
  return tree;
}

function initl10n(locale) {
  return updatel10n(locale, true);
}

function updatel10n(locale, firsttime) {
  if(window.__locale_script && window.__locale_script.parentNode)
    window.__locale_script.parentNode.removeChild(window.__locale_script);
  return load_script('l10n/' + locale + '.js')
    .then(function(script) {
      return new Promise(function(resolve, reject) {
        window.__locale_script = script;
        var unresolved = false;
        if(window.icu) {
          if(icu.dictionary) {
            _t.setTranslation(icu.dictionary);
          }
          document.body.classList[icu.rtl ? 'add' : 'remove']('rtl');
          var elm = document.getElementById('bootstrap-rtl');
          if(!elm && icu.rtl) {
            var src = "bower_components/bootstrap-rtl/dist/css/bootstrap-rtl.css";
            elm = document.createElement('link');
            elm.setAttribute('href', src);
            elm.setAttribute('rel', 'stylesheet');
            elm.id = "bootstrap-rtl";
            document.body.appendChild(elm);
            unresolved = !!firsttime;
            if(unresolved) {
              elm.addEventListener('load', onresolve, false);
              setTimeout(onresolve, 3000);
            }
          } else if(elm && !icu.rtl && elm.parentNode) {
            elm.parentNode.removeChild(elm);
          }
        }
        if(!unresolved) {
          resolve();
        }
        function onresolve() {
          if(unresolved) {
            resolve();
            unresolved = false;
          }
        }
      });
    });
}

function domlocalize() {
  var elms = document.querySelectorAll('[x-l10n]');
  for(var i = 0, len = elms.length; i < len; i++) {
    var elm = elms[i],
        l10n = elm.getAttribute('x-l10n'),
        l10n_cached = elm.getAttribute('x--l10n'),
        text = elm.textContent.trim(),
        l10n_input = l10n_cached||l10n||text,
        default_l10n = elm.getAttribute('x--l10n-default');
    if (l10n != '#NULL#') {
      var localized = _t(l10n_input);
      // initialize x--l10n-default if needed
      if (!default_l10n && l10n && text &&
          localized == l10n && l10n != text) {
        default_l10n = elm.textContent;
        elm.setAttribute('x--l10n-default', default_l10n);
      }
      if(!l10n || localized != l10n) {
        elm.textContent = localized;
        if(!l10n && !l10n_cached)
          elm.setAttribute('x--l10n', l10n_input);
      } else if (l10n && l10n != default_l10n) {
        elm.textContent = default_l10n;
      }
    }
  }
  _.each(document.querySelectorAll('.has-l10n-attr'), function (elm) {
    var newattrs = [];
    _.each(elm.attributes, function (attr) {
      var prefix_const = 'x-l10n-';
      if (attr.name.indexOf(prefix_const) == 0 &&
          attr.name.length > prefix_const.length) {
        var name = attr.name.substr(prefix_const.length);
        newattrs.push([name, _t(attr.value)]);
      }
    });
    _.each(newattrs, function (attr) { elm.setAttribute(attr[0], attr[1]); });
  });
}

function load_script(fn) {
  return new Promise(function(resolve, reject) {
    var s = newEl('script');
    s.addEventListener('load', function() {
      resolve(s);
    }, false);
    s.addEventListener('error', function() {
      reject(new Error('Could not load script, ' + fn));
    }, false);
    s.async = true;
    s.defer = true;
    s.src = fn;
    s.type = 'text/javascript';
    document.body.appendChild(s);
  });
}

function handle_error_checkpoint() {
  var stack = new Error().stack.split("\n").slice(1).join("\n").trim();
  if(!stack) {
    throw new Error("Could not get any stack from checkpoint");
  }
  return function(err) {
    if(err.withcheckpoint)
      throw err;
    throw {
      withcheckpoint: true,
      checkpoint_stack: stack,
      error: err
    };
  }
}

function handle_error_data (err) {
  if(err.withcheckpoint) {
    return {
      error: [ "checkpoint:", err.checkpoint_stack, err.error ],
      alert:err.error+''
    };
  } else {
    return {
      error: [ err ],
      alert:err
    };
  }
}

function handle_error (err) {
  var data = handle_error_data(err);
  console.error.apply(console, data.error);
  alert(err.alert);
}

function delete_file(url, options) {
  options = options || { method: 'DELETE' }
  // cordova specific
  if(!/^(https?):\/\//.test(url) && window.cordova &&
     window.resolveLocalFileSystemURL) {
    url = _cordova_fix_url(url)
    return new Promise(function(resolve, reject) {
      function onEntry(entry) {
        entry.remove(resolve, onFail);
      }
      function onFail(err) {
        console.error(err);
        reject("Fail to delete `" + url + "` -- " + err+'')
      }
      window.resolveLocalFileSystemURL(url, onEntry, function(){ resolve(); });
    });
  } else {
    // post otherwise
    if(!options.method)
      options.method = 'DELETE'
    return read_file(url, options);
  }  
}

function cordova_rmdir_rec(path) {
  return new Promise(function (resolve, reject) {
    function onEntry(entry) {
      entry.removeRecursively(resolve, onFail);
    }
    function onFail(err) {
      var newerr = new Error("Fail to delete `" + path + "` -- " + err.code + ", " + err.message);
      newerr.caused_by = err;
      reject(newerr);
    }
    window.resolveLocalFileSystemURL(path, onEntry, onFail);
  });
}

function cordova_mkdir(path) {
  return new Promise(function(resolve, reject) {
    var parts = path.split('/'),
        basename = parts[parts.length - 1],
        dirname = parts.slice(0, parts.length - 1).join("/");
    function onEntry(dirEntry) {
      dirEntry.getDirectory(basename, { create: true }, function (secondDirEntry) {
        resolve();
      }, onFail);
    }
    function onFail(err) {
      console.error(err);
      reject("Fail to mkdir `" + url + "` -- " + err.code + ", " + err.message)
    }
    window.resolveLocalFileSystemURL(dirname, onEntry, onFail);
  });
}

function write_file(url, data, options) {
  options = options || { method: 'POST' }
  // cordova specific
  if(!/^(https?):\/\//.test(url) && window.cordova &&
     window.resolveLocalFileSystemURL) {
    return new Promise(function(resolve, reject) {
      url = _cordova_fix_url(url);
      var parts = url.split('/'),
          filename = parts[parts.length - 1],
          dirname = parts.slice(0, parts.length - 1).join("/");
      function onEntry(dirEntry) {
        dirEntry.getFile(filename, { create: true }, function (fileEntry) {
          // Create a FileWriter object for our FileEntry
          fileEntry.createWriter(function (fileWriter) {

            fileWriter.onwriteend = function() {
              resolve()
            };

            fileWriter.onerror = function(err) {
              var newerr = new Error("Fail to write `" + url + "` -- " + (err.message || err.code))
              newerr.caused_by = err;
              reject(newerr)
            };

            if(!(data instanceof Blob)) {
              if(typeof data != 'string')
                throw new Error("Unexpected input data, string or Blob accepted");
              data = new Blob([data], { type: options.contentType || 'application/octet-stream' });
            }

            fileWriter.write(data);
          });
        }, onFail);
      }
      function onFail(err) {
        console.error(err);
        reject("Fail to write `" + url + "` -- " + err.message)
      }
      window.resolveLocalFileSystemURL(dirname, onEntry, onFail);
    });
  } else {
    // post otherwise
    options.data = data
    if(!options.method)
      options.method = 'POST'
    return read_file(url, options);
  }
}

function _cordova_fix_url(url) {
  return ((/^[a-z]+:\/\//i).test(url) ?
          '' : 'cdvfile://localhost/bundle/www/') + url;
}

function file_exists(url, options) {
  if(!/^(https?):\/\//.test(url) && window.cordova &&
     window.resolveLocalFileSystemURL) {
    return new Promise(function(resolve, reject) {
      url = _cordova_fix_url(url)
      function onSuccess(fileEntry) {
        resolve(true);
      }
      function onFail(err) {
        if(err.code == 1) { // not found
          resolve(false);
        } else {
          console.error(err);
          reject("Fail to access `" + url + "` -- " + err.code)
        }
      }
      window.resolveLocalFileSystemURL(url, onSuccess, onFail);
    });
  } else {
    return read_file(url, options)
      .then(function() { return true; });
  }
}
/**
 * options
 *   - responseType [blob]
 */
function read_file(url, options) {
  return new Promise(function(resolve, reject) {
    options = options || {};
    if(!/^(https?):\/\//.test(url) && window.cordova &&
       window.resolveLocalFileSystemURL) {
      url = _cordova_fix_url(url)
      function onSuccess(fileEntry) {
        fileEntry.file(function(file) {
          if(options.responseType == 'blob') {
            resolve(file);
          } else {
            var reader = new FileReader();

            reader.onloadend = function(e) {
              resolve(this.result)
            }

            reader.readAsText(file);
          }
        });

      }
      function onFail(err) {
        // err contains {code}. more info https://github.com/apache/cordova-plugin-file#list-of-error-codes-and-meanings
        var newerr = new Error("Fail to load `" + url + "` -- " + err.code)
        newerr.caused_by = err;
        reject(newerr)
      }
      window.resolveLocalFileSystemURL(url, onSuccess, onFail);
    } else {
      var xhr = new XMLHttpRequest();
      if(options.responseType) {
        xhr.responseType = options.responseType;
      }
      xhr.open(options.method || 'GET', url);
      xhr.onreadystatechange = function() {
        if(xhr.readyState === XMLHttpRequest.DONE) {
          if(xhr.status >= 200 && xhr.status < 300) {
            if(options.blobResponse) {
              resolve(xhr.response);
            } else {
              resolve(xhr.responseText)
            }
          } else {
            var err = new Error(xhr.statusText || 'unknown status ' + xhr.status + ' for `' + url + '`');
            err.options = options;
            err.url = url;
            err.xhr = xhr;
            reject(err)
          }
        }
      }
      xhr.send(options.data || null);
    }
  });
}

function _theinput_refocus() {
  var theinput = this;
  setTimeout(function() {
    theinput.focus();
  }, 100);
}

function keyevents_needs_theinput() {
  return /iP(hone|od|ad)/.test(navigator.userAgent);
}

function keyevents_handle_theinput() {
  keyevents_handle_theinput_off();
  var theinputwrp = document.getElementById('theinput-wrp');
  var theinput = document.getElementById('theinput');
  var docscroll_handler;
  function preventdefault(evt) {
    evt.preventDefault();
  }
  if(theinput) {
    theinput.addEventListener('blur', _theinput_refocus, false);
    theinput.focus();
    theinput.addEventListener('keydown', preventdefault, false);
    theinput.addEventListener('keyup', preventdefault, false);
    document.addEventListener('scroll', docscroll_handler = function() {
      theinputwrp.style.top = window.scrollY + 'px';
      theinputwrp.style.left = window.scrollX + 'px';
    }, false);
    window.keyevents_handle_theinput_off = function() {
      theinput.removeEventListener('blur', _theinput_refocus, false);
      theinput.removeEventListener('keydown', preventdefault, false);
      theinput.removeEventListener('keyup', preventdefault, false);
      document.removeEventListener('scroll', docscroll_handler, false);
      window.keyevents_handle_theinput_off = function() { } //dummy func
      theinput.blur();
    }
  }
}

window.keyevents_handle_theinput_off = function() { } // dummy func


function SpeakUnit(api) {
  SpeakUnit._instancePromise = this;
  this._alt_finish_queue = [];
  this.api = api;
}

SpeakUnit.getInstance = function(api) {
  if(SpeakUnit._instancePromise) {
    return Promise.resolve(SpeakUnit._instancePromise);
  } else {
    throw new Error("No instance found, it's not initialized!");
  }
}
var proto = SpeakUnit.prototype;

proto.init = function() {
  var api = this.api;
  var self = this;
  return (api.available ? Promise.all([
    api.has_synthesizer(),
    api.has_audio_device()
  ]) : Promise.resolve(false))
    .then(function(results) {
      if(results && results[0] && results[1]) {
        self.is_native = true
        return self.api.init_synthesizer()
          .then(function(synthesizer) {
            self.synthesizer = synthesizer;
            return self;
          })
      } else { // alternative approach
        return new Promise(function(resolve, reject) {
          var script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = true;
          script.onload = function() {
            try {
              self.is_native = false
              self.responsiveVoice = responsiveVoice
              responsiveVoiceFix(responsiveVoice);
              // voiceSupport check removed, it is not the indicator for responsiveVoice compatibility
              resolve(self);
            } catch(err) {
              reject(err);
            }
          };
          script.onerror = function() {
            reject("Could not load responsivevoice code");
          };
          script.src = "https://code.responsivevoice.org/responsivevoice.js";
          document.body.appendChild(script);
        });
        function responsiveVoiceFix (rv) {
          var orgiFallback_audioPool_getAudio = rv.fallback_audioPool_getAudio;
          rv.fallback_audioPool_getAudio = function () {
            if (rv.fallback_audiopool_index >= rv.fallback_audiopool.length) {
              rv.fallback_audiopool = [];
            }
            return orgiFallback_audioPool_getAudio.apply(this, arguments);
          }
          var origClearFallbackPool = rv.clearFallbackPool;
          rv.clearFallbackPool = function () {
            _.each(rv.fallback_audiopool, function (audio) {
              audio.pause();
            });
            rv.fallback_audiopool = [];
            return origClearFallbackPool.apply(this, arguments);
          }
        }
      }
    });
}

proto.simple_speak = function(speech, opts) {
  var self = this;
  return self.start_speaking(speech, opts)
    .then(function(hdl) {
      return self.speak_finish(hdl)
        .then(function() {
          return self.utterance_release(hdl);
        });
    });
}

window._alt_voice_rate_by_name = { 'default': 1.0, 'max': 2.0, 'min': 0.5 };

proto.start_speaking = function(speech, opts) {
  if(this._audio_tag) {
    // prevent multiple audio running at same time
    this.stop_audio()
  }
  var self = this;
  opts = Object.assign({}, opts)
  if(self.is_native) {
    for(var key in opts)
      if(key.indexOf('alt_') == 0)
        delete opts[key];
    var override_to_speaker = false,
        promise = Promise.resolve();
    if(typeof opts.override_to_speaker != 'undefined') {
      override_to_speaker = opts.override_to_speaker
      delete opts.override_to_speaker;
    }
    if ((override_to_speaker && !self._last_override_to_speaker) ||
        (!override_to_speaker && self._last_override_to_speaker)) {
      self._last_override_to_speaker = override_to_speaker;
      promise = self.api.override_output_to_speaker(override_to_speaker);
    }
    return promise
      .then(function () {
        return self.api.init_utterance(speech, opts)
      })
      .then(function(utterance) {
        return self.api
          .speak_utterance(self.synthesizer, utterance)
          .then(function(){ return utterance; });
      });
  } else {
    for(var key in opts)
      if(key.indexOf('alt_') == 0) {
        opts[key.substr(4)] = opts[key]
        delete opts[key];
      }
    if(opts.rate) {
      if(opts.rate in _alt_voice_rate_by_name)
        opts.rate = _alt_voice_rate_by_name[opts.rate]
      opts.rate = opts.rate * (opts.rateMul || 1.0)
    }
    delete opts.rateMul
    var voiceId = opts.voiceId;
    delete opts.voiceId;
    delete opts.override_to_speaker;
    // TODO:: control audio playback,
    // delay can be implemented if access to audio playback is at this level
    var retobj = {};
    function onend() {
      if(retobj.onend)
        retobj.onend.apply(this, arguments)
      retobj.didend = true;
    }
    opts.onend = onend
    // bugfix for responsiveVoice not calling onend
    // when cancel called before speak
    self.responsiveVoice.cancelled = false;
    self.responsiveVoice.speak(speech, voiceId, opts);
    return Promise.resolve(retobj);
  }
}

proto.utterance_release = function(utterance_hdl) {
  if(this.is_native) {
    return this.api.release_utterance(utterance_hdl);
  } else {
    return Promise.resolve();
  }
}

proto.speak_finish = function(utterance_hdl) {
  var self = this
  if(self.is_native) {
    return self.api.speak_finish(self.synthesizer, utterance_hdl);
  } else {
    var self = this;
    return new Promise(function(resolve, reject) {
      if(utterance_hdl.didend)
        return resolve();
      self._alt_finish_queue.push(resolve)
      utterance_hdl.onend = function() {
        var idx = self._alt_finish_queue.indexOf(resolve);
        if(idx != -1)
          self._alt_finish_queue.splice(idx, 1);
        resolve();
      }
      /*
      function check() {
        ref[0] = setTimeout(function() {
          if(self.responsiveVoice.isPlaying())
            check();
          else {
            var idx = self._alt_finish_queue.indexOf(ref);
            if(idx != -1)
              self._alt_finish_queue.splice(idx, 1);
            resolve();
          }
        }, 50); // check resolution
      }
      check();
      */
    });
  }
}

proto.stop_speaking = function() {
  if(this._audio_tag || this._cordova_media) {
    this.stop_audio()
    return Promise.resolve();
  } else {
    if(this.is_native) {
      return this.api.stop_speaking(this.synthesizer);
    } else {
      this.responsiveVoice.cancel();
      while((resolve = this._alt_finish_queue.shift()))
        resolve();
      return Promise.resolve();
    }
  }
}

proto.get_voices = function() {
  if(this.is_native) {
    return this.api.get_voices();
  } else {
    return Promise.resolve(_.map(this.responsiveVoice.getVoices(),function(v) {
      return {
        id: v.name,
        label: v.name
      };
    }));
  }
}

proto._cordova_stop_audio = function() {
  if(this._cordova_media) {
    this._cordova_media.stop();
    this._cordova_media.release();
    this._cordova_media = null;
  }
  return Promise.resolve();
}

proto._cordova_play_audio = function(src, opts) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._cordova_stop_audio()
    src = _cordova_fix_url(src)
    var media = self._cordova_media = 
        new Media(src,
                  function() {
                    resolve()
                  },
                  function(err) {
                    reject("Error loading media: " + src +
                           ", error: " + err.code);
                  });
    if(opts.volume)
      media.setVolume(opts.volume)
    var play_opts = {};
    if(opts.override_to_speaker)
      play_opts.overrideToSpeaker = true;
    self._last_override_to_speaker = !!play_opts.overrideToSpeaker;
    media.play(play_opts);
  });
}

proto.stop_audio = function() {
  if(window.cordova && window.Media) {
    // alternative approach
    return this._cordova_stop_audio()
  }
  if(this._audio_tag) {
    this._audio_tag.pause()
    if(this._audio_tag.parentNode)
      this._audio_tag.parentNode.removeChild(this._audio_tag);
    if(this._audio_onstop_callback) {
      this._audio_onstop_callback()
      this._audio_onstop_callback = null
    }
    this._audio_tag = null
  }
  return Promise.resolve();
}


proto.play_audio = function(src, opts) {
  opts = opts || {};
  if(window.cordova && window.Media) {
    // alternative approach
    return this._cordova_play_audio(src, opts)
  }
  var self = this;
  self.stop_audio()
  var audio = self._audio_tag = newEl('audio')
  document.body.appendChild(audio)
  return new Promise(function(resolve, reject) {
    if(!audio.parentNode) {
      // stopped
      return resolve();
    }
    if(opts.volume) {
      audio.setAttribute('volume', opts.volume.toFixed(2)+'');
      audio.volume = opts.volume;
    }
    audio.setAttribute('preload', 'auto')
    var src_el = newEl('source');
    src_el.setAttribute('src', src)
    audio.appendChild(src_el);
    var stime = new Date().getTime()
    audio.addEventListener('canplay', function() {
      var diff = new Date().getTime() - stime;
      if(diff >= opts.delay * 1000) {
        audio.play()
      } else {
        setTimeout(function() {
          audio.play()
        }, opts.delay * 1000 - diff);
      }
    }, false);
    audio.addEventListener('error', function() {
      reject(audio.error);
    }, false);
    audio.addEventListener('ended', function() {
      audio.pause()
      if(audio.parentNode)
        audio.parentNode.removeChild(audio);
      resolve()
    }, false);
    self._audio_onstop_callback = resolve
  });
}

function read_json(url, options) {
  return read_file(url, options)
    .then(function(data) {
      var data = JSON.parse(data);
      if(!data)
        throw new Error("No input json!, " + url);
      return data;
    });
}

window.get_file_json = read_json
window.get_file_data = read_file
window.set_file_data = write_file
window.unset_file = delete_file



document.addEventListener('click', function(evt) {
  var el = evt.target;
  var toggle_sel = el.getAttribute('data-collapse-toggle');
  if(toggle_sel) {
    var toggle_el = document.querySelector(toggle_sel);
    if(toggle_el) {
      collapsable_toggle(toggle_el);
    }
  }
}, false);

document.addEventListener('DOMContentLoaded', update_collapsables, false);
window.addEventListener('resize', set_needs_update_collapsables, false);

function set_needs_update_collapsables() {
  if(window._collapsable_timeout)
    clearTimeout(window._collapsable_timeout);
  window._collapsable_timeout = setTimeout(function() {
    delete window._collapsable_timeout;
    update_collapsables();
  }, 200);
}

function update_collapsables() {
  var elms = document.querySelectorAll('.x-collapsable');
  for(var i = 0, len = elms.length; i < len; i++) {
    var elm = elms[i];
    if(!elm.classList.contains('x-collapse')) {
      update_collapsable(elm);
    }
  }
}

function update_collapsable(elm) {
  var tmp = elm;
  var set_height_queue = [];
  while(tmp != null && tmp.nodeType == document.ELEMENT_NODE) {
    if(tmp.classList.contains('x-collapsable')) {
      set_height_queue.push(update_collapsable_subrout(tmp));
    }
    tmp = tmp.parentNode;
  }
  for(var i = 0, len = set_height_queue.length; i < len; i++)
    set_height_queue[i]();
}

function update_collapsable_subrout(elm) {
  if(elm._collapsable_timeout != null)
    clearTimeout(elm._collapsable_timeout);
  var pre_height = elm.offsetHeight;
  elm.style.height = '';
  var height = elm.offsetHeight;
  return function() {
    elm.style.height = pre_height + 'px';
    if(height != pre_height) {
      elm._collapsable_timeout = setTimeout(function() {
        elm.style.height = height + 'px';
        delete elm._collapsable_timeout;
      }, 10);
    }
  };
}

function collapsable_toggle(toggle_el, toggle) {
  var contains_collapse = toggle_el.classList.contains('x-collapse');
  toggle = toggle == null ? contains_collapse : toggle
  if(toggle_el._collapsable_timeout != null)
    clearTimeout(toggle_el._collapsable_timeout);
  if(toggle && contains_collapse) {
    toggle_el.classList.remove('x-collapse')
    update_collapsable(toggle_el);
  } else if(!toggle && !contains_collapse) {
    toggle_el.style.display = 'none';
    if(toggle_el.parentNode)
      update_collapsable(toggle_el.parentNode);
    toggle_el.style.display = '';
    toggle_el._collapsable_timeout = setTimeout(function() {
      toggle_el.classList.add('x-collapse')
      delete toggle_el._collapsable_timeout;
    }, 10);
  }
}

function tree_traverse_nodes_async (tree, callable) {
  var promise = tree_traverse_nodes_async_subrout(tree, callable, 0);
  return promise ? promise : Promise.resolve();
}

function tree_traverse_nodes_async_subrout (tree, callable, i) {
  while (tree.nodes && i < tree.nodes.length) {
    var node = tree.nodes[i];
    var promise = callable(node, i, tree.nodes);
    if (!promise) {
      promise = tree_traverse_nodes_async_subrout(node, callable, 0); // process sub-nodes
      i++;
      if (promise) {
        return promise.then(function (tmp) {
          return tree_traverse_nodes_async_subrout(tree, callable, i); // continue
        });
      }
    } else {
      return promise.then(function (tmp) {
        i = tmp == null ? i + 1 : tmp;
        if (tmp < 0) { // less than zero means 
          return;
        }
        promise = tree_traverse_nodes_async_subrout(node, callable, 0) // process sub-nodes
        if (promise) {
          return promise.then(function () {
            return tree_traverse_nodes_async_subrout(tree, callable, i); // continue
          });
        } else {      
          return tree_traverse_nodes_async_subrout(tree, callable, i); // continue
        }
      });
    }
  }
}

function _parse_tree_subrout(tree_element, data) {
  // #46 \t to h1-6
  var tabsize = 0;
  data = data.replace(/^([ \t]{1,})(.+)/gm, function(all, indents, text) {
    var tmp = text.trim();
    if(!tmp || tmp[0] == '-') {
      return all;
    }
    var level = 0,
        spaces = 0;
    for (var i = 0; i < indents.length; i++) {
      if (indents[i] == "\t") {
        spaces = 0;
        level++;
      } else if (indents[i] == " ") {
        spaces++;
        if (tabsize > 0 && spaces >= tabsize) {
          spaces = 0;
          level++;
        }
      }
    }
    if (tabsize == 0 && spaces > 0) {
      tabsize = Math.min(spaces, 8);
      level = 1;
    }
    return '    '.repeat(level) + '- ' + tmp;
  });
  // start of line with a letter or number is level0
  data = data.replace(/^\s*[^\#\@\<\-\*\_\ \t\n\r]/gm, function(all) {
    return '- ' + all;
  });
  var html_data = new showdown.Converter().makeHtml(data);
  html_data = sanitizeHtml(html_data, {
    allowedTags:
    sanitizeHtml.defaults.allowedTags.concat([ 'h1', 'h2', 'meta' ]),
    allowedAttributes:
    Object.assign({}, sanitizeHtml.defaults.allowedAttributes, {
      meta: [ 'data-*' ]
    })
  });
  tree_element.innerHTML = html_data;
  var tree = parse_dom_tree(tree_element);
  setup_tree(tree);
  return tree;
  function setup_tree (anode) {
    if (anode.nodes) {
      anode.static_nodes = [].concat(anode.nodes);
      _.each(anode.nodes, setup_tree);
    }
  }
}

function parse_tree(tree_element, data) {
  var tree = _parse_tree_subrout(tree_element, data);
  var content_template,
      tmp = document.querySelector('#tree-node-template');
  if(tmp)
    content_template = _.template(tmp.innerHTML);
  tree_element.innerHTML = ''; // clear all
  tree_mk_list_base(tree, tree_element, content_template); // re-create
  tree_element.tree_height = window.innerHeight;
  return tree;
}

function tree_to_markdown(tree) {
  var md_lines = [];
  _tree_to_markdown_subrout_node(tree, 0, md_lines);
  return md_lines.join("\r\n");
}
function _tree_to_markdown_subrout_meta_html(anode) {
  var tmp_meta = document.createElement('meta')
  var auditory_cue_in_text = anode._more_meta['auditory-cue-in-text'];
  var len = 0;
  for(var key in anode.meta) {
    if(anode.meta.hasOwnProperty(key) &&
       (!auditory_cue_in_text || key != 'auditory-cue')) {
      tmp_meta.setAttribute('data-' + key, anode.meta[key]);
      len++;
    }
  }
  if(len > 0) {
    var tmp2 = document.createElement('div');
    tmp2.appendChild(tmp_meta)
    return tmp2.innerHTML;
  }
  return null;
}
function _tree_to_markdown_subrout_node(node, level, md_lines) {
  var text = level > 0 ?
             (node.text +
              (node._more_meta['auditory-cue-in-text'] ?
               '('+node.meta['auditory-cue']+')' : '')) : null,
      meta_html = _tree_to_markdown_subrout_meta_html(node);
  if(node._more_meta.istmp) {
    // temporary nodes will not be listed for next save
    return;
  }
  var line = (text != null ? '#'.repeat(level) + ' ' + text : '') +
      (meta_html ? ' ' + meta_html : '');
  if(line) {
    md_lines.push(line)
    md_lines.push("") // empty line
  }
  if(!node.is_leaf) {
    _.each(node.nodes, function(anode) {
      _tree_to_markdown_subrout_node(anode, level + 1, md_lines);
    });
  }
}

function unboundPromise () {
  return new Promise(function (onready) {
    var promise, resolve, reject;
    promise = new Promise(function(_resolve, _reject) {
      resolve = _resolve;
      reject = _reject;
      if (promise) {
        onready([promise,resolve,reject]);
      }
    });
    if (promise && resolve) {
      onready([promise,resolve,reject]);
    }
  });
}
