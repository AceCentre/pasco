'use strict';
const gulp = require('gulp');
const webpack = require('webpack');
const webpackst = require('webpack-stream');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
// const eslint = require('gulp-eslint');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const path = require('path');
const { spawn, fork } = require('child_process');
const sass = require('gulp-sass');
const packageImporter = require('node-sass-package-importer');
sass.compiler = require('node-sass');

let gulp_bin = path.resolve(__dirname, "./node_modules/.bin/gulp");

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

let sassfiles = ['main','edit-config', 'common'];

[...sassfiles,'all'].forEach((name) => {
  let all = false;
  if (typeof name == 'object') {
    all = name.all;
    name = name.name;
  }
  let files = (name == 'all' ? sassfiles : [name])
      .map((s)=>'html/scss/'+s+'.scss')
  var running = false;
  gulp.task('sass-'+name, () => {
    return gulp.src(files)
      .pipe(sourcemaps.init())
      .pipe(
        sass({
          importer: packageImporter(),
        })
          .on('error', sass.logError)
      )
      .pipe(sourcemaps.write('../css/'))
      .pipe(gulp.dest('html/css/'));
  });
});

gulp.task('sass-watch', gulp.series('sass-all', () => {
  var watcher = gulp.watch('html/scss/**/*.scss');
  watcher.on('change', function(event) {
    var chp = fork(gulp_bin, [ 'sass-all' ]);
    chp.on('exit', (code) => {
      cordova_dist_running = false;
      if(code != 0) {
        throw new Error("gulp sass-" + name + " output code " + code);
      }
    });
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
        filename: '[name].js',
      },
      mode: 'production',
      devtool: 'source-map',
      plugins: [
        new webpack.DefinePlugin(wpdefine_options(true)),
        new UglifyJsPlugin({
          exclude: /(min\.js|nodelib\.js)$/,
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
gulp.task('cordova-dist', gulp.series('sass-all', 'build-script-dev', (done) => {
  var chp = spawn(sh_bin, [ __dirname + '/scripts/push-cordova' ]);
  chp.on('exit', (code) => {
    if(code == 0) {
      done();
    } else {
      throw new Error("push-cordova output code " + code);
    }
  });
}));

gulp.task('watch-cordova-dist', gulp.series('cordova-dist', () => {
  var watcher = gulp.watch('html/**/*{.scss,.html,.json,.js}');
  watcher.on('change', (event) => {
    if (cordova_dist_running) {
      return;
    }
    cordova_dist_running = true;
    var chp = fork(gulp_bin, [ 'cordova-dist' ]);
    chp.on('exit', (code) => {
      cordova_dist_running = false;
      if(code != 0) {
        throw new Error("push-cordova output code " + code);
      }
    });
  });
}));

gulp.task('dev', gulp.series('sass-all', gulp.parallel('sass-watch', 'build-script-dev:watch')));

gulp.task('build-prod', gulp.series(/*'script-lint', */'build-script-prod', 'sass-all'));
gulp.task('build-dev', gulp.series(/*'script-lint', */'build-script-dev', 'sass-all'));

gulp.task('default', function (done) {
  console.log(`
   Available commands:
     - sass-[name]
     - sass-all
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
