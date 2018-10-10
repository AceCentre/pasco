'use strict';
const gulp = require('gulp');
const webpack = require('webpack');
const webpackst = require('webpack-stream');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
// const eslint = require('gulp-eslint');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const path = require('path');
const less = require('gulp-less')
const spawn = require('child_process').spawn;

let jsfiles = {};
if (!('NO_NODELIB' in process.env))
  jsfiles.nodelib = './html/jsx/nodelib.js';

function wpdefine_options(is_production) {
  return {
    'process.env.IS_PRODUCTION': JSON.stringify(is_production),
    'process.env.HOST_URL': JSON.stringify(process.env.HOST_URL||"")
  };
}

let webpackConfig = {
  entry: jsfiles,
  performance: { hints: false },
  resolve: {
    modules: [ 'node_modules' ],
    alias: {
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },
};
 
let lessfiles = ['main','edit-config', 'common'];
let lessc_all_cond = ['common'];

[...lessfiles,'all'].forEach((name) => {
  let all = false;
  if (typeof name == 'object') {
    all = name.all;
    name = name.name;
  }
  let files = (name == 'all' ? lessfiles : [name])
      .map((s)=>'html/less/'+s+'.less')
  var running = false;
  gulp.task('lessc-'+name, () => {
    return gulp.src(files)
      .pipe(sourcemaps.init())
      .pipe(less({
        paths: ['html/less']
      }))
      .pipe(sourcemaps.write('../css/'))
      .pipe(gulp.dest('html/css/'));
  });
});

gulp.task('less-watch', gulp.series('lessc-all', () => {
  var watcher = gulp.watch('html/less/**/*.less');
  watcher.on('change', function(event) {
    var name = lessfiles
        .find((s) => event.path.endsWith(s+'.less') ||
              event.path.indexOf(s+'/') != -1);
    if(name && lessc_all_cond.indexOf(name) == -1) {
      gulp.run('lessc-'+name);
    } else {
      gulp.run('lessc-all');
    }
  })
}));

gulp.task('script-lint', function () {
    return gulp.src(['static/jsx/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('build-script-prod', function () {
  return gulp.src('.')
    .pipe(webpackst(Object.assign({}, webpackConfig, {
      output: {
        filename: '[name].min.js',
      },
      mode: 'production',
      devtool: 'source-map',
      plugins: [
        new webpack.DefinePlugin(wpdefine_options(true)),
        new UglifyJsPlugin({
          exclude: /min\.js$/,
          sourceMap: true,
        }),
      ],
    }), webpack))
    .pipe(gulp.dest('html/js/'));
});

gulp.task('build-script-dev', function () {
  return gulp.src('.')
    .pipe(webpackst(Object.assign({}, webpackConfig, {
      output: {
        filename: '[name].js',
      },
      mode: 'development',
      devtool: 'source-map',
      plugins: [
        new webpack.DefinePlugin(wpdefine_options(false)),
      ],
    }), webpack))
    .pipe(gulp.dest('html/js/'));
});

gulp.task('build-script-dev:watch', function () {
  return gulp.src('.')
    .pipe(webpackst(Object.assign({}, webpackConfig, {
      watch: true,
      output: {
        filename: '[name].js',
      },
      mode: 'development',
      devtool: 'source-map',
      plugins: [
        new webpack.DefinePlugin(wpdefine_options(false)),
      ],
    }), webpack))
    .pipe(gulp.dest('html/js/'));
});

var cordova_dist_running = false;
var sh_bin = '/bin/sh';
gulp.task('cordova-dist', gulp.series('lessc-all', 'build-script-dev', (done) => {
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
}));
gulp.task('watch-cordova-dist', gulp.series('cordova-dist', () => {
  var watcher = gulp.watch('html/**/*{.less,.html,.json,.js}');
  watcher.on('change', (event) => {
    gulp.run('cordova-dist');
  });
}));

gulp.task('dev', gulp.series('lessc-all', gulp.parallel('less-watch', 'build-script-dev:watch')));

gulp.task('build-prod', gulp.series(/*'script-lint', */'build-script-prod', 'lessc-all'));
gulp.task('build-dev', gulp.series(/*'script-lint', */'build-script-dev', 'lessc-all'));

gulp.task('default', function (done) {
  console.log(`
   Available commands:
     - lessc-[name]
     - lessc-all
     - script-lint
     - build-script-dev
     - build-script-prod
     - build-script-dev:watch
     - build-prod
     - build-dev
     - dev  (live watch for changes on sass and modular javascript)
`);
  done();
});
