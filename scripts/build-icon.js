const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const DIR = path.dirname(path.dirname(__filename))
const ICON_DIR = path.join(DIR, 'res', 'generated-icons')
const RES_DIR = path.join(DIR, 'res')

const CONVERT_EXEC = 'convert'
const INKSCAPE_EXEC = 'inkscape'
const PNG2ICNS_EXEC = 'png2icns'

async function main () {
  let icon_svg_file = path.join(RES_DIR, 'ear.svg')
  let export_list = [
    [ 16, 'ear-16x16.png' ],
    [ 32, 'ear-32x32.png' ],
    [ 48, 'ear-48x48.png' ],
    [ 128, 'ear-128x128.png' ],
    // [ 256, 'ear-256x256.png' ],
    // [ 512, 'ear-512x512.png' ],
  ]
  for (let [ size, png_name ] of export_list) {
    await simpleSpawn(INKSCAPE_EXEC, [  '-w', size+'', '-h', size+'', '--export-overwrite', '-o', path.join(ICON_DIR, png_name), icon_svg_file ])
  }
  // convert to icns (NO NEED for icns)
  // await simpleSpawn(PNG2ICNS_EXEC, [ path.join(ICON_DIR, 'icon.icns'), path.join (ICON_DIR, '512x512.png') ])
  // favicon.ico
  await simpleSpawn(CONVERT_EXEC, [ ...[ '16x16.png', '32x32.png', '48x48.png', '128x128.png' ].map((a) => path.join(ICON_DIR, 'ear-' + a)), path.join(ICON_DIR, 'favicon.ico') ])
}

main()

function simpleSpawn (...args) {
  return new Promise((resolve, reject) => {
    if (!args[2]) {
      args[2] = {}
    }
    console.log('exec: ', args[0], args[1].join(' '))
    let proc = spawn(...args)
    let outbuff = []
    let errbuff = []
    proc.stdout.on('data', (data) => {
      outbuff.push(data)
    })
    proc.stderr.on('data', (data) => {
      errbuff.push(data)
    })
    proc.on('error', (err) => reject(err))
    proc.on('exit', (code) => {
      let output = Buffer.concat(outbuff).toString('utf8')
      let error = Buffer.concat(errbuff).toString('utf8')
      if (code == 0) {
        resolve({ code, output, error })
      } else {
        let rerr = new Error('Exec failure, exit code: ' + code + ', \n\n' + error)
        rerr.args = args
        rerr.output = output
        rerr.error = error
        reject(rerr)
      }
    })
  })
}
