const gulp = require('gulp')
const webpack = require('webpack')
const webpackst = require('webpack-stream')
// const eslint = require('gulp-eslint')
const sourcemaps = require('gulp-sourcemaps')
const rename = require('gulp-rename')
const path = require('path')
const { spawn, fork } = require('child_process')
const sass = require('gulp-sass')(require('sass'))
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const del = require('del')
const replace = require('gulp-replace')
const filter = require('gulp-filter')
const argv = require('minimist')(process.argv.slice(2));
const browserSync = require('browser-sync').create()

let gulp_bin = path.resolve(__dirname, "./node_modules/.bin/gulp")

let wp_target = ['web']
if (argv['target'] == 'es5') {
  wp_target = ['web', 'es5']
}
let wpbuilds = []

let SRC_DIR = path.join(__dirname, 'src')
let NODE_MODULES_DIR = path.join(__dirname, 'node_modules')

wpbuilds.push({ name: 'main', entry: './src/main.js', dest: './html/webpack' })

class BuildCompilerDoneListenerPlugin {
  apply (compiler) {
    compiler.hooks.done.tap({ name: 'dispatch-compiler-done' }, () => {
      if (BuildCompilerDoneListenerPlugin._listeners) {
        for (let listener of BuildCompilerDoneListenerPlugin._listeners) {
          listener(this, compiler)
        }
      }
    })
  }
  static addListener (listener) {
    if (!BuildCompilerDoneListenerPlugin._listeners) {
      BuildCompilerDoneListenerPlugin._listeners = []
    }
    BuildCompilerDoneListenerPlugin._listeners.push(listener)
  }
}


function wpdefine_options(is_production) {
  return {
    'process.env.IS_PRODUCTION': JSON.stringify(is_production),
    'process.env.PASCO_BACKEND_URL': JSON.stringify(process.env.PASCO_BACKEND_URL || 'https://backend.pasco.chat'),
    'process.env.DROPBOX_APP_KEY': JSON.stringify(process.env.DROPBOX_APP_KEY || ''),
  }
}


