var config_fn, ptree_info, trees_info_fn;
var speaku, config, config_data, trees_info, tree_data,
    voices, napi, is_quick_setup;
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
        return speaku.get_voices().then(function(v) { voices = v })
      });
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
    return prepare_tree(config.tree || window.default_tree)
        .catch(handle_error_checkpoint())
        .then(function(info) {
          ptree_info = info;
          return get_file_json(trees_info_fn)
            .then(function (_trees_info) { trees_info = _trees_info; })
            .catch(function (error) {
              console.warn("Could not load trees_info file, " + trees_info_fn, error);
              trees_info = { list: [
                {
                  name: info.dirname,
                  tree_fn: info.tree_fn,
                }
              ] };
            });
        });
  })
  .then(function() {
    return Promise.all([
      initl10n(config.locale||default_locale)
        .then(function() {
          domlocalize();
        })
        .catch(function(err) {
          console.warn(err);
        }),
      get_file_data(ptree_info.tree_fn)
        .catch(handle_error_checkpoint())
        .then(function(_data) { tree_data = _data; })
    ]);
  })
  .then(function() {
    document.body.classList.remove('notready');
  })
  .then(start)
  .catch(handle_error);

function _fix_config(cfg) {
  if(!cfg.auditory_cue_first_run_voice_options &&
     !cfg._auditory_cue_first_run_voice_options) {
    cfg._auditory_cue_first_run_voice_options =  {
      "volume": 1.0,
      "rate": "default",
      "rateMul": 1.5,
      "pitch": 1.0
    };
  }
}

function bind_dom_event_handlers () {
  $('#tree-tools-toggle').click(function ($evt) {
    $evt.preventDefault();
    collapsable_toggle($('#tree-tools')[0]);
  });
}

