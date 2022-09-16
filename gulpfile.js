'use strict';
const gulp = require('gulp');
const webpack = require('webpack');
const webpackst = require('webpack-stream');
// const eslint = require('gulp-eslint');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const path = require('path');
const { spawn, fork } = require('child_process');
const sass = require('gulp-sass')(require('sass'));
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

let gulp_bin = path.resolve(__dirname, "./node_modules/.bin/gulp");

let wpbuilds = []

wpbuilds.push({ name: 'main', entry: './src/main.js', dest: './html/webpack', css_filename: 'main.css' })

function wpdefine_options(is_production) {
  return {
    'process.env.IS_PRODUCTION': JSON.stringify(is_production),
    'process.env.PASCO_BACKEND_URL': JSON.stringify(process.env.PASCO_BACKEND_URL || 'https://backend.pasco.chat'),
    'process.env.DROPBOX_APP_KEY': JSON.stringify(process.env.DROPBOX_APP_KEY || ''),
  };
}


gulp.task('script-lint', function () {
    return gulp.src(['src/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

function make_build_webpack ({ build_name, env, watch }) {
  let wpbuild = wpbuilds.find((a) => a.name == build_name)
  let is_prod = env == 'production'
  return () => {
    return gulp.src('.')
      .pipe(webpackst({
        entry: wpbuild.entry,
        watch,
        output: {
          filename: `${wpbuild.name}.js`,
          assetModuleFilename: '[name]-[hash][ext]'
        },
        mode: env,
        devtool: 'source-map',
        performance: { hints: false },
        resolve: {
          modules: [ 'node_modules' ],
          alias: {
          },
          fallback: {
            'path': require.resolve('path-browserify')
          },
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              exclude: /(node_modules)/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env'],
                  plugins: ['@babel/plugin-transform-runtime'],
                },
              },
            },
            { // rules for sass/css files
              test: /\.s[ac]ss$/i,
              use: [
                is_prod ? MiniCssExtractPlugin.loader : 'style-loader',
                'css-loader',
                'sass-loader',
              ],
            },
          ],
        },
        plugins: [
          new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
          }),
          new MiniCssExtractPlugin({
            filename: wpbuild.css_filename,
          }),
          new webpack.DefinePlugin(wpdefine_options(is_prod)),
        ],
      }, webpack))
      .pipe(gulp.dest(wpbuild.dest));
  }
}

gulp.task('copy-webpack-static', () => {
  return gulp.src('static/**/*')
    .pipe(gulp.dest('html/webpack/static/'))
})

{
  let wpbuilders = wpbuilds.map((a) => make_build_webpack({ build_name: a.name, env: 'production' }))
  gulp.task('build-script-prod', gulp.series('copy-webpack-static', ...wpbuilders))
}

{
  let wpbuilders = wpbuilds.map((a) => make_build_webpack({ build_name: a.name, env: 'development' }))
  gulp.task('build-script-dev', gulp.series('copy-webpack-static', ...wpbuilders))
}

{
  let wpbuilders = wpbuilds.map((a) => make_build_webpack({ build_name: a.name, env: 'development', watch: true }))
  gulp.task('build-script-dev:watch', gulp.series('copy-webpack-static', ...wpbuilders))
}

var cordova_dist_running = false;
var sh_bin = '/bin/sh';
gulp.task('cordova-dist', gulp.series('build-script-dev', (done) => {
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
  var watcher = gulp.watch('html/**/*{.css,.html,.json,.js}');
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

gulp.task('dev', gulp.series('build-script-dev:watch'));

gulp.task('build-prod', gulp.series(/*'script-lint', */'build-script-prod'));
gulp.task('build-dev', gulp.series(/*'script-lint', */'build-script-dev'));

gulp.task('default', function (done) {
  console.log(`
   Available commands:
     - script-lint
     - build-script-dev
     - build-script-prod
     - build-script-dev:watch
     - build-prod
     - build-dev
     - dev  (run with webpack watch)
`);
  done();
});