gulp.task('script-lint', function () {
    return gulp.src(['src/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
})

function clean_webpack () {
  return del([
    `./html/webpack/**/*`,
    `!./html/webpack/.gitignore`,
  ])
}

function make_build_webpack ({ build_name, env, watch }) {
  let wpbuild = wpbuilds.find((a) => a.name == build_name)
  let is_prod = env == 'production'
  let webpack_build = () => {
    return gulp.src('.')
      .pipe(webpackst({
        entry: wpbuild.entry,
        target: wp_target,
        watch,
        output: {
          filename: `${build_name}.js`,
          assetModuleFilename: '[name]-[hash][ext]',
          chunkFormat: 'array-push',
        },
        mode: env,
        devtool: 'source-map',
        performance: { hints: false },
        resolve: {
          modules: [ 'node_modules' ],
          alias: {
          },
          fallback: {
            'path': require.resolve('path-browserify'),
            'crypto': require.resolve('crypto-browserify'),
            'stream': require.resolve('stream-browserify'),
          },
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              include: [
                SRC_DIR,
                ...[
                  // empty
                ].map((a) => path.resolve(NODE_MODULES_DIR, a)),
              ],
              use: {
                loader: 'babel-loader',
                options: {
                  presets: [['@babel/preset-env', {
                    useBuiltIns: 'usage',
                    corejs: '3.8',
                  }]],
                  plugins: ['@babel/plugin-transform-runtime'],
                },
              },
            },
            // execeptions in modules that need babel-loader run
            {
              test: /\.js$/,
              include: [
                [
                  'delay',
                  'rangeslider-js',
                  'sha256-uint8array',
                ].map((a) => path.resolve(NODE_MODULES_DIR, a))
              ],
              use: {
                loader: 'babel-loader',
                options: {
                  presets: [['@babel/preset-env', { modules: 'commonjs' }]],
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
            filename: `${build_name}.css`,
          }),
          new webpack.DefinePlugin(wpdefine_options(is_prod)),
          new BuildCompilerDoneListenerPlugin(),
        ],
      }, webpack))
      .pipe(gulp.dest(wpbuild.dest))
  }
  return webpack_build
}

gulp.task('copy-webpack-static', () => {
  return gulp.src('static/**/*')
    .pipe(gulp.dest('html/webpack/static/'))
})

gulp.task('clean-webpack', clean_webpack)

{
  let wpbuilders = wpbuilds.map((a) => make_build_webpack({ build_name: a.name, env: 'production' }))
  gulp.task('build-script-prod', gulp.series('clean-webpack', 'copy-webpack-static', ...wpbuilders))
}

{
  let wpbuilders = wpbuilds.map((a) => make_build_webpack({ build_name: a.name, env: 'development' }))
  gulp.task('build-script-dev', gulp.series('clean-webpack', 'copy-webpack-static', ...wpbuilders))
}

{
  let wpbuilders = wpbuilds.map((a) => make_build_webpack({ build_name: a.name, env: 'development', watch: true }))
  gulp.task('build-script-dev:watch', gulp.series('clean-webpack', 'copy-webpack-static', ...wpbuilders))
}

gulp.task('dev', () => {
  let initialBuildCalled = false
  let initialBuild = () => {
    browserSync.init({
      files: [
        './html/**/*',
        '!./html/webpack/**/*'
      ],
      server: {
        baseDir: "./html"
      },
    })
  }
  BuildCompilerDoneListenerPlugin.addListener((plugin, compiler) => {
    if (!initialBuildCalled) {
      initialBuildCalled = true
      initialBuild()
    } else {
      browserSync.reload()
    }
  })
  return gulp.series('build-script-dev:watch')()
})

gulp.task('build-prod', gulp.series(/*'script-lint', */'build-script-prod'))
gulp.task('build-dev', gulp.series(/*'script-lint', */'build-script-dev'))

function get_cordova_build_args () {
  return [ argv['build-name'] ? argv['build-name'] : 'main-build' ]
}

gulp.task('clean-cordova-build', () => {
  let [ build_name ] = get_cordova_build_args()
  return del(`./builds/cordova-${build_name}`)
})

gulp.task('init-cordova-build', () => {
  let [ build_name ] = get_cordova_build_args()
  return gulp.src([
    `./cordova-template/main-build/**/*`,
    build_name != 'main-build' ? `./cordova-template/${build_name}/**/*` : null,
  ].filter((a) => !!a))
    .pipe(gulp.dest(`./builds/cordova-${build_name}`))
})

function cordova_build_clean_www (build_name) {
  return del([
    `./builds/cordova-${build_name}/www/**/*`,
    `!./builds/cordova-${build_name}/www/.gitignore`
  ])
}
function cordova_build_copy_html (build_name) {
  let html_filter = filter(['**/*.html'], {restore: true})
  return gulp.src([
    `./html/**/*`,
  ])
    // filter html files to perform replace on them
    .pipe(html_filter)
    // inject cordova.js
    .pipe(replace('<!-- INJECT CORDOVA SCRIPTS -->', '<script src=\"cordova.js\"></script>'))
    // remove unwanted security policy
    .pipe(replace('ws://localhost:3000', ''))
    // restore the filtered files
    .pipe(html_filter.restore)
    .pipe(gulp.dest(`./builds/cordova-${build_name}/www/`))
}

gulp.task('cordova-build-clean-www', () => {
  let [ build_name ] = get_cordova_build_args()
  return cordova_build_clean_www(build_name)
})
gulp.task('cordova-build-clean-www', () => {
  let [ build_name ] = get_cordova_build_args()
  return cordova_build_copy_html(build_name)
})
gulp.task('dist-to-cordova-build-dev', (done) => {
  let [ build_name ] = get_cordova_build_args()
  return gulp.series([
    'build-dev',
    cordova_build_clean_www.bind(null, build_name),
    cordova_build_copy_html.bind(null, build_name),
  ])(done)
})
gulp.task('dist-to-cordova-build-prod', (done) => {
  let [ build_name ] = get_cordova_build_args()
  let output = gulp.series([
    'build-prod',
    cordova_build_clean_www.bind(null, build_name),
    cordova_build_copy_html.bind(null, build_name),
  ])(done)
})
gulp.task('dist-to-cordova-build-dev-watch', (done) => {
  let [ build_name ] = get_cordova_build_args()
  let update = () => {
    console.log('clean and copy html to cordova-build: ' + build_name)
    gulp.series([ cordova_build_clean_www.bind(null, build_name),
                  cordova_build_copy_html.bind(null, build_name) ])()
  }
  let setNeedsUpdate_timeoutid = null
  let setNeedsUpdate = () => {
    if (setNeedsUpdate_timeoutid != null) {
      clearTimeout(setNeedsUpdate_timeoutid)
    }
    setNeedsUpdate_timeoutid = setTimeout(() => {
      update()
      setNeedsUpdate_timeoutid = null
    }, 1000)
  }
  BuildCompilerDoneListenerPlugin.addListener((plugin, compiler) => {
    setNeedsUpdate(200)
  })
  let watcher = gulp.watch([
    './html/**/*',
    '!./html/**/*#',
    '!./html/**/*~',
    '!./html/webpack/**/*',
  ])
  watcher.on('change', (path, stats) => {
    console.log(`File ${path} was changed`)
    setNeedsUpdate()
  })
  watcher.on('add', (path, stats) => {
    console.log(`File ${path} was added`)
    setNeedsUpdate()
  })
  watcher.on('unlink', (path, stats) => {
    console.log(`File ${path} was removed`)
    setNeedsUpdate()
  })
  return gulp.series('build-script-dev:watch')(done)
})

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
     - clean-cordova-build --build-name <build_name (default: main-build)>
     - init-cordova-build --build-name <build_name (default: main-build)>
     - dist-to-cordova-build-dev-watch --build-name <build_name (default: main-build)>
     - dist-to-cordova-build-dev --build-name <build_name (default: main-build)>
     - dist-to-cordova-build-prod --build-name <build_name (default: main-build)>
     - cordova-build-clean-www --build-name <build_name (default: main-build)>
     - cordova-build-copy-build --build-name <build_name (default: main-build)>

   Other parameters:
     --target es5  # set the webpack target build to es5 (used for older web browsers)
`)
  done()
})
