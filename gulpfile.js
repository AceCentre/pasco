const less = require('gulp-less')
const path = require('path')
const gulp = require('gulp')
const sourcemaps = require('gulp-sourcemaps')
 
let lessfiles = ['main'];

[...lessfiles,'all'].forEach((name) => {
  let files = (name == 'all' ? lessfiles : [name])
      .map((s)=>'html/less/'+s+'.less')
  gulp.task('lessc-'+name, () => {
    return gulp.src(files)
      .pipe(sourcemaps.init())
      .pipe(less({
        paths: ['html/less']
      }))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('html/css/'));
  });
});

gulp.task('less-watch', ['lessc-all'], () => {
  var watcher = gulp.watch('html/less/**/*.less');
  watcher.on('change', function(event) {
    var name = lessfiles
        .find((s) => event.path.indexOf(s+'.less') != -1 ||
              event.path.indexOf(s+'/') != -1);
    if(name) {
      gulp.run('lessc-'+name);
    }
  })
});

