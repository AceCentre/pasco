# Meta tags

## Overview

With meta tags you can specify attributes for any node in the tree file. For example. You can implement back function in a branch, When you select back node then it will move up from Its current position in the hierarchy. In the example below when "Go Back" has selected it will move to "Animals".

```
Animals
	Dog
	Cat
	Bird
	Go Back <meta data-back-n-branch="1">	   			
```

Meta tag is a regular html tag, And here is how we add attributes to a node. `<meta data-name="value" [...]>`. All attributes should start with prefix `data-`, Following with attribute name. Note that tag can contain more than one attribute.

In example above `back-n-branch` specifies a behaviour for when It's selected.

## `auditory-cue`

type: string

Auditory cue specifies what should get uttered when user scrolls over nodes, AKA move to next or previous.

## `auditory-main`

type: string

Auditory main specifies what should get uttered when user selects a node.

It's not applicable to spelling branch

## `back-n-branch`

type: integer (greater than zero)

To move up `n` levels in the tree hierarchy when the node has select.

## `back-n-branch-notify`

type: [boolean](meta-tags.md#boolean-value)

Back n branch attribute performs back functionality. And it does not utter (with main voice) the node itself. As selecting a node does that. When you include `back-n-branch-notify` it notifies the user by uttering with main voice.

## `audio`

type: [path](meta-tags.md#path-value)

The audio to play instead of utterance with speech synthesizer. It applies to cue and main voice.

## `cue-audio`

type: [path](meta-tags.md#path-value)

The audio to play when user scrolls through nodes. `cue-audio` overrides `audio` attribute when you specify both.

## `main-audio`

type: [path](meta-tags.md#path-value)

The audio to play when user selects a node. `main-audio` overrides `audio` attribute when you specify both.

## `locale`

type: string

Specify locale for a node. At the moment this attribute has only effect on speech synthesizer voice selection. At config you can specify what voice to use for every locale, When you apply locale to a node it will change the voice accordingly.

Here are possible values you can set as locale.

* `"en-GB"` English (UK)
* `"de"` German
* `"fr-FR"` French
* `"es-ES"` Spanish
* `"ar"` Arabic
* `"gu"` Gujarati
* `"cy"` Welsh

You may also use only language part of locale. For example instead of `"en-GB"` if you use `en`. pasco will match it to first locale it finds with same language.

## `cue-locale`

type: string

Same as `locale`, This attribute is designed to override `locale` for cue voice. `cue-locale` precedes `locale` when both are set in a node.

## `main-locale`

type: string

Same as `locale`, This attribute is designed to override `locale` for main voice. `main-locale` precedes `locale` when both are set in a node.

## `spell-branch`

type: [boolean](meta-tags.md#boolean-value)

pasco enables spelling with this attribute. You have to assign it to top level node that contains spelling branch. Here's an examples.

```
I have something to say
I'll spell it<meta data-spell-branch>
  A
  B
  Finish<meta data-spell-finish>
```

You may also set the attribute to root node like this.

```
<meta data-spell-branch>
A
B
Finish<meta data-spell-finish>
```

## `spell-delchar`

type: [boolean](meta-tags.md#boolean-value)

When user selects a node with this attribute. It removes a letter from existing spelling session.

## `spell-finish`

type: [boolean](meta-tags.md#boolean-value)

You have to use "spell-finish" to finish the existig session. It also notifies with main voice similar to selecting a node outside `spell-branch`.

## `spell-letter`

type: string

You may use `spell-letter` to specify next letter to add in the spelling session. By default it is going to use the text of the node itself.

## `spell-word`

type: string

You can use `spell-word` to complete a word in the spelling memory. Let's say you select letter `A` and then select `spell-word="apple"`. Then it will remove registered letter `A` and then adds apple.

Spelling process allows the user to add more than one word by adding space in between them.

## `spell-update-dyn-onchange`

type: [boolean](meta-tags.md#boolean-value)

When this attribute is given to `spell-branch` node. It will update all dyn nodes inside this branch.

This attribute is primarily used when `spell-branch` node contains dynamic nodes. With `dyn="spell-word-prediction"` and/or `dyn="spell-letter-prediction"`.

## `stay-in-branch`

type: [boolean](meta-tags.md#boolean-value)

With stay in branch you can specify a branch to start over from when user selects a leaf node in that branch. Here's an example.

```
I have something to say
I'll spell it<meta data-spell-branch data-stay-in-branch>
  A
  Finish<meta data-spell-finish>
```

## `change-tree`

type: [path](meta-tags.md#path-value)

When user selects `change-tree` pasco tries to load the given tree and open it. Then it starts from beginning in the new tree.

## `change-tree-by-name`

type: string

Change by tree is similar to `changetree`. Except it loads the tree from saved trees inside pasco. You can manage saved trees at Vocabulary section of config page.

## `no-main`

type: [boolean](meta-tags.md#boolean-value)

When you select a node that has `no-main` it will not utter main voice.

## `webhook`

type: url (string)

pasco has a set of webhook attributes that enables users to perform an http request to sites that support cross-origin xhr requests. It is specifically designed for use of iot webhooks like zapier.com, Here's an example.

```
Add a record <meta data-webhook="https://hooks.zapier.com/hooks/catch/.../" data-webhook-method="POST" data-webhook-content-type="application/json" data-webhook-body='{"Name":"random row"}' data-webhook-success-message="Did add a record"/>
```

## `webhook-method`

type: string

Specifies method of the webhook request. Default value is `POST`. Possible values are: `GET/PUT/POST/DELETE`, etc.

## `webhook-content-type`

type: string

Specifies request content type of the webhook request. Default value is `application/json`.

## `webhook-body`

type: string

Specifies request body of the webhook request. Default value is `{}` (Empty json object) when content-type is `application/json`. Otherwise body is empty.

## `webhook-success-message`

type: string

You can set the message to utter when pasco receives success response from this webhook request. You can add this attribute to a `webhook` node.

## `webhook-skip-validating-response`

type: [boolean](meta-tags.md#boolean-value)

With this attribute added to `webhook`. It will skip validating response when response is OK (200). This attribute was specifically designed for zapier.com webhook. By default it is false.

## `webhook-modify-headers`

type: [boolean](meta-tags.md#boolean-value)

When this attribute is true, Only then webhook will actually modify request headers. Default is false, It is designed for when cross-origin server does not allow for modifying headers. At the time of design zapier.com webhook does not allow changes on headers.

## `dyn`

type: string

Dynamic attribute introduces dynamic nodes into pasco. Below you can see possible values.

### `dyn="trees-switcher"`

Lists saved trees, Each as a node. And when user selects any. It will change the tree to that.

### `dyn="spell-word-prediction"`

Offers some words as prediction of current spelling. Here are the accepted attributes for this dyn. `word-file`, `max-nodes` and `predict-after-n-chars`.

### `dyn="spell-letter-prediction"`

Predicts order of alphabetic letters according to current spelling status. Here are the accepted attributes for this dyn. `word-file`, `max-nodes`, `predict-after-n-chars` and `alphabet`.

## `words-file`

type: [path](meta-tags.md#path-value)

Words file used for word prediction. At the moment predictions have a simple method of sorting according to weight in words file. [Example words file](https://github.com/AceCentre/pasco/blob/master/html/trees/Spell\_Prediction/bncfrequency.json)

This attribute is required when spell dyn has set to a node.

Only for spell dyns

## `max-nodes`

type: integer (greater than or equal zero)

Maximum number of nodes to show as predictions. Default: 3

Only for spell dyns

## `predict-after-n-chars`

type: integer (greater than or equal zero)

Start predicting after n letters has inserted when spelling. Default: null (no limit)

Only for spell dyns

## `alphabet`

type: string

String of letters to use for prediction. Default: `abcdefghijklmnopqrstuvwxyz`

Only for spell predict letters dyn

## Path Value

Path is of type string that is expected to be http(s) url or relative path in the package or relative path from base url.

## Boolean Value

No value is required, Since it is a boolean attribute, example `&lt;meta data-attr-name&gt;`. You can also set Its value to `false` or `true`.
