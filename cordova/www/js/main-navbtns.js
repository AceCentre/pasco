function navbtns_init() {
  var navbtns_wrp = document.querySelector('#navbtns-wrp'),
      main_outline = document.querySelector('.main-stroke-outline'),
      move_started = false,
      cache = null, down_timeout_ms = 2000;
  resizable_init();
  if(config.nav_pos)
    navbtns_set_position(navbtns_wrp, config.nav_pos);
  if(config.nav_scale > 0)
    navbtns_set_scale(navbtns_wrp, config.nav_scale);
  main_outline.addEventListener('mousedown', function(evt) {
    evt.preventDefault();
    if(!move_started) {
      document.addEventListener('mousemove', onmousemove, true);
      document.addEventListener('mouseup', onmouseup, true);
      move_started = true;
      cache = {
        pos: [ evt.clientX, evt.clientY ],
        offsetLeft: navbtns_wrp.offsetLeft,
        offsetTop: navbtns_wrp.offsetTop,
        offsetWidth: navbtns_wrp.offsetWidth,
        offsetHeight: navbtns_wrp.offsetHeight,
      };
      cache.down_timeout = setTimeout(ondown_timeout, down_timeout_ms);
    }
  }, false);
  function ondown_timeout() {
    if(!cache)
      return;
    if(!cache.end_pos) {
      if(cache.is_touch) {
        onmousecancel();
      } else {
        ontouchcancel();
      }
      toggle_edit();
    } else {
      delete cache.down_timeout;
    }
  }
  function onmousecancel() {
    document.removeEventListener('mousemove', onmousemove, true);
    document.removeEventListener('mouseup', onmouseup, true);
    move_started = false;
    cache = null;
  }
  function onmouseup(evt) {
    if(move_started) {
      evt.preventDefault();
      evt.stopPropagation();
      end();
      move_started = false;
      cache = null;
      document.removeEventListener('mousemove', onmousemove, true);
      document.removeEventListener('mouseup', onmouseup, true);
    }
  }
  function onmousemove(evt) {
    if(move_started) {
      evt.preventDefault();
      evt.stopPropagation();
      var new_pos = [ evt.clientX, evt.clientY ];
      cache.end_pos = move(new_pos[0]-cache.pos[0], new_pos[1]-cache.pos[1]);
    }
  }
  main_outline.addEventListener('touchstart', function(evt) {
    if(evt.touches.length == 1) {
      evt.preventDefault();
      evt.stopPropagation();
      if(!move_started) {
        move_started = true;
        document.addEventListener('touchmove', ontouchmove, true);
        document.addEventListener('touchend', ontouchend, true);
        cache = {
          pos: [ evt.touches[0].clientX, evt.touches[0].clientY ],
          offsetLeft: navbtns_wrp.offsetLeft,
          offsetTop: navbtns_wrp.offsetTop,
          offsetWidth: navbtns_wrp.offsetWidth,
          offsetHeight: navbtns_wrp.offsetHeight,
          is_touch: true
        };
        cache.down_timeout = setTimeout(ondown_timeout, down_timeout_ms);
      }
    }
  }, false);
  function ontouchmove(evt) {
    if(move_started) {
      evt.preventDefault();
      evt.stopPropagation();
      var new_pos = [ evt.touches[0].clientX, evt.touches[0].clientY ];
      cache.end_pos = move(new_pos[0]-cache.pos[0], new_pos[1]-cache.pos[1]);
    }
  }
  function ontouchcancel() {
    document.removeEventListener('touchmove', ontouchmove, true);
    document.removeEventListener('touchend', ontouchend, true);
    move_started = false;
    cache = null;
  }
  function ontouchend(evt) {
    if(move_started) {
      evt.preventDefault();
      evt.stopPropagation();
      end();
      move_started = false;
      cache = null;
      document.removeEventListener('touchmove', ontouchmove, true);
      document.removeEventListener('touchend', ontouchend, true);
    }
  }
  function end() {
    if(cache.down_timeout)
      clearTimeout(cache.down_timeout);
    if(cache.end_pos) {
      autosave({nav_pos: cache.end_pos});
    }
  }
  var autosave_timeout, autosave_running;
  function autosave(change) {
    if(autosave_running)
      return;
    if(autosave_timeout == null)
      clearTimeout(autosave_timeout);
    autosave_timeout = setTimeout(function() {
      delete autosave_timeout;
      autosave_running = true;
      save(change)
        .then(function() {
          autosave_running = false;
        });
    }, 1000);
  }
  function save(change) {
    var _config = JSON.parse(config_json);
    for(var key in change) {
      if(change.hasOwnProperty(key)) {
        if(change[key] == null) {
          delete _config[key];
          delete config[key];
        } else {
          _config[key] = change[key];
          config[key] = change[key];
        }
      }
    }
    return set_file_data(config_fn, JSON.stringify(_config, null, "  "))
      .then(function() {
        config_json = JSON.stringify(_config);
      })
      .catch(handle_error);
  }
  function move(dx, dy) {
    var top = cache.offsetTop + dy,
        right = window.innerWidth - cache.offsetLeft - cache.offsetWidth - dx,
        bottom = window.innerHeight - cache.offsetTop - cache.offsetHeight - dy,
        left = cache.offsetLeft + dx,
        pos = {};
    if(top < bottom)
      pos.top = top; // top
    else
      pos.bottom = bottom; // bottom
    if(right < left)
      pos.right = right; // right
    else
      pos.left = left; // left
    navbtns_set_position(navbtns_wrp, pos);
    return pos;
  }
  var toggle_edit;
  function resizable_init() {
    // resize section
    var edit_wrp = navbtns_wrp.querySelector('.edit-bound'),
        reset_btn = navbtns_wrp.querySelector('.reset-btn'),
        _cache;
    toggle_edit = function(toggle) {
      if(toggle == null) {
        toggle = !!navbtns_wrp.querySelector('.edit-bound').classList.contains('hide');
      }
      navbtns_wrp.querySelector('.edit-bound').classList[toggle?'remove':'add']('hide');
      if(_cache) {
        document.removeEventListener('mouseup', resize_onmouseup, true);
        document.removeEventListener('mousemove', resize_onmousemove, true);
        _cache = null;
      }
      if(toggle) {
        document.addEventListener('mousedown', edit_onmousedown, false);
        document.addEventListener('touchstart', edit_ontouchstart, false);
      } else {
        document.removeEventListener('mousedown', edit_onmousedown, false);
        document.removeEventListener('touchstart', edit_ontouchstart, false);
      }
    }
    navbtns_wrp._scale_end = config.nav_scale;
    reset_btn.addEventListener('click', function(evt) {
      navbtns_wrp._scale_end = 1;
      reset_btn.disabled = true;
      navbtns_set_position(navbtns_wrp, null);
      navbtns_set_scale(navbtns_wrp, 1.0);
      toggle_edit(false);
      save({
        nav_scale: 1,
        nav_pos: null
      })
        .then(function() { reset_btn.disabled = false; },
              function() { reset_btn.disabled = false; })
        .catch(handle_error);
    });
    reset_btn.addEventListener('mousedown', function(evt) {
      evt.stopPropagation();
    }, true);
    reset_btn.addEventListener('touchstart', function(evt) {
      evt.stopPropagation();
    }, true);
    function edit_onmousedown(evt) {
      if(_cache)
        return;
      evt.preventDefault();
      _cache = {};
      var elm = evt.target;
      if(elm.classList.contains('dot'))
        elm = elm.parentNode;
      var foundclasses = _.filter(elm.classList, function(a){return a.indexOf('resize-') == 0});
      document.addEventListener('mouseup', resize_onmouseup, true);
      if(foundclasses.length > 0) {
        var dir = foundclasses[0].substr('resize-'.length, 2);
        var rect = navbtns_wrp.getBoundingClientRect();
        _cache.rect = rect;
        _cache.resize = true;
        _cache.dir = dir;
        _cache.move_pos = [evt.clientX, evt.clientY];
        document.addEventListener('mousemove', resize_onmousemove, true);
      } else {
        _cache.down_timeout = setTimeout(edit_ondown_timeout, down_timeout_ms);
      }
    }
    function edit_ontouchstart(evt) {
      if(_cache)
        return;
      if(evt.touches.length == 1) {
        evt.preventDefault();
        _cache = {};
        var elm = evt.touches[0].target;
        if(elm.classList.contains('dot'))
          elm = elm.parentNode;
        var foundclasses = _.filter(elm.classList, function(a){return a.indexOf('resize-') == 0});
        if(foundclasses.length > 0) {
          var dir = foundclasses[0].substr('resize-'.length, 2);
          var rect = navbtns_wrp.getBoundingClientRect();
          _cache.rect = rect;
          _cache.resize = true;
          _cache.dir = dir;
          _cache.move_pos = [evt.touches[0].clientX, evt.touches[0].clientY];
          document.addEventListener('touchend', resize_ontouchend, true);
          document.addEventListener('touchmove', resize_ontouchmove, true);
        } else {
          _cache.down_timeout = setTimeout(edit_ondown_timeout, down_timeout_ms);
        }
      }
    }
    function edit_ondown_timeout() {
      if(!_cache)
        return;
      toggle_edit(false);
    }
    function resize_onmouseup(evt) {
      if(!_cache)
        return;
      evt.preventDefault();
      if(_cache.down_timeout)
        clearTimeout(_cache.down_timeout);
      if(_cache.resize) {
        document.removeEventListener('mouseup', resize_onmouseup, true);
        document.removeEventListener('mousemove', resize_onmousemove, true);
      }
      resize_onend();
      _cache = null;
    }
    function resize_ontouchend(evt) {
      if(!_cache)
        return;
      evt.preventDefault();
      if(_cache.down_timeout)
        clearTimeout(_cache.down_timeout);
      if(_cache.resize) {
        document.removeEventListener('touchend', resize_ontouchend, true);
        document.removeEventListener('touchmove', resize_ontouchmove, true);
      }
      resize_onend();
      _cache = null;
    }
    function resize_onmousemove(evt) {
      if(_cache.resize) {
        evt.preventDefault();
        var new_move = [evt.clientX, evt.clientY];
        resize_onmove(_cache.dir, new_move[0]-_cache.move_pos[0], new_move[1]-_cache.move_pos[1]);
      }
    }
    function resize_ontouchmove(evt) {
      if(_cache.resize) {
        evt.preventDefault();
        var new_move = [evt.touches[0].clientX, evt.touches[0].clientY];
        resize_onmove(_cache.dir, new_move[0]-_cache.move_pos[0], new_move[1]-_cache.move_pos[1]);
      }
    }
    function resize_onmove(dir, dx, dy) {
      if(_cache && _cache.resize) {
        var start_diagonal = Math.sqrt(_cache.rect.width*_cache.rect.width +
                                       _cache.rect.height*_cache.rect.height),
            new_width = _cache.rect.width,
            new_height = _cache.rect.height,
            scale = 0.2;
        switch(dir) {
        case 'tl':
          new_width -= dx*2;
          new_height -= dy*2;
          break;
        case 'tr':
          new_width += dx*2;
          new_height -= dy*2;
          break;
        case 'br':
          new_width += dx*2;
          new_height += dy*2;
          break;
        case 'bl':
          new_width -= dx*2;
          new_height += dy*2;
          break;
        }
        if(new_width > 0 && new_height > 0) {
          var new_diagonal = Math.sqrt(new_width*new_width +
                                       new_height*new_height);
          scale = Math.max(scale, new_diagonal/start_diagonal*(navbtns_wrp._scale_end||1));
        }
        _cache.scale = scale;
        navbtns_set_scale(navbtns_wrp, scale);
      }
    }
    function resize_onend() {
      if(_cache.resize && _cache.scale > 0) {
        navbtns_wrp._scale_end = _cache.scale;
        autosave({nav_scale: _cache.scale});
      }
    }
  }
}
function navbtns_set_scale(elm, scale) {
  elm.style.transform = 'scale('+scale.toFixed(2)+')';
  elm._scale = scale;
  var edit_elm = elm.querySelector('.edit-bound');
  if(edit_elm) {
    var divs = edit_elm.querySelectorAll(':scope > div');
    var iscale = 1/scale;
    _.each(divs, function(div) {
      var foundclasses = _.filter(div.classList, function(a){return a.indexOf('resize-') == 0});
      if(foundclasses.length>0) {
        var dir = foundclasses[0].substr('resize-'.length, 2);
        var move_str = '', scale_str = 'scale('+iscale.toFixed(2)+')';
        switch(dir) {
        case 'tr':
          move_str = 'translate(50%, -50%)';
          break;
        case 'tl':
          move_str = 'translate(-50%, -50%)';
          break;
        case 'br':
          move_str = 'translate(50%, 50%)';
          break;
        case 'bl':
          move_str = 'translate(-50%, 50%)';
          break;
        }
        div.style.transform = move_str + ' ' + scale_str;
      }
    });
  }
}
function navbtns_set_position(elm, pos) {
  pos = pos||{};
  if(pos.top != null) {
    elm.style.top = pos.top + 'px';
    elm.style.bottom = 'initial';
  } else if(pos.bottom != null) {
    elm.style.bottom = pos.bottom + 'px';
    elm.style.top = 'initial';
  } else {
    elm.style.top = '';
    elm.style.bottom = '';
  }
  if(pos.left != null) {
    elm.style.left = pos.left + 'px';
    elm.style.right = 'initial';
  } else if(pos.right != null) {
    elm.style.right = pos.right + 'px';
    elm.style.left = 'initial';
  } else {
    elm.style.right = '';
    elm.style.left = '';
  }
}
