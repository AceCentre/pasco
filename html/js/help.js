window.help_files = {
  'en': 'help.html',
  'es-ES': 'help/es-ES.html'
};
Promise.all([
  window.cordova ? NativeAccessApi.onready() : Promise.resolve(),
  new Promise(function(resolve) { // domready
    document.addEventListener('DOMContentLoaded', function() {
      document.removeEventListener('DOMContentLoaded', arguments.callee, false);
      resolve();
    }, false);
  })
])
  .then(initialize_app)
  .then(function() { return get_file_json(default_config); })
  .then(function(config) {
    var locale = config.locale||default_locale;

    var help_file = help_files[locale];
    if (!help_file) {
      help_file = help_files[locale.split('-')[0]];
    }

    if (help_file) {
      var atag = newEl('a');
      atag.setAttribute('href', help_file);
      if (atag.href+'' != location.href+'') {
        location.href = atag.href;
      }
    }
    
    return initl10n(locale);
  })
  .then(function() {
    domlocalize();
    document.body.classList.remove('notready');
    var tocwrp = document.querySelector('#tocwrp');
    if (tocwrp) {
      var root_list = generate_toc(document.body, {
        start_level: 2,
        list_type_map: { 2: 'ol' },
      });
      if(root_list) {
        tocwrp.appendChild(root_list);
      }
    }
  })
  .catch(function(err) {
    console.error(err);
    console.warn("Could not find file for l10n " + config.locale||default_locale);
    document.body.style.display = '';
  });


function generate_toc (element, options) {
  options = options || {};
  var start_level = Math.max(1, options.start_level || 1);
  var end_level = Math.min(6, options.end_level || 6);
  if (end_level < start_level) {
    throw new Error('Ending heading level must be greater than or equal to starting header level');
  }
  var list_type_map = options.list_type_map || {};
  var levels = [];
  for (var headerNumber = start_level; headerNumber <= end_level; headerNumber++) {
    levels.push('h' + headerNumber);
  }
  var toc_lists = [];
  var headers = element.querySelectorAll(levels.join(','));
  _.each(headers, function (header) {
    var hlevel = parseInt(header.nodeName.substr(1)),
        hindex = hlevel - start_level;
    for (var i = 0; i <= hindex; i++) {
      if (toc_lists.length <= i) {
        var list = newEl(list_type_map[i + start_level] || 'ul');
        if (i > 0) {
          if (toc_lists[i-1].childNodes.length > 0) {
            var tmp = toc_lists[i-1];
            tmp.childNodes[tmp.childNodes.length-1].appendChild(list);
          } else {
            var li = newEl('li');
            li.appendChild(list);
            toc_lists[i-1].appendChild(li);
          }
        }
        toc_lists.push(list)
      }
    }
    if (toc_lists.length > hindex + 1) {
      toc_lists.splice(hindex + 1, toc_lists.length - hindex - 1)
    }
    var li = newEl('li'),
        a = newEl('a'),
        target_anchor = header.querySelector('a.anchor');
    a.href = '#' + (header.id || (target_anchor ? target_anchor.name : ''));
    a.textContent = header.textContent;
    li.appendChild(a);
    toc_lists[hindex].appendChild(li);
  });
  if (toc_lists.length > 0) {
    return toc_lists[0];
  }
  return null;
}
