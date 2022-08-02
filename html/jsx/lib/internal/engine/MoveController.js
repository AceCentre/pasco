import * as EventEmitter from 'events'
import { MoveAbortedException } from '../../../exceptions'

export default class MoveController extends EventEmitter {
  constructor () {
    super()
    this._steps = []
    this._onabort_list = []
    this._can_abort = true
  }
  getSteps () {
    return this._steps
  }
  addStep (callable) {
    this._steps.push(callable)
  }
  getRunPromise () {
    this._runPromise
  }
  setCanAbort (value) {
    this._can_abort = value
    if (this._aborted && this._can_abort) {
      this.emit('abort')
    }
  }
  abort () {
    this._aborted = true
    if (this._can_abort) {
      // emit abort event only if immediate abort is permitted
      this.emit('abort')
    }
  }
  run () {
    if (this._aborted) {
      return Promise.reject(new MoveAbortedException())
    }
    return this._runPromise = new Promise((resolve, reject) => {
      let steps = [].concat(this.getSteps())
      let onStep = async () => {
        if (this._aborted) {
          return // end the exec
        }
        try {
          let callable = steps.shift()
          if (callable) {
            return await callable(this)
          }
        } finally {
          if (steps.length > 0) {
            onStep()
          } else {
            // the move has ended
            resolve()
          }
        }
      }
      this.addListener('abort', () => {
        reject(new MoveAbortedException())
      })
      onStep()
    })
  }
}
