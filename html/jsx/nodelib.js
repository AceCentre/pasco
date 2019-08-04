import * as SortedArrayFuncs from "sorted-array-functions";
import path from "path";
import $ from "jquery";
import uicommon from "./uicommon";
import * as obfutil from "./obfutil";
import scrollnav from 'scrollnav';
import copy from 'copy-html-to-clipboard';

window.jQuery = window.$ = $;

window.path = path;

window.SortedArrayFuncs = SortedArrayFuncs;
window.scrollnav = scrollnav;
window.copy = copy;

window.NodeLib = { obfutil };
