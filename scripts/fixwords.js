const fs = require("fs");

if (process.argv.length != 4) {
  console.log("Usage: fixwords.js <src/words.json> <dest/fixedwords.json>");
  process.exit(1);
}

let src = process.argv[2];
let dest = process.argv[3];

let data = JSON.parse(fs.readFileSync(process.argv[2]));

function words_cmp (a, b) {
  if(a.v < b.v) {
    return -1
  }
  if(a.v > b.v) {
    return 1
  }
  return 0
}

var words = data.words;
// verify words is sorted
var notsorted = false;
for (var i = 0; i + 1 < words.length; i++) {
  var w0 = words[i].v, w1 = words[i+1].v;
  if (words_cmp(w0, w1) > 0) {
    notsorted = true;
    break;
  }
}
// if not, sort it
if (!notsorted) {
  words.sort(words_cmp);
}
var _exists = {
  "": true,
};
for (var i = 0; i < words.length;) {
  if (_exists[words[i].v]) {
    words.splice(i, 1);
  } else {
    _exists[words[i].v] = true;
    i++;
  }
}

fs.writeFileSync(dest, JSON.stringify(data, null, '  '));
