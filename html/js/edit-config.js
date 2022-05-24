var config_fn, ptree_info, trees_info_fn;
var speaku, config, config_data, trees_info, tree_data,
    all_voices, napi, is_quick_setup, locale;
// start
Promise.all([
  window.cordova ? NativeAccessApi.onready() : Promise.resolve(),
  new Promise(function(resolve) { // domready
    document.addEventListener('DOMContentLoaded', function() {
      document.removeEventListener('DOMContentLoaded', arguments.callee, false);
      resolve();
    }, false);
  })
])
  .then(bind_dom_event_handlers)
  .then(initialize_app)
  .catch(handle_error_checkpoint())
  .then(function() {
    trees_info_fn = default_trees_info_fn;
    config_fn = default_config;
    napi = new NativeAccessApi();
    speaku = new SpeakUnit(napi);
    return speaku.init()
      .then(function() {
        return speaku.get_voices().then(function(v) { all_voices = v })
      });
  })
  // prepare zip
  .then(function() {
    if (window.cordova) {
      zip.workerScriptsPath = null;
      return Promise.all(_.map([ 'z-worker.js', 'deflate.js', 'inflate.js' ], function (fn) {
        return new Promise(function(resolve, reject) {
          var fndir = 'cdvfile://localhost/bundle/www/js/lib/zipjs/';
          window.resolveLocalFileSystemURL(fndir + fn, function (entry) {
            entry.file(function (file) {
              var reader = new FileReader();
              reader.onloadend = function() {
                var blob = new Blob([this.result], { type: 'application/javascript' });
                resolve(URL.createObjectURL(blob));
              };
              reader.readAsText(file);
            }, reject);
          }, reject);
        });
      }));
    } else {
      return null;
    }
  })
  .then(function(zipBlobs) {
    if (zipBlobs) {
      zip.workerScripts = {
        deflater: [ zipBlobs[0], zipBlobs[1] ],
        inflater: [ zipBlobs[0], zipBlobs[2] ],
      };
    }
  })
  // load
  .then(function() {
    return get_file_json(config_fn)
      .then(function(_config) {
        config = _config;
        config_data = JSON.stringify(config);
        _fix_config(config);
      });
  })
  .then(function() {
    return prepare_tree(config.tree ? get_file_url(config.tree, config_fn) : window.default_tree)
        .catch(handle_error_checkpoint())
        .then(function(info) {
          ptree_info = info;
          return get_file_json(trees_info_fn)
            .then(function (_trees_info) { trees_info = _trees_info; })
            .catch(function (error) {
              console.warn("Could not load trees_info file, " + trees_info_fn, error);
              trees_info = { list: [
                {
                  name: 'default',
                  tree_fn: info.tree_fn,
                }
              ] };
              // save it 
              return _save_trees_info(trees_info)
                .then(function () { return update_pasco_data_state() })
            });
        });
  })
  .then(function() {
    locale = config.locale||default_locale;
    return Promise.all([
      initl10n(locale)
        .then(function() {
          domlocalize();
        })
        .catch(function(err) {
          console.warn(err);
        }),
      get_file_data(get_file_url(ptree_info.tree_fn, trees_info_fn))
        .then(function(_data) { tree_data = _data; })
        .catch(function(err) {          
          if (!(err.caused_by && err.caused_by.code == 1 ||
                err instanceof NodeLib.common.NotFoundError)) { // is not (not found)
            throw err;
          }
          tree_data = '';
        })
    ]);
  })
  .then(function() {
    document.body.classList.remove('notready');
  })
  .then(start)
  .catch(handle_error);

function _fix_config(cfg) {
  if (cfg.minimum_cue_time == null) {
    cfg.minimum_cue_time = 0;
  }
  if(!cfg.auditory_cue_first_run_voice_options &&
     !cfg._auditory_cue_first_run_voice_options) {
    cfg._auditory_cue_first_run_voice_options =  {
      "volume": 1.0,
      "rate": "default",
      "rateMul": 1.5,
      "pitch": 1.0
    };
  }
  // by default add all choices for each voice option
  _.each(_voice_id_links, function (link) {
    var name = link[0],
        voice_options = cfg[name];
    if (voice_options && !voice_options.locale_voices) {
      voice_options.locale_voices = _.filter(
        _.map(all_locale_info, function (linfo) {
          var opts = _vbl_voice_tmpl_options(linfo.locale);
          if (opts.length > 0) {
            var vidname = (speaku.is_native ? '' : 'alt_') + 'voiceId';
            var ret = { locale: linfo.locale };
            ret[vidname] = opts[0].value;
            return ret;
          }
        }),
        function (a) { return !!a; }
      );
    }
  });
  if (!cfg.keys) {
    cfg.keys = cfg.switch_keys || cfg.auto_keys || {};
    for (var key in cfg.keys) {
      if (cfg.keys.hasOwnProperty(key)) {
        var ckey = cfg.keys[key];
        if (ckey.comment) {
          ckey.label = ckey.comment;
          delete ckey.comment;
        }
      }
    }
    cfg.keys["66"] = { "func": "tree_go_in", "label": "b" };
  }
  if (!cfg.helper_back_option) {
    if (cfg.back_at_end) {
      cfg.helper_back_option = "end";
    } else {
      cfg.helper_back_option = "";
    }
  }
  delete cfg.back_at_end;
}

function bind_dom_event_handlers () {
  $('#ios-open-route-view').click(function ($evt) {
    $evt.preventDefault();
    if (speaku.is_native) {
      speaku.api.ios_open_manage_output_audio_view()
    }
  });
  $('.vbl-btn').on('click', vbl_btn_onclick);
  function vbl_btn_onclick ($evt) {
    var vbl_link_id = $($evt.target).data('vbl');
    var link = _.filter(_voice_id_links, function (a) { return a[0] == vbl_link_id; })[0];
    if (!link) {
      console.warn("no link found!");
      return;
    }
    var voice_options = config[vbl_link_id];
    var label = _t(link[3]);
    var data = {
      voices: voice_options.locale_voices || [],
    };
    voice_by_locale_init('voice-by-locale', label, data, onchange);
    function onchange (data) {
      voice_options.locale_voices = data.voices;
      set_needs_save_config()
    }
  }
  $('#tree-export-obz-btn').click(function ($evt) {
    $evt.preventDefault();
    waitingDialog.show();
    NodeLib.obfutil.pasco_export_obf(ptree_info.tree_fn, { row_len: 5 })
      .then(function (zipblob) {
        showsavemodal('tree.obz', zipblob);
      })
      .catch(function (err) {
        update_alert(false, err);
      })
      .then(function () {
        waitingDialog.hide();
      });
  });
  $('#tree-import-obz-inp').on('change', function ($evt) {
    if(this.files && this.files.length > 0) {
      var file = this.files[0];
      waitingDialog.show();
      NodeLib.obfutil.pasco_import_obz(file, ptree_info.tree_fn)
        .then(function (tree_fn) {
          return change_tree(tree_fn);
        })
        .catch(function (err) {
          update_alert(false, err);
        })
        .then(function () {
          waitingDialog.hide();
        });
    }
  });
  bind_configure_actions();
}

function init_range_sliders_on_page ($page) {
  $page.find('input[type="range"]').each(function () {
    this.__rangeslider = NodeLib.uicommon.init_range_slider(this);
  });
}

function destroy_range_sliders_on_page ($page) {
  $page.find('input[type="range"]').each(function () {
    if (this.__rangeslider) {
      this.__rangeslider.destroy();
      delete this.__rangeslider;
    }
  });
}

function on_show_page ($page) {
  init_range_sliders_on_page($page)
}

function on_hide_page ($page) {
  destroy_range_sliders_on_page($page)
}

