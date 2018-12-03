import RangeSlider from 'rangeslider-js/src/rangeslider';
import utils from 'rangeslider-js/src/utils';
import index from 'rangeslider-js/src/index';

let origSetPosition = RangeSlider.prototype._setPosition;

RangeSlider.prototype._setPosition = function (pos) {
  this._position = pos;
  if (this.options.onBeforeSlide) {
    let value = this.isInteracting ? this._getValueFromPosition(utils.clamp(pos, 0, this.maxHandleX)) : this.value;
    let percent = (value - this.min) / (this.max - this.min);
    this.options.onBeforeSlide.call(this, value, percent, pos);
  }
  pos = this._position;
  delete this._position;
  return origSetPosition.call(this, pos);
}

export default index;

