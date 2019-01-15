import * as SortedArrayFuncs from "sorted-array-functions";
import path from "path";
import $ from "jquery";
import uicommon from "./uicommon";
import * as obfutil from "./obfutil";

window.jQuery = window.$ = $;

window.SortedArrayFuncs = SortedArrayFuncs;
window.path = path;

window.NodeLib = { obfutil };
