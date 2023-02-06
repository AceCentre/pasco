import * as fs from 'fs'
import * as path from 'path'
import * as gettextParser from 'gettext-parser'
import PascoTreeMDReader from './PascoTreeMDReader.js'
import PascoTreeMDWriter from './PascoTreeMDWriter.js'
import translate from '@vitalets/google-translate-api'

if (process.argv.length != 5) {
  throw new Error('usage: google-translate-pofile.js <pofile> <target_lang> <outputpo>')
}

let pofile = process.argv[2]
let target_lang = process.argv[3]
let output_po_file = process.argv[4]

main(pofile, target_lang, output_po_file, output_po_file)

async function main (pofile, target_lang) {
  let potxt = (await fs.promises.readFile(pofile)).toString('utf8')
  let podata = gettextParser.po.parse(potxt)
  let translation_list = Object.values(podata.translations['']).filter((a) => !!a.msgid)
  for (let translation of translation_list) {
    if (translation['msgid']) {
      try {
        console.log('translate', translation['msgid'], { to: target_lang })
        let res = await translate(translation['msgid'], { to: target_lang })
        console.log('translation: ', res.text)
        translation['msgstr'] = [res.text]
      } catch (err) {
        console.error(err)
      }
    }
  }
  await fs.promises.writeFile(output_po_file, gettextParser.po.compile(podata))
}
