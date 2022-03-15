# Meta-Data commands

**'Meta-data'** commands are commands added in-line to the tree file which changes the function of that part of the language. For example, we have commands that stop the tree automatically going back to the top - and commands that help with spelling. For example, If you want to change create a command to go back you would type this in your file

```
	Dog
	Cat
	Bird
	Go Back <meta data-back-n-branch="1">	   			
```

This is the **Control data command - back-n-branch**. This means you can set an action on the press of this command to go back up **n** levels. Maybe one or two branches if necessary.

The following is an example markdown for a metadata in a node

```
I have something to say<meta data-audio="some/audio/file.mp3" auditory-cue="<TEXT>">
```

It's the replacement text for utterance for cue

#### Stay in Branch commands

To stay in a branch simply add this at the top level item:

```
<meta data-stay-in-branch>
```

e.g.

```
I would like<meta data-stay-in-branch>
	Pizza
	with Cheese
	with Pepperoni 
```

To go back one level or several you can use use back-n-branch=N where N = number of branches to step back to. e.g.

```
<meta data-back-n-branch="1" data-back-n-branch-notify>
```

And lastly, to select an item and then exit use select-utterance

```
<meta data-select-utterance>
```

#### Spell metadata

Spelling is possible. To start it you need a branch that defines a alphabet. So the root node should have `spell-branch`:

```
I'll spell it <meta data-spell-branch>
```

To spell a letter use `spell-letter` e.g. `<meta data-spell-letter=" ">`

```
spell-letter="<A LETTER>"
```

It's the replacement for the text existed in that node. Instead this value will be added to list of letters

```
spell-finish
```

The option to delete the last letter selected

```
spell-delchar
```

The option to remove last inserted character in spelling queue

```
spell-branch
```

Considers all leaf of that branch to be as spell letters, It used for defining where spell function should be used.

#### Spelling with prediction

Firstly we need to tell pasco that there will be changes to the layout after each selection:

```
<meta data-spell-branch  data-spell-update-dyn-onchange>
```

Next we need to define some aspects of prediction. For _Word prediction_ we define it with `data-dyn=spell-word-prediction`:

```
<meta data-dyn="spell-word-prediction" data-words-file="trees/Spell_Prediction/bncfrequency.json" data-max-nodes="3" data-spell-finish data-predict-after-n-chars="3"
```

We need to define a corpus to predict from. There are a range of Corpus' already in pasco (see [here](https://github.com/AceCentre/pasco/tree/master/html/trees/Spell\_Prediction) for some examples. These are effectively a list of words with their frequency.)

```
data-words-file="trees/Spell_Prediction/bncfrequency.json" 
```

Next we say the number of predictions that are going to be presented:

```
data-max-nodes="3" 
```

And lastly, we can define after how many letters are spelt before we get predictions:

```
predict-after-n-chars="number"
```

We can also use _next letter prediction_. This is done with `data-dyn=spell-letter-prediction`:

```
<meta data-dyn="spell-letter-prediction" data-words-file="trees/Spell_Prediction/bncfrequency.json">
```

(A full example can be seen [here](https://raw.githubusercontent.com/AceCentre/pasco/master/html/trees/Spell\_Prediction/en-GB-Spell\_Prediction.md))

#### Audio metadata

```
audio="<PATH/TO/AUDIO/FILE>"
```

Plays the selected audio for cue and main voice

```
cue-audio="<PATH/TO/AUDIO/FILE>"
```

Plays the selected audio for cue voice

```
main-audio="<PATH/TO/AUDIO/FILE>"
```

Plays the selected audio for main voice