function submenu_set_active (name) {
  var isactive = $('.x-navbar .head .page-head[data-name="'+name+'"]').hasClass('active');
  if (isactive) {
    return;
  }
  var promises = [];
  $('.edit-config-container .page-sect').each(function () {
    var $this = $(this);
    if ($this.hasClass('active') && name != $this.data('name')) {
      promises.push(
        (new Promise(function (resolve) { $this.fadeOut(300, resolve); }))
          .then(function () {
            on_hide_page($this)
          })
      );
    }
  });
  Promise.all(promises)
    .then(function () {
      if (!name) {
        $('.x-navbar .head .main-head').show();
        $('.x-navbar .back-btn').hide();
        $('.edit-config-container .submenu').removeClass('has-active');
      } else {
        $('.x-navbar .head .main-head').hide();
        $('.x-navbar .back-btn').show();
        $('.edit-config-container .submenu').addClass('has-active');
      }
      $('.x-navbar .head .page-head').each(function () {
        var $this = $(this);
        $this.toggleClass('active', name == $this.data('name'));
      });
      $('.edit-config-container .submenu a').each(function () {
        var $this = $(this);
        $this.toggleClass('active', name == $this.data('name'));
      });
      $('.edit-config-container .page-sect').each(function () {
        var $this = $(this);
        $this.toggleClass('active', name == $this.data('name'));
        if (name == $this.data('name')) {
          $this.show().css('opacity', '0')
          on_show_page($this)
          $this.find('.x-collapsable').each(function () {
            update_collapsable(this);
          });
          $this.css('opacity', '').hide().fadeIn(300);
        }
      });
    })
    .then(function () {
      var options = {
        updateHistory: false,
        sections: "h3 > .scrollnav-anchor",
      };
      if (scrollnav.initialized) {
        scrollnav.destroy();
        scrollnav.initialized = false;
      }
      var $include_scrollnav = $('.edit-config-container .page-sect.active .include-scrollnav');
      if ($include_scrollnav.length > 0) {
        document.body.classList.add('has-nav-scroll');
        scrollnav.init($include_scrollnav[0], options);
        scrollnav.initialized = true;
      } else {
        document.body.classList.remove('has-nav-scroll');
      }
      setTimeout(function () {
        if (scrollnav.initialized) {
          scrollnav.updatePositions();
        }
      }, 500);
    });
}

function submenu_init () {
  $('.edit-config-container .submenu a').on('click', function ($evt) {
    $evt.preventDefault();
    var $this = $(this);
    var name = $this.data('name');
    history.replaceState({}, name, '#!' + name);
    submenu_set_active(name);
  });
  $('.back-btn').on('click', function ($evt) {
    $evt.preventDefault();
    history.replaceState({}, name, location.pathname);
    submenu_set_active("");
  });
  window.addEventListener('popstate', updatestate);
  setTimeout(updatestate, 1000);
  document.addEventListener('x-collapsable-move-end', function () {
    if (scrollnav.initialized) {
      scrollnav.updatePositions();
    }
  }, false);
  function updatestate () {
    if (location.hash.indexOf("#!") == 0) {
      submenu_set_active(location.hash.substr(2));
    } else {
      submenu_set_active("");
    }
  }
}

