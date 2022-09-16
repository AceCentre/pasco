import BaseModule from './BaseModule'
import WordsFileHelper from '../../helpers/WordsFileHelper'
import PascoNode from '../PascoNode'
import { range } from '../../helpers/common'

export default class SpellLetterPredictionModule extends BaseModule {
  constructor (pascoEngine) {
    super()
    this._pengine = pascoEngine
    this._core = pascoEngine.getCore()
    this._fmanager = this._core.getFileManager()
    this._wordsFileHelper = WordsFileHelper.getInstance(this._fmanager)
  }
  getName () {
    return 'spell-letter-prediction'
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
    let alphabet = dynnode.meta['alphabet'] || config.alphabet ||
        'abcdefghijklmnopqrstuvwxyz'
    let txt = this._pengine.getCurrentSpellWord()
    let nchars = parseInt(dynnode.meta['predict-after-n-chars'])
    if (typeof alphabet == 'string') {
      if (alphabet.indexOf(',') != -1) {
        alphabet = alphabet.split(',')
      } else {
        alphabet.split('')
      }
    }
    if (!isNaN(nchars) && txt.length < nchars) {
      return { nodes: [] }
    }
    let subwdata = await this._wordsFileHelper.getPredictionsFromWords(words_file, txt)
    if (!subwdata.alphabet_sorted) {
      subwdata.alphabet_sorted = range(alphabet.length)
        .map((i) => {
          let a = alphabet[i]
          return [
            a, i,
            subwdata.words
              .filter((w) => w.v[txt.length] == a)
              .map((a) => a.w)
              .reduce((a, b) => a + b, 0)
          ]
        })
        .sort((a, b) => { // sort desc order by weight, letter
          if (a[2] == b[2]) {
            if(a[1] < b[1]) {
              return -1
            }
            if(a[1] > b[1]) {
              return 1
            }
            return 0
          }
          return b[2] - a[2]
        })
    }
    return {
      nodes: subwdata.alphabet_sorted.map((v) => {
        return new PascoNode({ text: v[0] })
      }),
    }
  }
}


