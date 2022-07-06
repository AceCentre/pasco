import { MoveAbortedException } from '../../exceptions'
import { deferredPromise, copyObject } from '../../common'
import MoveController from './MoveController'
import * as delay from 'delay'

export default class MoveManager {
  constructor (engine) {
    this._running_move_controller = null
    this._engine = engine
    this._core = engine.getCore()
    this._speech_synthesizer = this._core.getSpeechSynthesizer()
    this._uibridge = engine.getUIBridge()
  }
  getRunningMoveController () {
    return this._running_move_controller
  }
  async _addMoveToQueue (moveController) {
    let [promise, resolve, reject] = await deferredPromise()
    let onStartMove = async () => {
      try {
        this._running_move_controller = moveController
        await moveController.run()
        resolve()
      } catch (err) {
        reject(err)
      } finally {
        if (this._running_move_controller == moveController) {
          this._running_move_controller = null
        }
      }
    }
    if (this._running_move_controller) {
      let promise = this._running_move_controller.getRunPromise()
      this._running_move_controller.abort()
      if (promise) {
        promise.then(onStartMove, onStartMove)
      } else {
        onStartMove()
      }
    } else {
      onStartMove()
    }
    return promise
  }
  async _performMoveSub (moveController, node, type, override_msg) {
    let onAbort = () => {
      this._speech_synthesizer.stop()
    }
    try {
      let state = this._engine.getState()
      let config = this._engine.getConfig()
      if (state.silent_mode) {
        return
      }
      let opts, audio, text
      switch(type) {
        case 'cue': {
          opts = (config.mode == 'auto' && this._engine.isFirstAutoNextRun() ? config.auditory_cue_first_run_voice_options : null) || config.auditory_cue_voice_options
          audio = node.meta['cue-audio'] || node.meta['audio']
          text = node.meta['auditory-cue'] || node.text
          break;
        }
        case 'main': {
          opts = config.auditory_main_voice_options;
          audio = node.meta['main-audio'] || node.meta['audio']
          text = node.meta['auditory-main'] || node.text;
          break;
        }
      }
      // check for override voice
      let curlocale = node.meta[type + '-locale'] || node.meta['locale'] || this._uibridge.getLocale()
      let locale_voice = (opts.locale_voices || []).find((a) => a.locale == curlocale)
      if (!locale_voice) {
        locale_voice = (opts.locale_voices || []).find((a) => a.locale.split('-')[0] == curlocale.split('-')[0]) 
      }
      // copy options
      opts = copyObject(opts)
      // alt_ options are removed the speech synthesizer
      // the following gaurd is compatibility code for use of alt_voiceId
      // replacing alt_voiceId/voiceId with voice
      {
        if (locale_voice) {
          delete opts.alt_voiceId
          delete opts.voiceId
          opts.voice = locale_voice
        } else {
          opts.voice = { alt_voiceId: opts.alt_voiceId, voiceId: opts.voiceId }
          delete opts.alt_voiceId
          delete opts.voiceId
        }
      }
      if (typeof override_msg == 'string') {
        text = override_msg
        audio = null
      }
      moveController.once('abort', onAbort)
      if (audio) {
        try {
          await this._speech_synthesizer.playAudio(this._core.resolveUrl(audio, tree_fn), opts)
        } catch (err) {
          console.error(err);
          await this._speech_synthesizer.startUtterance(_t("Could not play the input audio"), opts);
        }
      } else if (text) {
        await this._speech_synthesizer.startUtterance(text, opts)
      }
    } finally {
      moveController.removeListener('abort', onAbort)
    }
  }
  async performScanMove (opts) {
    let state = this._engine.getState()
    let config = this._engine.getConfig()
    opts = opts || {}
    let node = this._engine.getCurrentNode()
    if (!node) {
      throw new Error('No node is selected!')
    }
    /**
     *  Having moves in steps is helpful in this case, Since moves will occur
     *  in series and the earlier moves will get aborted
     *  when a new move is added to the queue
     */
    let moveController = new MoveController()
    let mincuetimeout = null
    moveController.addStep(async () => {
      if (config.minimum_cue_time > 0) {
        state.can_move = false;
        mincuetimeout = setTimeout(function () {
          state.can_move = true;
          mincuetimeout = null;
        }, config.minimum_cue_time);
      }
      this._engine.emit('move')
      this._uibridge.updateActivePositions()
      if (opts.delay > 0) {
        await delay(opts.delay)
      }
    })
    moveController.addStep(async () => {
      await this._performMoveSub(moveController, node, 'cue', opts.cue_override_msg)
    })
    try {
      await this._addMoveToQueue(moveController)
    } catch (err) {
      if (!(err instanceof MoveAbortedException)) {
        throw err
      }
    } finally {
      state.can_move = true
      if (mincuetimeout != null) {
        clearTimeout(mincuetimeout)
      }
    }
  }
  async performNotifyMove (notifynode, opts) {
    let state = this._engine.getState()
    opts = opts || {}
    let node = this._engine.getCurrentNode()
    if (!node) {
      throw new Error('No node is selected!')
    }
    let moveController = new MoveController()
    moveController.setCanAbort(false)
    moveController.addStep(async () => {
      state.can_move = false;
      await this._performMoveSub(moveController, notifynode, 'main', opts.main_override_msg)
    })
    moveController.addStep(async () => {
      moveController.setCanAbort(true)
    })
    moveController.addStep(async () => {
      state.can_move = true
      this._engine.emit('move')
      this._uibridge.updateActivePositions()
      if (opts.delay > 0) {
        await delay(opts.delay)
      }
    })
    moveController.addStep(async () => {
      await this._performMoveSub(moveController, node, 'cue', opts.cue_override_msg)
    })
    try {
      await this._addMoveToQueue(moveController)
    } catch (err) {
      if (!(err instanceof MoveAbortedException)) {
        throw err
      }
    } finally {
      state.can_move = true
    }
  }
  async performSelectMove (opts) {
    let state = this._engine.getState()
    opts = opts || {}
    let node = this._engine.getCurrentNode()
    if (!node) {
      throw new Error('No node is selected!')
    }
    let moveController = new MoveController()
    moveController.setCanAbort(false)
    moveController.addStep(async () => {
      this._uibridge.selectNode(node)
      this._uibridge.emit('select', node)
      await this._performMoveSub(moveController, node, 'cue', opts.override_msg)
    })
    try {
      await this._addMoveToQueue(moveController)
    } catch (err) {
      if ((err instanceof MoveAbortedException)) {
        throw err
      }
    } finally {
      state.can_move = true
    }
  }
}