function start() {
  is_quick_setup = $('form[name=quick-setup]').length > 0;
  if (!is_quick_setup) {
    submenu_init();
  }
  _start_subrout_tree_selection();
  // insert voice options
  var $form = $(is_quick_setup ? 'form[name=quick-setup]' : 'form[name=edit-config]').first(),
      voices_by_id = _.object(_.map(all_voices, function(voice) { return [voice.id,voice] }));
  _.each(_voice_id_links, function(alink) {
    var $inp = $form.find('[name='+alink[1]+']');
    if($inp.length == 0)
      return; // does not exists, skip
    var $pbwrp = $(alink[2]),
        text = "Quiet people have the loudest minds. Pasco at your service.",
        opts = {};
    /* voice playback */
    $pbwrp.find('.play-btn').click(function() {
      $pbwrp.find('.play-btn').addClass('hide');
      $pbwrp.find('.stop-btn').removeClass('hide');
      var $inp = $form.find('[name='+alink[1]+']');
      if($inp.length > 0 && $inp.val())
        opts.voiceId = $inp.val();
      $inp = $form.find('[name="'+alink[0]+'.volume"]');
      if($inp.length > 0 && parseFloat($inp.val()) >= 0)
        opts.volume = parseFloat($inp.val());
      opts.rate = "default";
      $inp = $form.find('[name="'+alink[0]+'.rateMul"]');
      if($inp.length > 0 && parseFloat($inp.val()) > 0)
        opts.rateMul = parseFloat($inp.val());
      $inp = $form.find('[name="'+alink[0]+'.pitch"]');
      if($inp.length > 0 && !isNaN(parseFloat($inp.val())))
        opts.pitch = parseFloat($inp.val())
      $inp = $form.find('[name="'+alink[0]+'.delay"]');
      if($inp.length > 0  && parseFloat($inp.val()) >= 0)
        opts.delay = parseFloat($inp.val());
      $inp = $form.find('[name="'+alink[0]+'.override_to_speaker"]');
      if($inp.length > 0)
        opts.override_to_speaker = !!$inp[0].checked;
      speaku.simple_speak(text, opts)
        .then(function(){
          $pbwrp.find('.play-btn').removeClass('hide');
          $pbwrp.find('.stop-btn').addClass('hide');
        });
    });
    $pbwrp.find('.stop-btn').click(function() {
      $pbwrp.find('.play-btn').removeClass('hide');
      $pbwrp.find('.stop-btn').addClass('hide');
      speaku.stop_speaking();
    });
    /* voice list */
    var voices_by_locale = _.object(_.map(_.pairs(window.locales_info||{}), function (a) { return [ a[0], Object.assign({ opts: [] }, a[1]) ] }));
    var unlabled_voices = [ { label: 'Default', id: '' } ];
    _.each(all_voices, function(voice) {
      var locale = voice.locale.toLowerCase();
      var vbl = null;
      if (locale in voices_by_locale) {
        vbl = voices_by_locale[locale];
      } else if (locale.split('-')[0] in voices_by_locale) {
        vbl = voices_by_locale[locale.split('-')[0]];
      } else if (!!locale) {
        vbl = voices_by_locale[locale] =
            (voices_by_locale[locale] ?
             voices_by_locale[locale] : { opts: [], mr: locale, Marathi: locale });
      }
      if (vbl) {
        vbl.opts.push(voice);
      } else {
        unlabled_voices.push(voice);
      }
    });
    var optgroups = _.filter(_.values(voices_by_locale), function (a) { return a.opts.length > 0 })
        .sort(function (a, b) {
          if (a.Marathi < b.Marathi) {
            return -1;
          }
          if (a.Marathi > b.Marathi) {
            return 1;
          }
          return 0;
        });
    var grp = newEl('optgroup');
    grp.setAttribute('label', '');
    _.each(unlabled_voices, function (voice) {
      var opt = newEl('option');
      opt.value = voice.id;
      opt.textContent = voice.label;
      grp.appendChild(opt);
    });
    $inp.append(grp);
    _.each(optgroups, function (optgroup) {
      var grp = newEl('optgroup');
      grp.setAttribute('label', optgroup.Marathi);
      _.each(optgroup.opts, function (voice) {
        var opt = newEl('option');
        opt.value = voice.id;
        opt.textContent = voice.label;
        grp.appendChild(opt);
      });
      $inp.append(grp);
    });
  });
  $('#locale-select').on('change', function() {
    var locale = this.value||default_locale;
    initl10n(locale)
      .then(function() {
        domlocalize();
        config.locale = locale;
      })
      .catch(function(err) {
        console.warn(err);
      });
  });

  let dpsync_wrp = document.querySelector('#dropbox-sync-wrp')
  if (dpsync_wrp) { // init DropboxSyncConfigUI
    let tokenstorage = new NodeLib.common.LocalStorageTokens()
    let tokenhandler = new NodeLib.common.TokenHandler(tokenstorage, 'dropbox')
    let dpsync = new NodeLib.DropboxSync(tokenhandler)
    let dpsync_ui = new NodeLib.DropboxSyncConfigUI(dpsync, dpsync_wrp)
    dpsync_ui.setState({ 
      pasco_data_state: window.pasco_data_state,
      config_fn: config_fn,
      trees_info_fn: trees_info_fn,
    })
    dpsync_ui.init()
  }

  insert_config()

  update_tree_default_select();
  $('#tree-default-select').on('change', update_tree_default_select);

  // helper_back_option
  _.each([
    {
      text_inp: '#helper_back_option_main_text',
      record_section: '#helper_back_option_main_record',
      audio_dest: 'back-main.wav',
    },
    {
      text_inp: '#helper_back_option_cue_text',
      record_section: '#helper_back_option_cue_record',
      audio_dest: 'back-cue.wav',
    },
  ], function (info) {
    var record_section = document.querySelector(info.record_section)
    if (!record_section) {
      return
    }
    if (!window.pasco_data_state) {
      // record_section is not supported in the legacy version
      record_section.classList.add('hidden')
      return
    }
    _init_custom_node({
      text_inp: document.querySelector(info.text_inp),
      record_section: record_section,
      audio_dest: info.audio_dest,
      audio_dest_url: get_file_url(info.audio_dest, config_fn),
    })
  })

  if(!is_quick_setup) {
    set_tree_data(tree_data);

    $('#tree-revert').on('click', function() {
      set_tree_data(tree_data);
    });
    
    config_auto_save_init();
    $form.on('submit', () => {
      if(evt)
        evt.preventDefault();
      do_save_config({ handle_errors: true })
    })
    $('form[name=edit-tree]').on('submit', save_tree)
  } else {
    init_range_sliders_on_page($form)
    $form.on('submit', save_quick_setup)
  }

  $('#tree-export-btn').on('click', function($evt) {
    $evt.preventDefault();
    var btn = this;
    if(btn._working)
      return;
    btn._working = true;
    waitingDialog.show();
	  zip.createWriter(new zip.BlobWriter(), function(zipWriter) {
      var elm = newEl('div'), tree,
          parts = ptree_info.tree_fn.split('/'),
          basename = parts[parts.length - 1];
      Promise.resolve()
        .then(function() {
          tree = parse_tree(elm, tree_data);
          var export_list = [],
              actions = [];
          tree_export_prepare(ptree_info, tree, export_list)
          _.each(export_list, function(item) {
            actions.push(function() {
              return get_file_data(get_file_url(item.val, ptree_info.tree_fn), { responseType: 'blob' })
                .then(function(blob) {
                  return new Promise(function(resolve, reject) {
                    zipWriter.add(item.newval, new zip.BlobReader(blob), resolve);
                  });
                })
                .catch(function(err) {
                  item.tree.meta[tree.meta_name] = item.val;
                  console.warn("Could not load for export " + item.val, err);
                  onend(false);
                });
            });
          });
          return serial_promise(actions);
        })
        .then(function () {
          return new Promise(function(resolve, reject) {
            // save modified tree
            var tree_md = tree_to_markdown(tree);
            zipWriter.add(basename, new zip.BlobReader(new Blob([tree_md], {type:'text/markdown'})), resolve);
          });
        })
        .catch(function(err) {
          console.error(err);
          onend(false);
          update_alert(false, new Error("An error occurred during creating zip file"));
          return false;
        })
        .then(function(res) {
          if(res !== false) {
            return onend(true);
          }
        });
      function onend(success) {
        return new Promise(function(resolve) {
				  zipWriter.close(function(blob) {
            if(success) {
              showsavemodal('tree.zip', blob);
            }
            waitingDialog.hide();
            btn._working = false;
            resolve();
          });
        });
      }
    }, function(err) {
      waitingDialog.hide();
      console.error(update);
      alert_err(false, new Error("Could not create zip writer"));
    });
  });
  $('#save-file--share-btn').on('click', function($evt) {
    $evt.preventDefault();
    var $modal = $('#save-file-modal');
    if($modal.length == 0)
      return; // should never happen
    var nfilepath = $modal[0]._nfilepath;
    (new Promise(function(resolve, reject) {
      try {
        var options = {
          //message: 'tree.zip, pasco tree package',
          files: [nfilepath],
          chooserTitle: 'Share/Save the package'
        };
        var onSuccess = function(result) {
          resolve();
        }
        var onError = function(msg) {
          reject(new Error("Sharing failed, " + msg));
        }
        window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError);
      } catch(err) {
        reject(err);
      }
    }))
      .catch(function(err) {
        console.error(err);
        update_alert(false, err);
      });
  });
  $('#tree-import-inp').on('change', function() {
    if(this.files && this.files.length > 0) {
      var file = this.files[0];
      if(file.type.indexOf('text/') == 0) {
        var reader = new FileReader();
        reader.onload = function(e) {
          tree_data = e.target.result
          $('form[name=edit-tree] [name=tree-input]').val(tree_data)
        }
        reader.readAsText(file);
      } else {
        waitingDialog.show();
        return new Promise(function (resolve, reject) {
	        zip.createReader(new zip.BlobReader(file), function(zipReader) {
            var onrootreject = [];
            function _root_reject (err) {
              onend();
              reject(err);
              _.each(onrootreject, function() { onrootreject() });
            }
		        zipReader.getEntries(function(entries) {
              var mdfiles = _.filter(entries, function (entry) {
                return entry.filename.indexOf('.md') != -1;
              });
              var filesmap = _.object(_.map(entries, function (entry) {
                return [ entry.filename, entry ];
              }));
              if(mdfiles.length == 0) {
                _root_reject({ __msg: "No tree found in zip file" });
              } else {
                var tree_md_file = mdfiles[0],
                    tree_md_dir = window.path.dirname(tree_md_file.filename);
			          tree_md_file.getData(new zip.BlobWriter('text/markdown'), function(blob) {
                  var reader = new FileReader();
                  reader.onload = function(e) {
                    var elm = newEl('div'), tree_obj;
                    Promise.resolve()
                    .then(function() {
                      tree_obj = parse_tree(elm, reader.result);
                      var import_list = [],
                          actions = [];
                      tree_import_prepare(ptree_info, tree_obj, import_list);
                      _.each(import_list, function(item) {
                        actions.push(function() {
                          var tmp = item.val;
                          if (tmp.indexOf("://") == -1) {
                            tmp = window.path.resolve("/" + tree_md_dir, tmp);
                            if (tmp[0] == "/") {
                              tmp = tmp.substr(1);
                            }
                          }
                          var entry = filesmap[tmp];
                          if(entry) {
                            return new Promise(function(resolve, reject) {
                              entry.getData(new zip.BlobWriter('application/octet-stream'), function(blob) {
                                var idx = onrootreject.indexOf(rootdidreject);
                                if (idx != -1) {
                                  onrootreject.splice(idx, 1);
                                }
                                // options = { _datatype: item.datatype } # Obsolete
                                set_file_data(get_file_url(item.newval, ptree_info.tree_fn), blob)
                                  .catch(handle_error_checkpoint())
                                  .then(resolve, reject);
			                        });
                              onrootreject.push(rootdidreject);
                              function rootdidreject() {
                                // prevent un-resolved promise
                                reject({ __ignore_error: true });
                              }
                            })
                          } else {
                            // revert
                            item.tree.meta[item.meta_name] = item.val;
                          }
                        });
                      });
                      return serial_promise(actions);
                    })
                      .then(function () {
                        onend();
                        resolve(tree_obj);
                      })
                      .catch(function (err) {
                        if (err.__ignore_error) {
                          return;
                        }
                        _root_reject(err);
                      });
                  };
                  reader.readAsText(blob);
                });
              }
		        });
            function onend() {
              zipReader.close();
            }
          }, function (err) {
            err = err || new Error("Unknown error");
            err.__msg = "Could not load input zip file";
            err.__iserror = true;
            _root_reject(err);
          });
        })
          .catch(function(err) {
            if (!err.__msg || err.__iserror) {
              var data = handle_error_data(err);
              console.error.apply(console, data.console_error);
            } else {
              console.warn('import error', err)
            }
            update_alert(false, err.__msg || "Could not parse tree");
            didfinish();
            return false;
          })
          .then(function(tree) {
            if(tree === false)
              return;
            var tree_md = tree_to_markdown(tree);
            $('form[name=edit-tree] [name=tree-input]').val(tree_md)
            return save_tree()
              .then(didfinish, function (err) {
                console.error(err);
                didfinish();
              });
          });
        function didfinish () {
          waitingDialog.hide();
        }
      }
    }
  });
  
  function update_tree_default_select() {
    var value = $('#tree-default-select').val();
    $('#tree-default-select-load-btn').prop('disabled', !value);
  }
  $('#tree-default-select-load-btn').on('click', function() {
    var locale = config.locale || default_locale;
    var default_name = $('#tree-default-select').val();
    if (window.pasco_data_state) {
      bootbox.prompt(_t("Please write a name for the new tree"), function (name) {
        if (!name) {
          update_alert(false, _t("Empty name is not allowed"));
        } else {
          let tree_info
          get_default_tree_url(default_name, locale)
            .then(function (file_url) {
              var tmp = fs_friendly_name(name);
              var tree_fn = tmp + '/' + tmp + '.md'
              let name2 = name
              let tree_fn2 = name + '/' + name + '.md'
              let exists = !!trees_info.list.find((a) => a.name == name2 || a.tree_fn == tree_fn2)
              for (let i = 0; i < 1000; i++) {
                if (!exists) {
                  break
                }
                name2 = name + '_' + (i + 1)
                tree_fn2 = name + '_' + (i + 1) + '/' + name + '.md'
                exists = !!trees_info.list.find((a) => a.name == name2 || a.tree_fn == tree_fn2)
              }
              tree_info = { name: name2, tree_fn: tree_fn2 }
              return window.pasco_data_state.storeTree(tree_info.tree_fn, file_url, new URL(window.host_tree_dir_prefix, location+'').href)
            })
            .then(function () {
              trees_info.list.push(tree_info)
              return set_file_data(pasco_data_state.get_file_url(trees_info_fn), JSON.stringify(trees_info, null, '  '))
            })
            .then(function () { return update_pasco_data_state() })
            .then(function () {
              return change_tree(get_file_url(tree_info.tree_fn, trees_info_fn))
            })
            .then(function () {
              update_tree_name_selection_update();
              update_alert(true);
            })
            .catch(handle_error);
        }
      });
    } else {
      if (!confirm('Cannot load default trees in the legacy version, Would you like to update to v1?')) {
        return
      }
      upgrade_to_pasco_data_state()
    }
  });
}

