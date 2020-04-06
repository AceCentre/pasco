import * as SortedArrayFuncs from "sorted-array-functions";
import path from "path";
import $ from "jquery";
import uicommon from "./uicommon";
import * as obfutil from "./obfutil";
import scrollnav from 'scrollnav';
import copy from 'copy-html-to-clipboard';
import locales from './data/locales.json'

window.locales_info = {};
for (let locale of locales) {
  window.locales_info[locale.mr.replace('_','-').toLowerCase()] = locale;
}

window.jQuery = window.$ = $;

window.path = path;

window.SortedArrayFuncs = SortedArrayFuncs;
window.scrollnav = scrollnav;
window.copy = copy;

window.NodeLib = { obfutil };
