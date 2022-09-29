import * as fs from 'fs'
import * as path from 'path'
import * as gettextParser from 'gettext-parser'
import PascoTreeMDReader from './PascoTreeMDReader.js'
import PascoTreeMDWriter from './PascoTreeMDWriter.js'

if (process.argv.length != 3) {
  throw new Error('usage: po-file-from-tree.js <tree_file>')
}

let tree_file = process.argv[2]

main(tree_file)

async function main (tree_file) {
  let tree_md = (await fs.promises.readFile(tree_file)).toString('utf8')
  let reader = new PascoTreeMDReader()
  let root_node = reader.readFromText(tree_md)
  let text_list = []
  _add_node(root_node, text_list)
  let data = {
    "charset": "utf8",
    "headers": {
      "content-type": "text/plain; charset=utf8",
    },
    "translations": {
      "": {
        "": {
          "msgid": "",
          "msgstr": ["Content-Type: text/plain; charset=utf8\n..."]
        },
      }
    }
  }
  for (let entry of text_list) {
    data.translations[''][entry.text] = {
      msgid: entry.text,
      msgstr: [],
    }
  }
  process.stdout.write(gettextParser.po.compile(data))
}

function _add_node (node, text_list) {
  if (node.text && node.text.trim()) {
    let found = text_list.find((a) => a.text == node.text)
    if (!found) {
      text_list.push({ text: node.text })
    }
  }
  if (node.meta['auditory-cue'] && node.meta['auditory-cue'].trim()) {
    let found = text_list.find((a) => a.text == node.meta['auditory-cue'])
    if (!found) {
      text_list.push({ text: node.meta['auditory-cue'] })
    }
  }
  if (node.child_nodes) {
    for (let cnode of node.child_nodes) {
      _add_node(cnode, text_list)
    }
  }
}