function showsavemodal(name, blob) {
  var $modal = $('#save-file-modal');
  if($modal.length == 0)
    return; // should never happen
  if(window.cordova) {
    // There might be a better place to store the file for sharing, TODO:: fix it
    var filepath = window.cordova_user_dir_prefix + name;
    write_file(filepath, blob)
      .then(function() {
        return new Promise(function(resolve, reject) {
          resolveLocalFileSystemURL(filepath, function(entry) {
            $modal[0]._nfilepath = entry.toURL();
            resolve();
          }, reject);
        })
      })
      .then(function() {
        $modal.modal('show');
        $('#save-file--share-btn').delay(500).click();
      })
      .catch(function(err) {
        console.error(err);
        update_alert(false, new Error("Could not share file!"));
      });
  } else {
    $modal.modal('show');
    // $modal[0]._blob = blob;
		var blobURL = URL.createObjectURL(blob);
    $('#save-file--open-btn')
      .prop('href', blobURL)
      .prop('download', name)
      .delay(500).click();
  }
}

function _save_trees_info (trees_info) {
  return set_file_data(trees_info_fn, JSON.stringify(trees_info, null, "  "));
}

function _start_subrout_tree_selection () {
  // update tree select options
  update_tree_name_selection_update();
  $('#tree-name-input').on('change', function ($evt) {
    var selm = this,
        new_tree_fn = selm.value,
        $form = $('form[name=edit-tree]').first(),
        $tree_input = $form.find('[name=tree-input]');
    $tree_input.prop('disabled', true);
    prepare_tree(get_file_url(new_tree_fn, trees_info_fn))
      .catch(handle_error_checkpoint())
      .then(function(info) {
        ptree_info = info;
        update_tree_name_selection_update();
        return get_file_data(info.tree_fn)
          .catch(handle_error_checkpoint())
      })
      .then(function(_data) { set_tree_data(_data); })
      .catch(handle_error)
      .then(function () {
        $tree_input.prop('disabled', false);
      });
  });
  $('#tree-new-btn').on('click', function ($evt) {
    bootbox.prompt(_t("Please write a name for the new tree"), function (name) {
      if (!name) {
        update_alert(false, _t("Empty name is not allowed"));
      } else {
        $('#tree-delete-btn').prop('disabled', true);
        $('#tree-name-input').prop('disabled', true);
        var tmp = fs_friendly_name(name);
        var tree_fn = tmp + '/' + tmp + '.md'
        prepare_tree(get_file_url(tree_fn, trees_info_fn))
          .catch(handle_error_checkpoint())
          .then(function (info) {
            var trees_info_orig = JSON.stringify(trees_info);
            trees_info.list.push({ name: name, tree_fn });
            return set_file_data(info.tree_fn, "")
              .then(function () {
                return _save_trees_info(trees_info)
                  .then(function () { return update_pasco_data_state() })
                  .catch(function (err) {
                    trees_info = JSON.parse(trees_info_orig);
                    throw err;
                  });
              })
              .then(function () {
                ptree_info = info;
                set_tree_data("");
                update_tree_name_selection_update();
                update_alert(true);
              });
          })
          .catch(function (err) {
            update_alert(false, err);
          })
          .then(function () {
            $('#tree-delete-btn').prop('disabled', false);
            $('#tree-name-input').prop('disabled', false);
          });
      }
    });
  });
  $('#tree-delete-btn').on('click', function ($evt) {
    if (trees_info.list.length == 1) {
      update_alert(false, _t("Could not delete the last item. Try the New button"))
    } else {
      bootbox.confirm(_t("Are you sure you want to delete this item?"), function(confirmed) {
        if (confirmed) {
          let tree_fn = $('#tree-name-input').val()
          var ptree_info_idx = _.findIndex(trees_info.list, function(a) { return a.tree_fn == tree_fn; });
          if (ptree_info_idx == -1) {
            update_alert(false, _t("Could not delete, tree info not found!"))
          } else {
            $('#tree-delete-btn').prop('disabled', true);
            $('#tree-name-input').prop('disabled', true);
            var tinfo = trees_info.list[ptree_info_idx];
            // TODO:: also remove local dependencies of the tree
            (window.pasco_data_state ? 
             pasco_data_state.deleteTree(get_file_url(tinfo.tree_fn, trees_info_fn)) :
             unset_file(tinfo.tree_fn))
              .then(function () {
                var trees_info_orig = JSON.stringify(trees_info);
                trees_info.list.splice(ptree_info_idx, 1);
                var nexttinfo = trees_info.list.length > ptree_info_idx ?
                    trees_info.list[ptree_info_idx] :
                    trees_info.list[trees_info.list.length - 1];
                return _save_trees_info(trees_info)
                  .then(function () {
                    if (config.tree == tree_fn) {
                      config = JSON.parse(config_data);
                      config.tree = '';
                      return do_save_config({ handle_errors: false })
                    }
                  })
                  .then(function () { return update_pasco_data_state() })
                  .catch(function (err) {
                    trees_info = JSON.parse(trees_info_orig);
                    throw err;
                  })
                  .then(function () {
                    return change_tree(get_file_url(nexttinfo.tree_fn, trees_info_fn))
                      .catch(function (err) {
                        console.error("Could not load tree (after delete), " + nexttinfo.tree_fn);
                        return change_tree(window.default_tree);
                      });
                  });
              })
              .then(function () {
                update_tree_name_selection_update();
                update_alert(true);
              })
              .catch(function (err) {
                update_alert(false, err);
              })
              .then(function () {
                $('#tree-delete-btn').prop('disabled', false);
                $('#tree-name-input').prop('disabled', false);
              });
          }
        }
      });
    }
  });
}

