(function(){

  function filename_friendly(s) {
    return s.replace(/[ \(\)\[\]\*\#\@\!\$\%\^\&\+\=\/\\]/g, '_')
      .replace(/[\r\n\t]/g, '');
  }

  function find_unique_filename(dir, basename, ext, extra, try_len) {
    if(try_len == null)
      try_len = 5;
    if(try_len == 0)
      return Promise.reject("Could not find new filename!");
    extra = extra || '';
    var path = dir + '/' + basename + extra + ext;
    return file_exists(path)
      .then(function(exists) {
        if(!exists)
          return path;
        return find_unique_filename(dir, basename, ext, '_'+mkrand(5), try_len-1);
      });
  }
  
  function record_btn_hold(evt) {
    var node = helper._setting_node;
    var record_for = document.getElementById('node-record-for'),
        audio_name = record_for.value,
        audio_meta = audio_meta_by_name(audio_name);
    if(!audio_name || helper._record_promise || helper._record_inprogress)
      return;
    helper._record_promise =
      find_unique_filename(audio_save_dir, filename_friendly(node.text + '_' + audio_name), '.wav')
      .then(function(dest) {
        if(!helper._record_promise) // (ref removed) no longer needed
          return;
        helper._record_start_time = new Date().getTime();
        return helper.audio_record(dest)
          .then(function(b) {
            if(!b)
              return false;
            return [ dest, audio_meta ];
          });
      })
      .catch(function(err) {
        console.error(err);
        alert("Error: " + err.code + ", " + err.message);
      })
      .then(function(v) {
        delete helper._record_promise;
        return v;
      });
  }

  function setting_modal_document_up(evt) {
    // if has pending record to finish
    if(!helper._record_promise)
      return;
    var record_btn = document.getElementById('node-record-btn');
    // check target
    var is_true = false,
        tmp = evt.target;
    while(tmp != null) {
      if(tmp == record_btn) {
        is_true = true;
        break;
      }
      tmp = tmp.parentNode;
    }
    if(is_true) {
      var offset = $(record_btn).offset(),
          x = evt.pageX - offset.left,
          y = evt.pageY - offset.top;
      if(x < 0 || y < 0 ||
         x > $(record_btn).outerWidth() || y > $(record_btn).outerHeight()) {
        is_true = false;
      }
    }
    if(is_true) { // target is record_btn
      record_btn_release();
    } else {
      record_btn_cancel();
    }
  }

  function record_btn_release() {
    var node = helper._setting_node;
    if(!helper._record_promise)
      return; // nothing to save
    var min_time = 500;
    if(new Date().getTime() - helper._record_start_time < min_time) {
      record_btn_cancel();
      return;
    }
    if(helper._record_inprogress)
      return;
    helper._record_inprogress = true;
    helper._record_promise
      .then(function(arg) {
        if(!arg)
          return;
        var dest = arg[0], audio_meta = arg[1],
            prev_src = node.meta[audio_meta.target_meta],
            reverts = node._more_meta.audio_reverts =
              node._more_meta.audio_reverts || {},
            has_revert = !!reverts[audio_meta.target_meta];
        if(!has_revert)
          reverts[audio_meta.target_meta] = prev_src || true;
        (prev_src && has_revert ?
         delete_file(prev_src)
           .catch(function(){console.warn("Could not delete " + prev_src);}) :
         Promise.resolve())
          .then(function() {
            node.meta[audio_meta.target_meta] = dest;
            helper.audio_row_add(audio_meta);
          });
      })
      .then(function() { helper._record_inprogress = false; })
    helper.audio_stop_recording();
  }

  function record_btn_cancel() {
    if(!helper._record_promise)
      return; // nothing to save
    if(helper._record_inprogress)
      return;
    helper._record_inprogress = true;
    helper._record_promise
      .then(function(arg) {
        if(!arg)
          return;
        var dest = arg[0], audio_meta = arg[1];
        return delete_file(dest)
          .catch(function(){console.warn("Could not delete " + prev_src);})
      })
      .then(function() { helper._record_inprogress = false; })
    helper.audio_stop_recording();
  }

  function audio_tbody_click(evt) {
    var node = helper._setting_node;
    var tmp = evt.target, btn, row_elm;
    while(tmp) {
      if(tmp.nodeName == 'BUTTON') {
        btn = tmp;
      } else if(tmp.hasAttribute('data-name')) {
        row_elm = tmp;
        break;
      }
      tmp = tmp.parentNode;
    }
    if(!btn || !row_elm)
      return;
    if(btn.classList.contains('remove-btn')) {
      helper.audio_remove(node, row_elm.getAttribute('data-name'))
    } else if(btn.classList.contains('play-btn')) {
      helper.audio_play(node, row_elm.getAttribute('data-name'))
    } else if(btn.classList.contains('stop-btn')) {
      helper.audio_stop()
    }
  }
  
  var helper = {};

  helper.on_save = function(tree) {
    var promises = [];
    
    var audio_reverts = tree._more_meta.audio_reverts;
    if(audio_reverts) {
      for(var name in audio_reverts) {
        if(audio_reverts[name] !== true) // true is for first record
          promises.push(delete_file(audio_reverts[name]));
      }
      delete tree._more_meta.audio_reverts;
    }

    if(tree.nodes) {
      for(var i = 0, len = tree.nodes.length; i < len; i++)
        promises.push(helper.on_save(tree.nodes[i]));
    }
    return Promise.all(promises);
  }

  helper.on_restore = function(tree) {
    var promises = [];
    
    var audio_reverts = tree._more_meta.audio_reverts;
    if(audio_reverts) {
      for(var name in audio_reverts) {
        if(tree.meta[name])
          promises.push(delete_file(tree.meta[name]));
        if(audio_reverts[name] !== true) // true is for first record
          tree.meta[name] = audio_reverts[name];
      }
      delete tree._more_meta.audio_reverts;
    }

    if(tree.nodes) {
      for(var i = 0, len = tree.nodes.length; i < len; i++)
        promises.push(helper.on_restore(tree.nodes[i]));
    }
    return Promise.all(promises);
  }
  
  helper.node_setting_modal_unbind = function() {
    helper.audio_stop()
    var listeners = helper.__node_setting_modal_listeners;
    _.each(listeners, function(listener) {
      listener[0].removeEventListener.apply(listener[0], listener.slice(1));
    });
  }
  
  helper.node_setting_modal_bind = function(node) {
    helper.node_setting_modal_unbind()
    helper.audio_table_init(node)
    helper._setting_node = node;
    var listeners = helper.__node_setting_modal_listeners = [];
    var record_btn = document.getElementById('node-record-btn'),
        audio_tbody = document.getElementById('node-audio-tbody');
    listeners.push([ record_btn, 'mousedown', record_btn_hold, false ]);
    listeners.push([ record_btn, 'touchstart', record_btn_hold, false ]);
    listeners.push([ document, 'mouseup', setting_modal_document_up, false ]);
    listeners.push([ document, 'touchend', setting_modal_document_up, false ]);
    listeners.push([ audio_tbody, 'click', audio_tbody_click, false ])

    // listen
    _.each(listeners, function(listener) {
      listener[0].addEventListener.apply(listener[0], listener.slice(1));
    });
  }
  
  helper.audio_meta_list = [
    {
      title: 'Both',
      name: 'both',
      suffix: '',
      target_meta: 'audio'
    },
    {
      title: 'main',
      name: 'main',
      suffix: 'main',
      target_meta: 'main-audio'
    },
    {
      title: 'cue',
      name: 'cue',
      suffix: 'cue',
      target_meta: 'cue-audio'
    },
  ];

  helper.audio_row_add = function(audio_meta) {
    helper.audio_row_remove(audio_meta.name);
    var template = document.getElementById('node-audio-td-template');
    template.__template = template.__template || _.template(template.innerHTML)
    var tmp = document.createElement('tbody');
    tmp.innerHTML = template.__template({ audio_meta: audio_meta });
    for(var i = 0, len = tmp.childNodes.length; i < len; i++) {
      if(tmp.childNodes[i] && tmp.childNodes[i].nodeName == 'TR') {
        var tbody = document.getElementById('node-audio-tbody');
        tbody.appendChild(tmp.childNodes[i]);
        break;
      }
    }
  }

  helper.audio_row_remove = function(name) {
    var tbody = document.getElementById('node-audio-tbody'),
        elm = tbody.querySelector(':scope > [data-name="'+name+'"]');
    if(elm)
      tbody.removeChild(elm);
  }

  helper.audio_table_init = function(node) {
    for(var i = 0, len = helper.audio_meta_list.length; i < len; ++i) {
      var audio_meta = helper.audio_meta_list[i];
      if(node.meta[audio_meta.target_meta]) {
        helper.audio_row_add(audio_meta);
      }
    }
  }

  function audio_meta_by_name(audio_name) {
    var v = _.find(helper.audio_meta_list, function(a) {
      return a.name == audio_name;
    });
    if(!v) {
      throw new Error("Could not find audio_meta for, " + audio_name);
    }
    return v;
  }
  
  helper.audio_remove = function(node, audio_name) {
    var audio_meta = audio_meta_by_name(audio_name),
        src = node.meta[audio_meta.target_meta],
        reverts = node._more_meta.audio_reverts =
          node._more_meta.audio_reverts || {},
        has_revert = !!reverts[audio_meta.target_meta];
    if(!has_revert && src)
      reverts[audio_meta.target_meta] = src;
    return (src && has_revert ?
       delete_file(src)
         .catch(function(){console.warn("Could not delete " + prev_src);}) :
       Promise.resolve())
        .then(function() {
           helper.audio_row_remove(audio_name);
           delete node.meta[audio_meta.target_meta];
        })
        .catch(function(err) {
          console.error(err);
          alert(err+'');
        });
  }

  var mkrand_chars = "abcdefghijklmnopqrstuvwxyz01234567890";
  function mkrand(n) {
    var v = "";
    while(n > 0) {
      v += mkrand_chars[Math.floor(Math.random() * mkrand_chars.length)];
      n--;
    }
    return v;
  }

  function toggle_audio_btn(name, b) {
    var tbody = document.getElementById('node-audio-tbody'),
        pel = tbody.querySelector(':scope > [data-name="'+name+'"] .play-btn'),
        sel = tbody.querySelector(':scope > [data-name="'+name+'"] .stop-btn');
    pel.classList[b ? 'add' : 'remove']('hide')
    sel.classList[!b ? 'add' : 'remove']('hide')
  }

  helper.audio_stop_recording = function() {
    if(helper._audio_record_media) {
      helper._audio_record_media.stopRecord();
      helper._audio_record_media.release();
    } else {
      helper._audio_record_media_stopped = true;
    }
  }
  
  helper.audio_record = function(dest) {
    return SpeakUnit.getInstance()
      .then(function(speaku) {
        return speaku.api.request_audio_record_permission();
      })
      .then(function(granted) {
        if(!granted) {
          throw new Error("Permission not granted");
        }
        return write_file(dest, "");
      })
      .then(function() {
        if(helper._audio_record_media_stopped) {
          delete helper._audio_record_media_stopped;
          return false;
        }
        return new Promise(function(resolve, reject) {
          if(helper._audio_record_media_stopped) {
            delete helper._audio_record_media_stopped;
            return resolve(false);
          }
          var wrap = document.querySelector('.node-record-btn-wrap'),
              amp_circle = wrap.querySelector('.record-amp-circle'),
              circle_max_radius = 120;
          function set_circle_radius(radius) {
            if(amp_circle) {
              amp_circle.style.width = (radius * 2) + 'px';
              amp_circle.style.height = (radius * 2) + 'px';
              amp_circle.style.borderRadius = radius + 'px';
            }
          }
          set_circle_radius(0);
          wrap.classList.add('recording');
          // Audio player
          //
          var media = helper._audio_record_media =
              new Media(dest, 
                        // success callback
                        function() {
                          delete helper._audio_record_media;
                          wrap.classList.remove('recording')
                          clearInterval(mediaTimer);
                          resolve(true);
                        },
                        // error callback
                        function(err) {
                          delete helper._audio_record_media;
                          wrap.classList.remove('recording')
                          clearInterval(mediaTimer);
                          reject(err);
                        }
                       );
          var mediaTimer = setInterval(function () {
            // get media amplitude
            media.getCurrentAmplitude(
              // success callback
              function (amp) {
                set_circle_radius(amp * circle_max_radius);
              },
              // error callback
              function (e) {
                console.log("Error getting amp", e);
                clearInterval(mediaTimer);
              }
            );
          }, 100);

          // Record audio
          media.startRecord();
        });
      });
  }
  
  helper._audio_stop = function(speaku) {
    var self = this;
    if(self._playing_audio_name)
      toggle_audio_btn(self._playing_audio_name, false);
    return speaku.stop_audio();
  }

  helper.audio_stop = function() {
    var self = this;
    return SpeakUnit.getInstance()
      .then(function(speaku) {
        return self._audio_stop(speaku);
      });
  }
  
  helper.audio_play = function(node, audio_name) {
    var audio_meta = audio_meta_by_name(audio_name);
    var src = node.meta[audio_meta.target_meta];
    var self = this;
    if(!src)
      return Promise.reject(new Error("Audio source not found!"))
    return SpeakUnit.getInstance()
      .then(function(speaku) {
        return self._audio_stop(speaku)
          .then(function() {
            toggle_audio_btn(audio_name, true);
            self._playing_audio_name = audio_name;
            return speaku.play_audio(src);
          });
      })
      .catch(function(err) {
        console.error(err);
        alert(err+'');
      })
      .then(function() {
        toggle_audio_btn(audio_name, false);
        delete self._playing_audio_name;
      });
  }
  
  window.editor_helper = helper;
})();
