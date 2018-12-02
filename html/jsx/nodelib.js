import * as SortedArrayFuncs from "sorted-array-functions";
import path from "path";
import $ from "jquery";
import rangeslider from "./rangesliderext";

window.jQuery = window.$ = $;

window.SortedArrayFuncs = SortedArrayFuncs;
window.path = path;

$(() => {
  $('input[type="range"]').each(function () {
    let snap_threshold = 0.05;
    let default_value = this.getAttribute('data-default');
    let has_default_value;
    if (default_value) {
      default_value = parseFloat(default_value);
      if (!isNaN(default_value)) {
        has_default_value = true
      }
    }
    rangeslider.create(this, {
      value: this.value,
      onInit: function (value, perc, position) {
        if (has_default_value) {
          this._default_indicator = document.createElement("div");
          this._default_indicator.classList.add('rangeslider__default_indicator');
          let x = this._getPositionFromValue(default_value);
          this._default_indicator.style.left = (x + this.grabX) + "px";
          this.range.appendChild(this._default_indicator);
        }
      },
      onBeforeSlide: function (value, perc, position) {
        if (has_default_value) {
          let default_percent = (default_value - this.min) / (this.max - this.min);
          if (Math.abs(default_percent - perc) < snap_threshold) {
            this._position = this._getPositionFromValue(default_value);
          }
        }
      }
    });
  })
});