function update_tree_name_selection_update () {
  $('.tree-name-selection').each(function () {
    var $sel = $(this), config_tree = config.tree || window.default_tree;
    $sel.html('');
    _.each(trees_info.list, function (item) {
      var $opt = $('<option/>')
          .attr('value', item.tree_fn)
          .text(item.name)
          .appendTo($sel);
      if ($sel[0].id == 'tree-name-input') {
        let tree_fn_url = get_file_url(item.tree_fn, trees_info_fn)
        $opt.attr('selected', tree_fn_url == ptree_info.tree_fn ? "" : undefined);
      } else {
        $opt.attr('selected', item.tree_fn == config_tree ? "" : undefined);
      }
    });
  });
}

function get_default_tree_url (name, locale) {
  let file_url = 'trees/' + name + '/' + locale + '-' + name + '.md'
  return get_file_data(file_url)
    .catch(function(err) {
      if(default_locale == locale)
        throw err;
      file_url = 'trees/' + name + '/' + default_locale + '-' + name + '.md'
      return get_file_data(file_url)
        .catch(function() {
          file_url = 'trees/' + name + '/' + name + '.md'
          return get_file_data(file_url)
            .catch(function() { throw err; });
        });
    })
    .then(function () {
      return new URL(file_url, location+'').href;
    });
}

function get_default_tree(name, locale) {
  return get_file_data('trees/' + name + '/' + locale + '-' + name + '.md')
    .catch(function(err) {
      if(default_locale == locale)
        throw err;
      return get_file_data('trees/' + name + '/' + default_locale + '-' + name + '.md')
        .catch(function() {
          return get_file_data('trees/' + name + '/' + name + '.md')
            .catch(function() { throw err; });
        });
    });
}

function serial_promise(funcs) {
  var results = [], func;
  funcs = funcs.concat();
  func = funcs.shift();
  return func ? Promise.resolve().then(subrout) : Promise.resolve([]);
  function subrout(result) {
    results.push(result);
    if(func) {
      var promise = func();
      func = funcs.shift();
      return promise ? promise.then(subrout) : subrout(promise);
    } else {
      return results;
    }
  }
}

var audio_meta_list = [ 'audio', 'cue-audio', 'main-audio' ];
function tree_import_prepare(ptree_info, tree, import_list) {
  if(tree.meta) {
    _.each(audio_meta_list, function(audio_meta) {
      prepare_attr_file_for_import(audio_meta, 'blob');
    });
    prepare_attr_file_for_import('words-file', null);
  }
  if(tree.static_nodes || tree.nodes)
    _.each(tree.static_nodes || tree.nodes, function(a) { tree_import_prepare(ptree_info, a, import_list); });

  function prepare_attr_file_for_import (name, datatype) {
    var val = tree.meta[name];
    if (val && val.indexOf("://") == -1 && val.indexOf("../") == -1) {
      var iobj = _.find(import_list, function (a) { return a.val == val; });
      if (iobj != null) {
        tree.meta[name] = iobj.newval;
      } else {
        tree.meta[name] = ptree_info.dirpath + '/' + val;
        import_list.push({
          tree: tree,
          meta_name: name,
          val: val,
          newval: tree.meta[name],
          datatype: datatype,
        });
      }
    }
  }
}
function tree_export_prepare(ptree_info, tree, export_files) {
  if(tree.meta) {
    _.each(audio_meta_list, function(audio_meta) {
      prepare_attr_file_for_export(audio_meta, 'audio');
    });
    prepare_attr_file_for_export('words-file', '');
  }
  if(tree.static_nodes || tree.nodes)
    _.each(tree.static_nodes || tree.nodes, function(a) { tree_export_prepare(ptree_info, a, export_files); });

  function prepare_attr_file_for_export (name, optional_prefix) {
    var val = tree.meta[name];
    if(val) {
      var eobj = _.find(export_files, function (a) { return a.val ==val; });
      if (eobj != null) {
        tree.meta[name] = eobj.newval;
      } else {
        if(val.indexOf(ptree_info.dirpath) == 0) {
          var newval = val.substr(ptree_info.dirpath.length);
          if (newval[0] == '/')
            newval = newval.substr(1);
          tree.meta[name] = newval;
        } else {
          tree.meta[name] = (optional_prefix ? optional_prefix + '/' : '') + fs_friendly_name(val);
        }
        export_files.push({
          tree: tree,
          meta_name: name,
          val: val,
          newval: tree.meta[name]
        });
      }
    }
  }
}

function validate_number(v, name) {
  var ret = parseFloat(v)
  if(isNaN(ret))
    throw new Error(name + " should be a number");
  return ret;
}
var config_validators = {
  'number': validate_number
};
var _voice_id_links = [
  [ 'auditory_main_voice_options', '_main_voice_id', '#auditory-main-playback-wrp', 'Main Voice' ],
  [ 'auditory_cue_voice_options', '_cue_voice_id', '#auditory-cue-playback-wrp', 'Cue Voice' ],
  [ 'auditory_cue_first_run_voice_options', '_cue_first_run_voice_id', '#auditory-cue-first-run-playback-wrp', 'Cue First Run Voice' ],
];

function insert_config() {
  var $form = $(is_quick_setup ? 'form[name=quick-setup]' : 'form[name=edit-config]').first()
  $form.find('input,select,textarea,radio,checkbox').each(function() {
    if(this.name.length > 0 && this.name && this.name[0] != '_') {
      var name = this.name;
      var path = name.split('.');
      // special case for voice_options, load prefixed data if not avail
      var vo_suffix = 'voice_options';
      if(path[0].indexOf(vo_suffix) == path[0].length - vo_suffix.length) {
        if(!config[path[0]] && config['_'+path[0]]) {
          name = '_' + name;
        }
      }
      var input_info = _input_info_parse(name, config);
      if(input_info.value != undefined)
        _input_set_from_config(this, input_info.value);
    }
  });
  // specific
  _.each(_voice_id_links, function(alink) {
    var propname = (speaku.is_native ? '' : 'alt_') + 'voiceId',
        part = config[alink[0]] || config['_' + alink[0]],
        vid = part ? part[propname] : null;
    $form.find('[name='+alink[1]+']').val(vid || '')
  });
  $form.find('[name=_cue_first_active]')
    .prop('checked', !!config.auditory_cue_first_run_voice_options)
    .trigger('change');
}

function change_tree (tree_fn) {
  return prepare_tree(tree_fn)
    .catch(handle_error_checkpoint())
    .then(function(info) {
      return get_file_data(info.tree_fn)
        .catch(handle_error_checkpoint())
        .then(function(_data) {
          ptree_info = info;
          tree_data = _data;
          update_tree_name_selection_update();
          return set_tree_data(tree_data);
        });
    });
}

function set_tree_data (_tree_data) {
  tree_data = _tree_data;
  var $form = $('form[name=edit-tree]').first()
  $form.find('[name=tree-input]').val(tree_data)
}

let _needs_save_config_timeoutid = null
function set_needs_save_config () {
  if (_needs_save_config_timeoutid != null) {
    return
  }
  _needs_save_config_timeoutid = setTimeout(function () {
    _needs_save_config_timeoutid = null
    do_save_config({ handle_errors: true })
  }, 500)
}
function do_save_config(options) {
  options = options || {}
  var hdlerr = typeof options.handle_errors == 'undefined' ? true : options.handle_errors
  if (!config) { // when config is null use config_data default behavior
    config = JSON.parse(config_data);
  }
  var $form = $(is_quick_setup ? 'form[name=quick-setup]' : 'form[name=edit-config]').first()
  // validate & apply input
  try {
    $form.find('input,select,textarea').each(function() {
      if(this.name.length > 0 && this.name && this.name[0] != '_') {
        var validator_attr = this.getAttribute('data-validator'),
            validator = validator_attr ? config_validators[validator_attr] : null;
        if(validator_attr && !validator)
          throw new Error("Validator not found " + validator_attr + " for " + this.name);
        var value = validator ? validator(this.value, this.name) : this.value;
        var input_info = _input_info_parse(this.name, config, true);
        _input_info_set_config_value(this, input_info, value);
      }
    });
    // specific
    _.each(_voice_id_links, function(alink) {
      var $inp = $form.find('[name='+alink[1]+']');
      if($inp.length == 0)
        return; // skip when not exists
      var propname = (speaku.is_native ? '' : 'alt_') + 'voiceId',
          str = $inp.val();
      if(!config[alink[0]])
        config[alink[0]] = {}
      if(str)
        config[alink[0]][propname] = str;
      else
        delete config[alink[0]][propname];
    });
    if(!is_quick_setup) {
      if(!$form.find('[name=_cue_first_active]').prop('checked')) {
        config._auditory_cue_first_run_voice_options =
          config.auditory_cue_first_run_voice_options;
        delete config.auditory_cue_first_run_voice_options;
      } else {
        delete config._auditory_cue_first_run_voice_options;
      }
    }
  } catch(err) {
    if(hdlerr) {
      return update_alert(false, err);
    } else {
      return Promise.reject(err);
    }
  }
  // then save
  // console.log(config)
  var _config_data = JSON.stringify(config, null, "  ");
  return set_file_data(config_fn, _config_data)
    .then(function () { return update_pasco_data_state() })
    .then(function() {
      config_data = _config_data
      if(hdlerr) {
        update_alert(true);
      }
    })
    .catch(function(err) {
      if(hdlerr) {
        update_alert(false, err);
      } else {
        throw err;
      }
    });
}

