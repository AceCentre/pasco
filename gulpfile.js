const less = require('gulp-less')
const path = require('path')
const gulp = require('gulp')
const sourcemaps = require('gulp-sourcemaps')
const spawn = require('child_process').spawn;
 
let lessfiles = ['main','edit-config','cordova'];

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
        .find((s) => event.path.endsWith(s+'.less') ||
              event.path.indexOf(s+'/') != -1);
    if(name) {
      gulp.run('lessc-'+name);
    } else {
      gulp.run('lessc-all');
    }
  })
});
var cordova_dist_running = false;
var sh_bin = '/bin/sh';
gulp.task('cordova-dist', ['lessc-all'], (done) => {
  if(cordova_dist_running)
    return done();
  cordova_dist_running = true;
  var chp = spawn(sh_bin, [ __dirname + '/scripts/push-cordova', __dirname + '/cordova/www/' ]);
  chp.on('exit', (code) => {
    cordova_dist_running = false;
    if(code == 0) {
      done();
    } else {
      throw new Error("push-cordova output code " + code);
    }
  });
});
gulp.task('watch-cordova-dist', ['cordova-dist'], () => {
  var watcher = gulp.watch('html/**/*{.less,.html,.json,.js}');
  watcher.on('change', (event) => {
    gulp.run('cordova-dist');
  });
});
