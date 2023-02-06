import * as fs from 'fs'
import * as path from 'path'
import * as gettextParser from 'gettext-parser'
import PascoTreeMDReader from './PascoTreeMDReader.js'
import PascoTreeMDWriter from './PascoTreeMDWriter.js'

if (process.argv.length != 4) {
  throw new Error('usage: apply-po-translation-on-tree.js <pofile> <tree_file>')
}

let pofile = process.argv[2]
let tree_file = process.argv[3]

main(pofile, tree_file)

async function main (pofile, tree_file) {
  let potxt = (await fs.promises.readFile(pofile)).toString('utf8')
  let podata = gettextParser.po.parse(potxt)
  let translation_list = Object.values(podata.translations['']).filter((a) => !!a.msgid)
  let tree_md = (await fs.promises.readFile(tree_file)).toString('utf8')
  let reader = new PascoTreeMDReader()
  let root_node = reader.readFromText(tree_md)
  _apply_translation(root_node, translation_list)
  let writer = new PascoTreeMDWriter()
  process.stdout.write(writer.writeToText(root_node))
}

function _apply_translation (node, translation_list) {
  if (node.text && node.text.trim()) {
    let translation = translation_list.find((a) => a.msgid == node.text)
    if (translation && translation.msgstr.length > 0 && translation.msgstr[0]) {
      node.text = translation.msgstr[0]
    }
  }
  if (node.meta['auditory-cue'] && node.meta['auditory-cue'].trim()) {
    let translation = translation_list.find((a) => a.msgid == node.meta['auditory-cue'])
    if (translation && translation.msgstr.length > 0 && translation.msgstr[0]) {
      node.meta['auditory-cue'] = translation.msgstr[0]
    }
  }
  if (node.child_nodes) {
    for (let cnode of node.child_nodes) {
      _apply_translation(cnode, translation_list)
    }
  }
}