function save_quick_setup(evt) {
  evt.preventDefault();
  var $form = $('form[name=quick-setup]');
  var $tree_select = $('#tree-default-select');
  if(!$tree_select.val()) {
    return show_error(new Error("Please select a tree"));
  }
  var _config = JSON.parse(config_data);
  _config.__did_quick_setup = true;
  var locale = config.locale || default_locale;
  var name = $('#tree-default-select').val();
  return get_default_tree_url(name, locale)
    .then(function(default_tree_url) {
      // use pasco_data_state.storeTree if pasco_data_state is available
      if (window.pasco_data_state) {
        // write default_tree
        let write_trees_info = false
        let default_tree_info = trees_info.list.find((a) => a.name == 'default')
        if (!default_tree_info) {
          write_trees_info = true
          trees_info.list.push({
            name: 'default',
            tree_fn: 'default/default.md',
          })
        }
        return (write_trees_info ?
                set_file_data(pasco_data_state.get_file_url(trees_info_fn), JSON.stringify(trees_info, null, '  ')) : Promise.resolve())
          .then(function () {
            let default_tree_info = trees_info.list.find((a) => a.name == 'default')
            _config.tree = default_tree_info.tree_fn
            return window.pasco_data_state.storeTree(default_tree_info.tree_fn, default_tree_url, new URL(window.host_tree_dir_prefix, location+'').href)
          })
      } else {
        _config.tree = ptree_info.tree_fn
        return set_file_data(ptree_info.tree_fn, data);
      }
    })
    .then(function () {
      config = _config
      return do_save_config({ handle_errors: false })
    })
    .then(function () { return update_pasco_data_state() })
    .then(function() {
      window.location = 'index.html'; // open index page
    })
    .catch(show_error);
  function show_error(err) {
    console.error(err);
    var $alert = $form.find('.save-section .alert-danger')
    $alert.html(error_to_html(err)).removeClass('alert-hidden');
  }
}

function update_alert(success, err) {
  if(window.__update_alert_timeout)
    clearTimeout(window.__update_alert_timeout);
  $('.settings-success-alert').toggleClass('visible', success);
  $('.settings-danger-alert').toggleClass('visible', !success);
  if(success) {
    $('.settings-success-alert .alert-success')
      .html('<strong>Saved!</strong>')
      .toggleClass('alert-hidden', false);
  } else {
    console.error(err);
    $('.settings-danger-alert .alert-danger')
      .html(error_to_html(err))
      .toggleClass('alert-hidden', false);
  }
  window.__update_alert_timeout = setTimeout(function() {
    $('.settings-success-alert').toggleClass('visible', false);
    $('.settings-danger-alert').toggleClass('visible', false);
    window.__update_alert_timeout = setTimeout(function() {
      $('.settings-success-alert .alert-success').html('')
        .toggleClass('alert-hidden', true);
      $('.settings-danger-alert .alert-danger').html('')
        .toggleClass('alert-hidden', true);
      delete window.__update_alert_timeout;
    }, 510);
  }, 3000);
}

function config_auto_save_init() {
  var $form = $('form[name=edit-config]').first()
  $form.on('input', 'input', onchange);
  $form.on('change', 'select,input[type=checkbox],input[type=radio],input[type=range]', onchange);
  // rangeslider emits change event programmatically, Thus require capture
  // parameter of event listener to be true
  if ($form[0] && $form[0].addEventListener) {
    $form[0].addEventListener("input", function (evt) {
      if (evt.target.__rangeslider && evt.target.nodeName == "INPUT" &&
          evt.target.type == "range" && evt.target.name) {
        var input_info = _input_info_parse(evt.target.name, config),
            preval = input_info.value,
            val = parseFloat(evt.target.value);
        if (input_info.target == null ||
            (!isNaN(val) && !isNaN(preval) && Math.abs(preval - val) < 0.0001)) {
          return; // ignore
        }
        onchange(evt);
      }
    }, true);
  }
  function onchange(evt) {
    if (evt && evt.target && !evt.target.name) {
      return;
    }
    set_needs_save_config();
  }
}

function save_tree(evt) {
  if(evt)
    evt.preventDefault();
  var $form = $('form[name=edit-tree]').first()
  // validate & apply input
  tree_data = $form.find('[name=tree-input]').val()
  // then save
  $form.find('.save-section .alert').html('').toggleClass('alert-hidden', true)
  return set_file_data(ptree_info.tree_fn, tree_data)
    .then(function () { return update_pasco_data_state() })
    .then(function() {
      update_alert(true);
    })
    .catch(function(err) {
      update_alert(false, err);
    });
}

function error_to_html(err) {
  return '<strong>Error:</strong> ' + (err+'').replace(/^error:\s*/i, "")
}

// basic editing features (driven with markup)
$(document).on('change', 'input[type=checkbox],input[type=radio]', function() {
  var el = this,
      $el = $(el);
  if(this.type == 'radio' && !this._others_triggered) {
    // trigger change for all with same name
    $el.parents('form').find('input[type=radio]').each(function() {
      if(this.name == el.name && el != this) {
        this._others_triggered = true;
        $(this).trigger('change');
        delete this._others_triggered;
      }
    });
  }
  var toggle_sel = $el.data('inp-collapse-toggle');
  if(toggle_sel) {
    var toggle_el = document.querySelector(toggle_sel);
    if(toggle_el) {
      collapsable_toggle(toggle_el, this.checked);
    }
  }
});

if (document.addEventListener) {
  document.addEventListener('input', input_dependent_onchange, true);
} else {
  $(document).on('input', 'input[type=number],input[type=range]', input_dependent_onchange);
}

