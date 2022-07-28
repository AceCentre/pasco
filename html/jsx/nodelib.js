import * as SortedArrayFuncs from "sorted-array-functions";

import path from "path";
import $ from "jquery";
import * as uicommon from "./uicommon";
import * as obfutil from "./obfutil";
import scrollnav from 'scrollnav';
import copy from 'copy-html-to-clipboard';
import locales from './data/locales.json'

import DropboxSyncConfigUI from './lib/DropboxSyncConfigUI';
import DropboxSync from './lib/DropboxSync';
import PascoDataState from './lib/PascoDataState';
import PascoFileManager from './lib/PascoFileManager';
import * as common from './common';
import * as exceptions from './exceptions'

{
  for (let key of Object.keys(exceptions)) {
    common[key] = exceptions[key]
  }
}

import './pages'

window.locales_info = {};
for (let locale of locales) {
  window.locales_info[locale.mr.replace('_','-').toLowerCase()] = locale;
}

window.jQuery = window.$ = $;

window.path = path;

window.SortedArrayFuncs = SortedArrayFuncs;
window.scrollnav = scrollnav;
window.copy = copy;

window.NodeLib = {
  obfutil, uicommon, common, DropboxSync, DropboxSyncConfigUI,
  PascoDataState, PascoFileManager,
};
