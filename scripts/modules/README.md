Quick setup

```
cd scripts/modules
npm install
```

Steps to produce po file and translate with google translate, Then apply the translation on a tree.

```
node po-file-from-tree.js ../../html/trees/Simple_Adult_Starter/en-GB-Simple_Adult_Starter.md > path/to/pofile.po
node google-translate-pofile.js path/to/pofile.po ar path/to/pofile-ar.po
node apply-po-translation-on-tree.js path/to/pofile-ar.po ../../html/trees/Simple_Adult_Starter/en-GB-Simple_Adult_Starter.md > path/to/translated/treefile.md
```