function input_dependent_onchange (evt) {
  var $elm = $(evt.target);
  if (evt.target.nodeName == 'INPUT' &&
      ['number','range'].indexOf(evt.target.type) != -1) {
    if(!$elm.data('--dependent-disabled') && $elm.data('dependent')) {
      var $other = $($elm.data('dependent')),
          val = $elm.val();
      if(typeof val != 'number')
        val = parseFloat(val);
      if(isNaN(val)) {
        return;
      }
      $other.each(function() { $(this).data('--dependent-disabled', true) })
      $other.each(function() {
        if (Math.abs(parseFloat(this.value) - val) < 0.001) {
          return; // no need to change dependent value
        }
        var lval = val,
            max = this.max ? parseFloat(this.max) : NaN,
            min = this.min ? parseFloat(this.min) : NaN;
        if(!isNaN(max) && lval > max)
          lval = max;
        if(!isNaN(min) && lval < min)
          lval = min;
        this.value = lval;
        if(this.type == 'range' && this.__rangeslider) {
          this.__rangeslider.update({ value: this.value });
        } else {
          this.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      $other.each(function() { $(this).data('--dependent-disabled', false) })
    }
  }
  if (evt.target.nodeName == 'INPUT') {
    // data-disp
    if ($elm.data('disp')) {
      var $other = $($elm.data('disp')),
          val = $elm.val();
      $other.text("[" + val + "]");
    }
  }
}

function _input_set_from_config(element, value) {
  if(['radio','checkbox'].indexOf(element.type) != -1) {
    if(element.type == 'checkbox' && typeof value == 'boolean') {
      element.checked = value;
    } else {
      element.checked = element.value == value+'';
    }
    $(element).trigger('change');
  } else {
    element.value = value+'';
  }
  if(['text','number','range'].indexOf(element.type) != -1) {
    // element with data-dependent cannot receive the event unless
    // dispatchEvent with CustomEvent is used
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
function _input_info_set_config_value(element, info, value) {
  if(element.type == 'checkbox') {
    if(!element.value || element.value.toLowerCase() == 'on') {
      // is boolean
      info.target[info.name] = element.checked
    } else {
      if(element.checked)
        info.target[info.name] = value
      else
        delete info.target[info.name]
    }
  } else if(element.type == 'radio') {
    if(element.checked) {
      info.target[info.name] = value
    }
  } else {
    info.target[info.name] = value;
  }
}
function _input_info_parse(name, config, mkobjr) {
  var path = name.split('.');
  var value, target, name;
  var tmp = config;
  for(var i = 0, len = path.length; i < len; ++i) {
    var key = path[i];
    if(i + 1 == len) {
      target = tmp;
      value = tmp[key];
      name = key;
    } else {
      if(tmp[key] == null) {
        if (mkobjr) {
          tmp[key] = {}
        } else {
          target = null
          value = undefined
          name = path[path.length - 1]
          break
        }
      }
      tmp = tmp[key]
    }
  }
  return {
    path: path,
    target: target,
    name: name,
    value: value
  };
}
function bind_configure_actions () {
  $('.configure-actions-wrp').find('button[data-action]')
    .click(function ($evt) {
      var $this = $(this);
      configure_action_init($this.data('action'), $this.text());
    });
}
function configure_action_init (action, label) {
  var initial_config_keys = Object.assign({}, config.keys);
  var idprefix = 'configure-action';
  $('#' + idprefix + '-title-suffix').text('(' + label + ')');
  var key_tmpl = _.template($('#' + idprefix + '-key-template').html());
  var $key_list = $('#' + idprefix + '-key-list');
  var keys_obj = [];
  var id = 1;
  var config_keys = config.keys || {};
  for (var key in config_keys) {
    if (config_keys.hasOwnProperty(key)) {
      var ckey = config_keys[key];
      if (ckey.func == action) {
        delete initial_config_keys[key];
        keys_obj.push({
          key: key,
          label: ckey.label,
          id: id++,
        });
      }
    }
  }
  key_list_update();
  $('#' + idprefix + '-key-list')
    .off('click', '.remove-btn')
    .on('click', '.remove-btn', remove_btn_clicked);
  $('#' + idprefix + '-key-list')
    .off('click', '.key-btn')
    .on('click', '.key-btn', key_btn_clicked);
  $('#' + idprefix + '-key-add-btn')
    .off('click')
    .on('click', function ($evt) {
      var nextid = 1;
      _.each(keys_obj, function (a) { nextid = nextid <= a.id ? a.id+1 : nextid; });
      var key_obj = {
        key: '',
        label: '',
        id: nextid,
      };
      keys_obj.push(key_obj);
      var $keywrp = $(key_tmpl(key_obj));
      $key_list.append($keywrp);
      if ($keywrp.find('.key-btn').length > 0) {
        key_btn_clicked.call($keywrp.find('.key-btn')[0]);
      }
    });
  $('#' + idprefix + '-save-btn')
    .off('click')
    .on('click', function ($evt) {
      var config_keys = Object.assign({}, initial_config_keys);
      _.each(keys_obj, function (key_obj) {
        config_keys[key_obj.key+''] = {
          func: action,
          label: key_obj.label,
        };
      });
      var _config = JSON.parse(config_data);
      _config.keys = config_keys;
      do_save_config({ handle_errors: true });
      $('#' + idprefix + '-modal').modal('hide');
    });
  $('#' + idprefix + '-modal').modal('show');
  function key_btn_clicked () {
    var $this = $(this);
    if ($this.hasClass('is-waiting')) {
      return;
    }
    var id = $this.parent().parent().data('id');
    document._configure_action_key_id = parseInt(id);
    $this.addClass('is-waiting');
    napi_add_key_command()
      .then(function () {
        document.addEventListener('mousedown', key_onmousedown, true);
        document.addEventListener('keydown', key_onkeydown, true);
        document.addEventListener('keyup', key_onkeyup, true);
        document.addEventListener('x-keycommand', key_onkeycommand, true);
      });
  }
  function key_onmousedown ($evt) {
    $evt.preventDefault();
    var key, label;
    if ($evt.button == 0) {
      key = "Click";
      label = "Click";
    } else if ($evt.button == 2) {
      key = "RightClick";
      label = "Right Click";
    }
    _register_key(key, label);
  }
  function key_onkeydown ($evt) {
    $evt.preventDefault();
    var label = $evt.key;
    var substitute_labels = {
      " ": "Space",
    };
    if (label in substitute_labels) {
      label = substitute_labels[label];
    }
    _register_key(($evt.charCode || $evt.keyCode)+'', label);
  }
  function key_onkeyup ($evt) {
    $evt.preventDefault();
  }
  function key_onkeycommand (evt) {
    if(!NativeAccessApi.keyCodeByInput.hasOwnProperty(evt.detail.input))
      return;
    var code = NativeAccessApi.keyCodeByInput[evt.detail.input];
    _register_key(code, evt.detail.input);
  }
  function _register_key (key, label) {
    var id = document._configure_action_key_id;
    delete document._configure_action_key_id;
    var key_obj = _.find(keys_obj, function(a) { return id == a.id; });
    if (key_obj != null) {
      key_obj.key = key;
      key_obj.label = label;
      key_list_update(); // simple update
    }
    napi_remove_key_command()
      .then(function () {
        document.removeEventListener('mousedown', key_onmousedown, true);
        document.removeEventListener('keydown', key_onkeydown, true);
        document.removeEventListener('keyup', key_onkeyup, true);
        document.removeEventListener('x-keycommand', key_onkeycommand, true);
      });
  }
  function remove_btn_clicked () {
    var id = $(this).parent().parent().data('id');
    var index = _.findIndex(keys_obj, function(a) { return id == a.id; });
    if (index != -1) {
      keys_obj.splice(index, 1);
      key_list_update();
    }
  }
  function key_list_update () {
    $key_list.html(_.map(keys_obj, function (obj) { return key_tmpl(obj); }));
  }
}


/*** Section Voice By Locale ***/
var all_locale_info = [
  { locale: "en-GB", label: "English (UK)" },
  { locale: "de", label: "German" },
  { locale: "fr-FR", label: "French" },
  { locale: "es-ES", label: "Spanish" },
  { locale: "ar", label: "Arabic" },
  { locale: "gu", label: "Gujarati" },
  { locale: "cy", label: "Welsh" },
];
function voice_by_locale_init (idprefix, label, data, onchange) {
  $('#' + idprefix + '-title-suffix').text("(" + label + ")");
  var vidname = (speaku.is_native ? '' : 'alt_') + 'voiceId';
  var tmpl = _.template($('#' + idprefix + '-vid-template').html());
  var $list = $('#' + idprefix + '-list');
  // init existing state
  $list.html(_.map(data.voices, function (voice) {
    var linfos = _.filter(all_locale_info, function (linfo) { return linfo.locale == voice.locale });
    var vlabel = linfos.length > 0 ? linfos[0].label : voice.locale;
    return tmpl({
      locale: voice.locale,
      value: voice[vidname],
      label: vlabel,
      options: _vbl_voice_tmpl_options(voice.locale),
    });
  }));
  
  $('#' + idprefix + '-modal')
    .off('change', '.' + idprefix + '-vid select')
    .on('change', '.' + idprefix + '-vid select', didchange);
  $('#' + idprefix + '-modal')
    .off('click', '.' + idprefix + '-vid .remove-btn')
    .on('click', '.' + idprefix + '-vid .remove-btn', remove_clicked);
  
  $('#' + idprefix + '-add-btn')
    .off('click')
    .on('click', function ($evt) {
      var locale = $('#' + idprefix + '-add').val();
      if (!locale) {
        throw new Error("No locale!");
      }
      var options = _vbl_voice_tmpl_options(locale)
      if (options.length == 0) {
        update_alert(false, new Error("No option found for this locale!"));
        return;
      }
      var linfos = _.filter(all_locale_info, function (linfo) { return linfo.locale == locale });
      var vlabel = linfos.length > 0 ? linfos[0].label : locale;
      var voice = { locale: locale, };
      voice[vidname] = options[0]?options[0].value:'';
      data.voices.push(voice);
      $list.append($(tmpl({
        locale: voice.locale,
        value: voice[vidname],
        label: vlabel,
        options: options,
      })));
      update_add_locale();
      didchange();
    });
  update_add_locale();
  $('#' + idprefix + '-modal').modal('show');
  function remove_clicked ($evt) {
    var locale = $($evt.target).data('locale');
    if (locale) {
      var $parent = $($evt.target).parents('.voice-by-locale-vid');
      if ($parent.length > 0) {
        var idx = _.findIndex(data.voices, function (voice) {
          return voice.locale == locale;
        });
        data.voices.splice(idx, 1);
        $parent.remove();
        update_add_locale();
        didchange();
      }
    }
  }
  function didchange () {
    var voices = _.filter(
      _.map($('#' + idprefix + '-modal .' + idprefix + '-vid select'), function (elm) {
        var locale = elm.name.indexOf('voice-id-of-') == 0 ?
            elm.name.slice('voice-id-of-'.length) : null;
        if (!locale) {
          return null;
        }
        var tmp = _.filter(data.voices, function (v) { return v.locale == locale; })
        if (tmp.length == 0) {
          return null;
        }
        var ret = _.extend({}, tmp[0]);
        ret[vidname] = elm.value;
        return ret;
      }),
      function (v) { return !!v; }
    );
    onchange({ voices: voices });
  }
  function update_add_locale () {
    $('#' + idprefix + '-add').html(_.map(all_locale_info, function (linfo) {
      if (_.filter(data.voices, function (ex) {
            // cmp of a locale and existing locale
            // en-GB, en => false (not match)
            // en, en-GB => true
            // en-Gb, en-GB => true
            return !(linfo.locale.indexOf('-') != -1 && ex.locale.indexOf('-') == -1) &&
              linfo.locale.split('-')[0] == ex.locale.split('-')[0];
          }).length > 0) {
        return '';
      }
      return '<option value="' + _.escape(linfo.locale) + '">' + _.escape(linfo.label) + '</option>';
    }).join(""));
    $('#' + idprefix + '-add-wrp')[$('#' + idprefix + '-add').html().trim() == "" ? 'hide' : 'show']();
  }
}
function _vbl_voice_tmpl_options (locale) {
  var vlist = _.filter(all_voices, function (v) {
    return v.locale == locale;
  });
  if (vlist.length == 0) {
    vlist = _.filter(all_voices, function (v) {
      return (v.locale+"").split('-')[0] == locale.split('-')[0];
    });
  }
  return _.map(vlist, function (v) {
    return { value: v.id, label: v.label };
  });
}


function napi_add_key_command() {
  if(napi.available) {
    var promises = [];
    for(var key in NativeAccessApi.keyInputByCode) {
      if (NativeAccessApi.keyInputByCode.hasOwnProperty(key)) {
        var input = NativeAccessApi.keyInputByCode[key];
        if(input) {
          promises.push(napi.add_key_command(input))
        }
      }
    }
    return Promise.all(promises);
  } else {
    return Promise.resolve();
  }
}

function napi_remove_key_command() {
  if(napi.available) {
    var promises = [];
    for(var key in NativeAccessApi.keyInputByCode) {
      if (NativeAccessApi.keyInputByCode.hasOwnProperty(key)) {
        var input = NativeAccessApi.keyInputByCode[key];
        if(input) {
          promises.push(napi.remove_key_command(input));
        }
      }
    }
    return Promise.all(promises);
  } else {
    return Promise.resolve();
  }
}

function _init_custom_node (info) {
  var text_inp = info.text_inp,
      record_section = info.record_section,
      audio_inp = record_section.querySelector('input'),
      delete_audio_btn = record_section.querySelector('.delete-btn'),
      record_btn_wrap = record_section.querySelector('.node-record-btn-wrap'),
      record_btn = record_section.querySelector('.record-btn'),
      audio_dest = info.audio_dest,
      audio_dest_url = info.audio_dest_url;
  update_elements_class()
  record_btn.addEventListener('mousedown', record_btn_on_hold, false)
  record_btn.addEventListener('touchstart', record_btn_on_hold, false)
  delete_audio_btn.addEventListener('click', function () {
    if (audio_inp.value) {
      unset_file(audio_dest_url)
        .catch(function (err) {
          console.warn(err)
        })
    }
    change_audio_inp('')
  }, false)
  var recording_promise = null
  function record_btn_on_hold () {
    if (recording_promise) {
      return
    }
    recording_promise = _record_audio(audio_dest_url, record_btn_wrap)

    recording_promise
      .then(function (success) {
        if (success) {
          change_audio_inp(audio_dest)
        }
      })
      .catch(handle_error)
      .then(function () {
        recording_promise = null
      })

    document.addEventListener('mouseup', record_btn_on_release, false)
    document.addEventListener('touchend', record_btn_on_release, false)
  }
  function change_audio_inp (value) {
    audio_inp.value = value
    $(audio_inp).trigger('input')
    update_elements_class()
  }
  function record_btn_on_release () {
    if (recording_promise) {
      recording_promise.stopRecording()
    }
    document.removeEventListener('mouseup', record_btn_on_release, false)
    document.removeEventListener('touchend', record_btn_on_release, false)
  }
  function update_elements_class () {
    var has_audio = !!audio_inp.value ? true : false
    if (text_inp) {
      text_inp.classList[has_audio ? 'add' : 'remove']('hidden')
    }
    delete_audio_btn.classList[!has_audio ? 'add' : 'remove']('hidden')
  }
}

function _record_audio (dest, record_btn_wrap) {
  var stopped = false
  var media = null
  var promise = SpeakUnit.getInstance()
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
      if(stopped) {
        return false;
      }
      return new Promise(function(resolve, reject) {
        if(stopped) {
          return resolve(false);
        }
        var amp_circle = record_btn_wrap.querySelector('.record-amp-circle'),
            circle_max_radius = 120;
        function set_circle_radius(radius) {
          if(amp_circle) {
            amp_circle.style.width = (radius * 2) + 'px';
            amp_circle.style.height = (radius * 2) + 'px';
            amp_circle.style.borderRadius = radius + 'px';
          }
        }
        set_circle_radius(0);
        record_btn_wrap.classList.add('recording');
        // Audio player
        //
        media = new Media(
          dest,
          // success callback
          function() {
            record_btn_wrap.classList.remove('recording')
            clearInterval(mediaTimer);
            resolve(true);
          },
          // error callback
          function(err) {
            record_btn_wrap.classList.remove('recording')
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
  promise.stopRecording = function () {
    stopped = true;
    if(media) {
      media.stopRecord();
      media.release();
    }
  }
  return promise
}

function upgrade_to_pasco_data_state () {
  waitingDialog.show()
  let state_dir_url = (window.cordova ? window.cordova_user_dir_prefix : 'file:///') + 'v1/'
  PascoDataState.rebuildStateFromLegacy(this._state_config_fn, this._state_trees_info_fn, state_dir_url)
    .then(function (datastate) {
      let $message_modal = show_message({ title: _t('Update was successful'), message: '' })
      $message_modal.on('hide.bs.modal', function () {
        location.reload()
      })
    })
    .catch(function (err) {
      console.error(err)
      show_error({ title: _t('Failed to save to dropbox'), message: err.message || 'Unknown error' })
    })
    .then(function () {
      waitingDialog.hide()
    })
}
