
// Cordova specific
document.addEventListener('deviceready', function() { 
  if(window.device) {
    document.querySelector('html').classList
      .add(window.device.platform.toLowerCase());
  }
}, false);

window.newEl = document.createElement.bind(document);
window.default_config = 'config.json';
window.default_tree = 'tree.md';
window.audio_save_dir = 'cdvfile://localhost/persistent/audio';

function initialize_app() {
  var replaceFileKeys = ['default_config', 'default_tree'];
  // for cordova
  if(window.cordova) {
    var promises = [];
    _.each(replaceFileKeys, function(key) {
      var path = window[key],
          newpath = 'cdvfile://localhost/persistent/' + window[key];
      promises.push(
        new Promise(function(resolve, reject) {
          window.resolveLocalFileSystemURL(newpath, resolve, continue_proc);
          function continue_proc(err) {
            // if not found
            read_file(path)
              .then(function(data) {
                return write_file(newpath, data)
              })
              .then(resolve, reject);
          }
        })
          .then(function() {
            window[key] = newpath;
          })
      );
    });
    promises.push(cordova_mkdir(audio_save_dir))
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
  }
}

function tree_mk_list_base(tree, el) {
  el.target_node = tree
  tree.dom_element = el;
  el.classList.add('level-' + tree.level);
  el.classList.add('node')
  if(tree.text) {
    var cel = newEl('div');
    cel.classList.add('content');
    el.appendChild(cel);
    tree.content_element = cel;
    var txtel = newEl('p');
    txtel.classList.add('text');
    txtel.textContent = tree.text;
    cel.appendChild(txtel);
    tree.txt_dom_element = txtel;
  }
  if(!tree.is_leaf) {
    var nodes = tree.nodes,
        ul = newEl('ul');
    ul.classList.add('children');
    for(var i = 0, len = nodes.length; i < len; ++i) {
      var node = nodes[i],
          li = newEl('li');
      tree_mk_list_base(node, li);
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
          var txt_dom_el = is_list ? cnode.querySelector(":scope > p") : cnode;
          if(!txt_dom_el)
            txt_dom_el = cnode;
          var td = parse_dom_tree_subrout_parse_text(txt_dom_el.textContent);
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
      } if(cnode.nodeName == 'META') {
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

function handle_error_checkpoint() {
  var stack = new Error().stack;
  return function(err) {
    if(err.withcheckpoint)
      throw err;
    throw {
      withcheckpoint: true,
      checkpoint_stack: stack.split("\n").slice(2).join("\n"),
      error: err
    };
  }
}

function handle_error(err) {
  if(err.withcheckpoint) {
    console.error("checkpoint:", err.checkpoint_stack);
    alert(err.error+'');
    console.error(err.error)
    throw err.error;
  } else {
    alert(err);
    console.error(err);
    throw err;
  }
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
              console.error(err);
              reject("Fail to write `" + url + "` -- " + err.message)
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

function read_file(url, options) {
  return new Promise(function(resolve, reject) {
    options = options || {};
    if(!/^(https?):\/\//.test(url) && window.cordova &&
       window.resolveLocalFileSystemURL) {
      url = _cordova_fix_url(url)
      function onSuccess(fileEntry) {
        fileEntry.file(function(file) {
          var reader = new FileReader();

          reader.onloadend = function(e) {
            resolve(this.result)
          }

          reader.readAsText(file);
        });

      }
      function onFail(err) {
        console.error(err);
        reject("Fail to load `" + url + "` -- " + err.code)
      }
      window.resolveLocalFileSystemURL(url, onSuccess, onFail);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open(options.method || 'GET', url);
      xhr.onreadystatechange = function() {
        if(xhr.readyState === XMLHttpRequest.DONE) {
          if(xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText)
          } else {
            var err = new Error(xhr.statusText || 'unknown status ' + xhr.status + ' for `' + url + '`');
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


function SpeakUnit() {
  this._alt_finish_queue = [];
}

SpeakUnit.getInstance = function() {
  if(SpeakUnit._instancePromise) {
    return Promise.resolve(SpeakUnit._instancePromise);
  } else {
    var speaku = new SpeakUnit();
    return speaku.init()
  }
}
var proto = SpeakUnit.prototype;

proto.init = function() {
  var api = new NativeAccessApi();
  var self = this;
  return Promise.all([
    api.has_synthesizer(),
    api.has_audio_device()
  ])
    .then(function(results) {
      if(results[0] && results[1]) {
        self.is_native = true
        self.api = api
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
              if(responsiveVoice.voiceSupport()) {
                resolve(self);
              } else {
                reject("No supported speaker found!");
              }
            } catch(err) {
              reject(err);
            }
          };
          script.onerror = function() {
            reject("Could not load responsivevoice code");
          };
          script.src = "//code.responsivevoice.org/responsivevoice.js";
          document.body.appendChild(script);
        });
      }
    });
}

proto.simple_speak = function(speech, opts) {
  return speaku.start_speaking(speech, opts)
    .then(function(hdl) {
      return speaku.speak_finish(hdl)
        .then(function() {
          return speaku.utterance_release(hdl);
        });
    });
}

proto.start_speaking = function(speech, opts) {
  if(this._audio_tag) {
    // prevent multiple audio running at same time
    this.stop_audio()
  }
  opts = Object.assign({}, opts)
  var self = this;
  if(self.is_native) {
    for(var key in opts)
      if(key.indexOf('alt_') == 0)
        delete opts[key];
    return self.api.init_utterance(speech, opts)
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
  if(this._audio_tag) {
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
    media.play();
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
    if(opts.volume)
      audio.setAttribute('volume', opts.volume+'');
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
