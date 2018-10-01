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
  })
  .catch(function() {
    console.warn("Could not find file for l10n " + config.locale||default_locale);
    document.body.style.display = '';
  });
