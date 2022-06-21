import BaseModule from './BaseModule'
import WordsFileHelper from '../../helpers/WordsFileHelper'
import PascoTreeNode from '../PascoTreeNode'
import _ from 'underscore'

function mk_words_weight_cmp (asc) {
  var mul = asc ? 1 : -1
  return (a, b) => {
    return mul * (a.w - b.w)
  }
}

export class SpellWordPredictionModule extends BaseModule {
  constructor (pascoEngine) {
    this._pengine = pascoEngine
    this._core = pascoEngine.getCore()
    this._fmanager = this._core.getFileManager()
    this._wordsFileHelper = WordsFileHelper.getInstance(this._fmanager)
  }
  getName () {
    return 'spell-word-prediction'
  }
  generate (dynnode) {
    let words_file
    if (dynnode.meta['words-file']) {
      words_file = this._core.resolveFileUrl(dynnode.meta['words-file'], tree_fn)
    } else if (config.words_file) {
      words_file = this._core.resolveFileUrl(config.words_file, config_fn)
    }
    if (!words_file) {
      throw new Error("No words file given for dyn=\"spell-word-prediction\"")
    }
    let txt = this._pengine.getCurrentSpellWord()
    let max_nodes = dynnode.meta['max-nodes'] || 3
    let nchars = parseInt(dynnode.meta['predict-after-n-chars'])
    if (!isNaN(nchars) && txt.length < nchars) {
      return { nodes: [] }
    }
    let subwdata = await this._wordsFileHelper.getPredictionsFromWords(words_file, txt)
    if (!subwdata.words_sorted) {
      subwdata.words_sorted = [].concat(subwdata.words)
      subwdata.words_sorted.sort(mk_words_weight_cmp(false))
    }
    return {
      nodes: _.map(subwdata.words_sorted.slice(0, max_nodes), (word) => {
        return new PascoTreeNode({
          text: word.v,
          meta: {
            'spell-word': word.v,
            'spell-finish': dynnode.meta['spell-finish'],
          }
        })
      }),
    }
  }
}
