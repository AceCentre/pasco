import { sortedIndex } from 'lodash'

const _MAX_PREDICTION_CACHE_ENTRIES = 4
let default_instance = null

export default class WordsFileHelper {
  constuctor (fileManager) {
    this._cache = {}
    this._fmanager = fileManager
  }
  /**
   * A single word.
   * @typedef {Object} Word
   * @property {string} v - The word.
   * @property {string} lower - The lowercased word.
   * @property {number} w - The word's weight.
   */

  /**
   * A list of words.
   * @typedef {Object} WordList
   * @property {Array<Word>} words - The words.
   * @property {Map<string,WordList>} [_cache] - A cache that maps
   *   a prefix to a sequence of matching words.
   */

  /**
   * Load the words in a file.
   * @param {string} url - The location of the file.
   * @returns {Promise<WordList>}
   */
  getWords (url) {
    if (this._cache[url]) {
      return this._cache[url]
    }
    return this._cache[url] = this._fmanager.loadFileJson(url)
      .then((data) => {
        // sort words
        data.words = data.words
        // Store the lowercased word.
              .map(w => Object.assign({ lower: (w.v+'').toLowerCase() }, w))
        // Make sure that the words are sorted.
          .sort((a, b) => (a.lower < b.lower ? -1 :
                           a.lower > b.lower ? 1 : 0))
        return data
      })
      .catch((err) => {
        delete words_cache[url]
        throw err
      })
  }
  /**
   * Get all the words with a given input text as a prefix. This
   * search is case-insensitive.
   *
   * @param {string} wordsFile - The location of the words file.
   * @param {string} casedPrefix - The input text.
   *
   * @returns {Promise<WordList>} The matching words.
   * @private
   */
  async getPredictionsFromWords (wordsFile, casedPrefix) {
    let wdata = await this.getWords(wordsFile)
    wdata._cache = wdata._cache || new Map()

    const prefix = casedPrefix.toLowerCase()

    // No prediction if the input text is empty.
    if (!prefix) {
      return { words: [] }
    }

    if (wdata._cache.has(prefix)) {
      return wdata._cache.get(prefix)
    }

    // If necessary, remove the oldest entries in the cache. Maps
    // are ordered in JavaScript, so we can simply delete the first
    // keys first.
    [...wdata._cache.keys()].slice(
      0, 
      // The number of entries that exceed the limit. Technically
      // this should always be 1 at most.
      wdata._cache.size - _MAX_PREDICTION_CACHE_ENTRIES
    ).forEach(k => wdata._cache.delete(k))

    const words = wdata.words

    /**
     * Truncate the word to the same length as the prefix.
     * @param {Word} w - The word.
     * @returns {string} - The substring.
     */
    const sub = w => w.lower.substr(0, prefix.length)

    /**
     * Get the position of the first match, or -1.
     * @returns {number} The index.
     */
    function getStartIndex() {
      const i = sortedIndex(words, { lower: prefix }, sub)
      return sub(words[i]) === prefix ? i : -1
    }

    const startIndex = getStartIndex()
    // TODO: We could use _.takeWhile if we ever replace Underscore
    //   with Lodash.
    let stopIndex = startIndex
    while (words[stopIndex] && sub(words[stopIndex]) === prefix) {
      stopIndex++
    }
    const matches = { words: words.slice(startIndex, stopIndex) }
    wdata._cache.set(prefix, matches)
    return matches
  }
  static getInstance (fileManager) {
    if (default_instance == null) {
      default_instance = new WordsFileHelper(fileManager)
    }
    return default_instance
  }
}