function start() {
  is_quick_setup = $('form[name=quick-setup]').length > 0;
  _start_subrout_tree_selection();
  // insert voice options
  var $form = $(is_quick_setup ? 'form[name=quick-setup]' : 'form[name=edit-config]').first(),
      voices_by_id = _.object(_.map(voices, function(voice) { return [voice.id,voice] }));
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
    var $inp = $form.find('[name='+alink[1]+']');
    var opt = newEl('option')
    opt.value = ''
    opt.textContent = 'Default'
    $inp.append(opt)
    _.each(voices, function(voice) {
      var opt = newEl('option')
      opt.value = voice.id
      opt.textContent = voice.label
      $inp.append(opt)
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
  
  insert_config()
  if(!is_quick_setup) {
    set_tree_data(tree_data);

    $('#tree-revert').on('click', function() {
      set_tree_data(tree_data);
    });
    
    config_auto_save_init();
    $form.on('submit', save_config)
    $('form[name=edit-tree]').on('submit', save_tree)
  } else {
    $form.on('submit', save_quick_setup)
  }
  
  update_tree_default_select();
  $('#tree-default-select').on('change', update_tree_default_select);

  $('#tree-export-btn').on('click', function($evt) {
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
          if(window.cordova) {
            var export_list = [],
                actions = [];
            tree_export_prepare(ptree_info, tree, export_list)
            _.each(export_list, function(item) {
              actions.push(function() {
                return get_file_data(item.val, { responseType: 'blob' })
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
          } else {
            return Promise.resolve([]);
          }
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
              showmodal('tree.zip', blob);
            }
            waitingDialog.hide();
            btn._working = false;
            resolve();
          });
        });
      }
      function showmodal(name, blob) {
        var $modal = $('#save-file-modal');
        if($modal.length == 0)
          return; // should never happen
        if(window.cordova) {
          var filepath = window.cordova_user_dir_prefix + 'tree.zip';
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
          $modal[0]._blob = blob;
				  var blobURL = URL.createObjectURL(blob);
          $('#save-file--open-btn')
            .prop('href', blobURL)
            .prop('download', name)
            .delay(500).click();
        }
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
          save_config();
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
                      if(window.cordova) {
                        var import_list = [],
                            actions = [];
                        tree_import_prepare(tree_obj, import_list);
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
                                  set_file_data(item.newval, blob)
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
                      } else {
                        return Promise.resolve([]);
                      }
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
              console.error.apply(console, data.error);
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
    var name = $('#tree-default-select').val();
    if(!name) {
      alert("Nothing selected!");
    } else {
      get_default_tree(name, locale)
        .then(change_tree)
        .catch(handle_error);
    }
    function change_tree(data) {
      tree_data = data
      $('form[name=edit-tree] [name=tree-input]').val(tree_data)
    }
  });
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
    prepare_tree(new_tree_fn)
      .catch(handle_error_checkpoint())
      .then(function(info) {
        ptree_info = info;
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
        prepare_tree(tmp + '/' + tmp + '.md')
          .catch(handle_error_checkpoint())
          .then(function (info) {
            var trees_info_orig = JSON.stringify(trees_info);
            trees_info.list.push({ name: name, tree_fn: info.tree_fn });
            return set_file_data(info.tree_fn, "")
              .then(function () {
                return _save_trees_info(trees_info)
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
          var ptree_info_idx = _.findIndex(trees_info.list, function(a) { return a.tree_fn == ptree_info.tree_fn; });
          if (ptree_info_idx == -1) {
            update_alert(false, _t("Could not delete, tree info not found!"))
          } else {
            $('#tree-delete-btn').prop('disabled', true);
            $('#tree-name-input').prop('disabled', true);
            var tinfo = trees_info.list[ptree_info_idx];
            var promise;
            if (window.cordova) {
              promise = cordova_rmdir_rec(ptree_info.dirpath);
            } else {
              promise = unset_file(tinfo.tree_fn);
            }
            promise
              .then(function () {
                var trees_info_orig = JSON.stringify(trees_info);
                trees_info.list.splice(ptree_info_idx, 1);
                var nexttinfo = trees_info.list.length > ptree_info_idx ?
                    trees_info.list[ptree_info_idx] :
                    trees_info.list[trees_info.list.length - 1];
                return _save_trees_info(trees_info)
                  .catch(function (err) {
                    trees_info = JSON.parse(trees_info_orig);
                    throw err;
                  })
                  .then(function () {
                    return change_tree(nexttinfo.tree_fn)
                      .catch(function (err) {
                        console.error("Could not load tree (after delete), " + nexttinfo.tree_fn);
                        return change_tree(window.default_tree);
                      });
                  })
                  .then(function () {
                    if (tinfo.tree_fn == config.tree) {
                      config.tree = ptree_info.tree_fn;
                      var $form = $('form[name=edit-config]').first();
                      $form.find('[name=tree]').val(config.tree);
                      return do_save_config($form, null, false);
                    }
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
        $opt.attr('selected', item.tree_fn == ptree_info.tree_fn ? "" : undefined);
      } else {
        $opt.attr('selected', item.tree_fn == config_tree ? "" : undefined);
      }
    });
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
function tree_import_prepare(tree, import_list) {
  if(tree.meta) {
    _.each(audio_meta_list, function(audio_meta) {
      var val = tree.meta[audio_meta];
      if (val && window.cordova && val.indexOf("://") == -1 &&
          val.indexOf("..") == -1 &&
          _.find(import_list, function (a) { return a.val == val; }) == null) {
        tree.meta[audio_meta] = ptree_info.dirpath + '/' + val;
        import_list.push({
          tree: tree,
          meta_name: audio_meta,
          val: val,
          newval: tree.meta[audio_meta]
        });
      }
    });
  }
  if(tree.nodes)
    _.each(tree.nodes, function(a) { tree_import_prepare(a, import_list); });
}
function tree_export_prepare(ptree_info, tree, export_files) {
  if(tree.meta) {
    _.each(audio_meta_list, function(audio_meta) {
      var val = tree.meta[audio_meta];
      if(val && window.cordova &&
         _.find(export_files, function (a) { return a.val ==val; }) == null) {
        if(val.indexOf(ptree_info.dirpath) == 0) {
          var newval = val.substr(ptree_info.dirpath.length);
          if (newval[0] == '/')
            newval = newval.substr(1);
          tree.meta[audio_meta] = newval;
          export_files.push({
            tree: tree,
            meta_name: audio_meta,
            val: val,
            newval: tree.meta[audio_meta]
          });
        } else {
          tree.meta[audio_meta] = 'audio/' + fs_friendly_name(val);
          export_files.push({
            tree: tree,
            meta_name: audio_meta,
            val: val,
            newval: tree.meta[audio_meta]
          });
        }
      }
    });
  }
  if(tree.nodes)
    _.each(tree.nodes, function(a) { tree_export_prepare(ptree_info, a, export_files); });
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
  [ 'auditory_main_voice_options', '_main_voice_id', '#auditory-main-playback-wrp' ],
  [ 'auditory_cue_voice_options', '_cue_voice_id', '#auditory-cue-playback-wrp' ],
  [ 'auditory_cue_first_run_voice_options', '_cue_first_run_voice_id', '#auditory-cue-first-run-playback-wrp' ],
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
  if(config.auto_keys) {
    var forward_key = (config.auto_keys['13'] &&
                       config.auto_keys['13'].func == 'tree_go_in' ? 'enter' :
                       (config.auto_keys['32'] &&
                        config.auto_keys['32'].func == 'tree_go_in' ? 'space':
                        null)),
        secondary_to_move = (forward_key == 'enter' ?
                             config.auto_keys['32'] &&
                             config.auto_keys['32'].func == 'tree_go_next' :
                             (forward_key == 'space' ? 
                              config.auto_keys['13'] &&
                              config.auto_keys['13'].func == 'tree_go_next' :
                              false));
      
    $form.find('[name=_auto_forward_key]').each(function() {
      this.checked = this.value == forward_key
    });
    $form.find('[name=_auto_secondary_key_move]').prop('checked', secondary_to_move);
  }
  if(config.switch_keys) {
    var forward_key = (config.switch_keys['13'] &&
                       config.switch_keys['13'].func == 'tree_go_in'?'enter':
                       (config.switch_keys['32'] &&
                        config.switch_keys['32'].func == 'tree_go_in'?'space':
                        null)),
        secondary_to_move = (forward_key == 'enter' ?
                             config.switch_keys['32'] &&
                             config.switch_keys['32'].func == 'tree_go_next' :
                             (forward_key == 'space' ? 
                              config.switch_keys['13'] &&
                              config.switch_keys['13'].func == 'tree_go_next' :
                              false));
    $form.find('[name=_switch_forward_key]').each(function() {
      this.checked = this.value == forward_key
    })
    $form.find('[name=_switch_secondary_key_move]').prop('checked', secondary_to_move);
  }
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
          return set_tree_data(tree_data);
        });
    });
}

function set_tree_data (_tree_data) {
  tree_data = _tree_data;
  var $form = $('form[name=edit-tree]').first()
  $form.find('[name=tree-input]').val(tree_data)
}

function save_config(evt) {
  if(evt)
    evt.preventDefault();
  var $form = $('form[name=edit-config]').first()
  return do_save_config($form, null, true);
}

function do_save_config($form, _config, hdlerr) {
  if (!_config) { // when _config is null use config_data default behavior
    _config = JSON.parse(config_data);
  }
  // validate & apply input
  try {
    $form.find('input,select,textarea').each(function() {
      if(this.name.length > 0 && this.name && this.name[0] != '_') {
        var validator_attr = this.getAttribute('data-validator'),
            validator = validator_attr ? config_validators[validator_attr] : null;
        if(validator_attr && !validator)
          throw new Error("Validator not found " + validator_attr + " for " + this.name);
        var value = validator ? validator(this.value, this.name) : this.value;
        var input_info = _input_info_parse(this.name, _config);
        _input_info_set_config_value(this, input_info, value);
      }
    });
    // specific
    if(!is_quick_setup) {
      var $inp = $form.find('[name=_auto_forward_key]:checked'),
          secondary_key_to_move = $form.find('[name=_auto_secondary_key_move]').prop('checked'),
          keys = null;
      switch($inp.val()) {
      case 'enter':
        keys = {
          '13': { 'func': 'tree_go_in', 'comment': 'enter' }
        }
        if(secondary_key_to_move)
          keys['32'] = { 'func': 'tree_go_next', 'comment': 'space' };
        else
          keys['32'] = { 'func': 'tree_go_out', 'comment': 'space' };
        break;
      case 'space':
        keys = {
          '32': { 'func': 'tree_go_in', 'comment': 'space' }
        }
        if(secondary_key_to_move)
          keys['13'] = { 'func': 'tree_go_next', 'comment': 'enter' };
        else
          keys['13'] = { 'func': 'tree_go_out', 'comment': 'enter' };
        break;
      }
      if(keys)
        _config.auto_keys = Object.assign((_config.auto_keys || {}), keys);
      $inp = $form.find('[name=_switch_forward_key]:checked');
      secondary_key_to_move = $form.find('[name=_switch_secondary_key_move]').prop('checked');
      keys = null;
      switch($inp.val()) {
      case 'enter':
        keys = {
          '13': { 'func': 'tree_go_in', 'comment': 'enter' }
        }
        if(secondary_key_to_move)
          keys['32'] = { 'func': 'tree_go_next', 'comment': 'space' };
        else
          keys['32'] = { 'func': 'tree_go_out', 'comment': 'space' };
        break;
      case 'space':
        keys = {
          '32': { 'func': 'tree_go_in', 'comment': 'space' }
        }
        if(secondary_key_to_move)
          keys['13'] = { 'func': 'tree_go_next', 'comment': 'enter' };
        else
          keys['13'] = { 'func': 'tree_go_out', 'comment': 'enter' };
        break;
      }
      if(keys)
        _config.switch_keys = Object.assign((_config.switch_keys || {}), keys);
    }
    _.each(_voice_id_links, function(alink) {
      var $inp = $form.find('[name='+alink[1]+']');
      if($inp.length == 0)
        return; // skip when not exists
      var propname = (speaku.is_native ? '' : 'alt_') + 'voiceId',
          str = $inp.val();
      if(!_config[alink[0]])
        _config[alink[0]] = {}
      if(str)
        _config[alink[0]][propname] = str;
      else
        delete _config[alink[0]][propname];
    });
    if(!is_quick_setup) {
      if(!$form.find('[name=_cue_first_active]').prop('checked')) {
        _config._auditory_cue_first_run_voice_options =
          _config.auditory_cue_first_run_voice_options;
        delete _config.auditory_cue_first_run_voice_options;
      } else {
        delete _config._auditory_cue_first_run_voice_options;
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
  // console.log(_config)
  var _config_data = JSON.stringify(_config, null, "  ");
  return set_file_data(config_fn, _config_data)
    .then(function() {
      config_data = _config_data
      config = _config
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
  return do_save_config($form, _config, false)
    .then(function() {
      var locale = config.locale;
      var name = $('#tree-default-select').val();
      return get_default_tree(name, locale)
        .then(function(data) {
          return set_file_data(ptree_info.tree_fn, data);
        });
    })
    .then(function() {
      window.location = 'index.html'; // goto pasco
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
  $form.on('change', 'select,input[type=checkbox],input[type=radio]', onchange);
  function onchange() {
    _config_autosave_start_countdown();
  }
}
function _config_autosave_start_countdown() {
  if(window.__config_autosave_timeout)
    clearTimeout(window.__config_autosave_timeout);
  window.__config_autosave_timeout = setTimeout(function() {
    $('form[name=edit-config] button[type=submit]').first().click();
    delete window.__config_autosave_timeout;
  }, 500);
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
$(document).on('input', 'input[type=number],input[type=range]', function() {
  var $elm = $(this);
  if($elm.data('dependent')) {
    var $other = $($elm.data('dependent')),
        val = $elm.val();
    if(typeof val != 'number')
      val = parseFloat(val);
    if(isNaN(val)) {
      return;
    }
    $other.each(function() {
      var lval = val,
          max = this.max ? parseFloat(this.max) : NaN,
          min = this.min ? parseFloat(this.min) : NaN;
      if(!isNaN(max) && lval > max)
        lval = max;
      if(!isNaN(min) && lval < min)
        lval = min;
      this.value = lval;
    });
  }
});

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
    $(element).trigger('input');
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
function _input_info_parse(name, config) {
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
      if(tmp[key] == null)
        tmp[key] = {}; // make an object, simple solution
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
