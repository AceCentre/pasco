# Tree / Language file details

There are two formats that pasco reads langauge trees in.

1. **Mindnode - Markdown format.** 

Files look a little like this:

```
# Chat


## How are you?

- Ace!

- Whats that?

- 

## Whats happening?

- Yeah for sure

## I’m fed up


# I need something


## Its in my bag

## Its somewhere else

## Its upstairs


```

It's not the easiest to read - note that with markdown line breaks are key. It's easiest to generate this with something like MindNode - an iOS and Mac app to generate MindMaps. It really is a breeze 

2. **Tab OR Space Indented text file** 

Here a file looks like this:

```
Chat
	How are you?
	Ace!
	Whats that?
	Whats happening?
		Yeah for sure
	I’m fed up

I need something
	Its in my bag
	Its somewhere else
	Its upstairs

```

It looks a little easier to read - but be **warned** - spaces and tabs at the beginning cannot be mixed. Don't put a space and then a tab. Its not the easiest. 

3. (Not really alternative) Open Board format

Pasco natively supports the open board format
