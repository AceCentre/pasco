import BaseModule from './BaseModule'
import WordsFileHelper from '../../helpers/WordsFileHelper'
import PascoNode from '../PascoNode'

function mk_words_weight_cmp (asc) {
  var mul = asc ? 1 : -1
  return (a, b) => {
    return mul * (a.w - b.w)
  }
}

export default class SpellWordPredictionModule extends BaseModule {
  constructor (pascoEngine) {
    super()
    this._pengine = pascoEngine
    this._core = pascoEngine.getCore()
    this._fmanager = this._core.getFileManager()
    this._wordsFileHelper = WordsFileHelper.getInstance(this._fmanager)
  }
  getName () {
    return 'spell-word-prediction'
  }
  async generate (dynnode) {
    let config = this._pengine.getConfig()
    let words_file
    if (dynnode.meta['words-file']) {
      words_file = this._core.resolveUrl(dynnode.meta['words-file'], this._pengine.getTreeUrl())
    } else if (config.words_file) {
      words_file = this._core.resolveUrl(config.words_file, this._pengine.getConfigUrl())
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
      nodes: subwdata.words_sorted.slice(0, max_nodes).map((word) => {
        return new PascoNode({
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
