Configurations for different use cases
--------------------------------------

### A Single Switch user

If someone is operating a single button and has learnt the basics of simple automatic scanning then they can use pasco to make their needs known. A video explaining scanning can be found [here](https://www.youtube.com/watch?v=g4CwiMHuTjo). To configure pasco for this within the **Config** Screen change it to **"Automatic-Scanning"** Under **"Switch Access"**. There are some options available when you do this.

*   **Loops.** This is how many times the scan will go through each level of the tree if no item is selected. It can be useful if the indvidual wants to listen first and then select. However if you are using it for this try and look at the **"First time run"** Option
*   **Delay at first item.** Sometimes its difficult for people who use auto-scanning to select start the scan AND select the first item. This delay time adds an extra delay to the very first item at each level of the vocabulary
*   **Auto-scanning delay.** This is the time it takes to move from one item to the next. Some people call this the "Scan Time".

There are some other settings too which are not specific to single switch scanning:

*   **Switch key to select items** Many switch boxes (the piece of equipment that connects your switch to the computer) use space or enter as the emulated key press. Which emulated key press are you using? This will be the key that selects items
*   **First Time Run (Cue Voice)** It can be useful to have a cue for the first time the scan goes through each level of your vocabulary. This may go a lot faster than the regular scan rate. This is called the **First time Run**. By turning this on you can change the rate and a different voice if required
*   **Ignore second hits(ms)** If the user has difficulty pressing the switch once - or for example tremors on a switch - increasing this time can help. It ignores second hits of the switch if they are within the time period selected
*   **Ignore key presses under n ms** This setting tells the app to ignore short switch presses. You can alter this time as you need to.

One last configuration that is very helpful for automatic scanning is the **"Back option for all branches"** Under **Helpers**. This puts a **"Back"** action at the bottom of each level of the vocabulary allowing someone with one switch to go back a branch if they make a mistake.

* * *

### A Two-Switch user

Some people may use two switches. One switch will move through the items - with a second switch selecting them. This is called **Two-switch** or **Manual** scanning. To configure pasco for this within the **Config** Screen change it to **"Manual"** Under **"Switch Access"**. There are some options available when you do this.

*   **Switch key to select items** Many switch boxes (the piece of equipment that connects your switch to the computer) use space or enter as the emulated key press. Which emulated key press are you using? This will be the key that selects items.
*   **Move with the other switch (Step scanning)**You will need to select this if you are using two switch scanning. What does this button do? Lets imagine you select "Space" as your selection key. Checking this box will make "Enter" your move key. Equally if you have "Enter" as your selection key it makes "Space" the move key.
*   **First Time Run (Cue Voice)** It can be useful to have a cue for the first time the scan goes through each level of your vocabulary. This may go a lot faster than the regular scan rate. This is called the **First time Run**. By turning this on you can change the rate and a different voice if required
*   **Ignore second hits(ms)** If the user has difficulty pressing the switch once - or for example tremors on a switch - increasing this time can help. It ignores second hits of the switch if they are within the time period selected
*   **Ignore key presses under n ms** This setting tells the app to ignore short switch presses. You can alter this time as you need to.

One last configuration that is very helpful for manual scanning is the **"Back option for all branches"** Under **Helpers**. This puts a **"Back"** action at the bottom of each level of the vocabulary allowing someone with one switch to go back a branch if they make a mistake. NB: If someone can access a third switch you can set this switch to **"A"** or **"Back arrow"**.

* * *

### Someone who controls the up/down keys on a remote control

Some individuals can operate one finger or thumb with some dexterity once positioned in the correct place so that they, for example, can control the navigation arrows of a remote control. Pasco has a built in navigation aid that, although designed for a communication partner to use can be useful for the individual. To turn this on Select the **"On"** option of the **"On-screen navigation"**.

The navigation arrow allows you to go up,down, left and right through the language of your vocabulary

Once on you can press and hold on the 4 way arrow to move the navigation tool around the screen to where you need it - and resize it. To resize it press and hold on the middle of the arrow then grab the edge of the dotted line surrounding it to resize the tool.

* * *

### Someone who can control the arrow keys of a external (Bluetooth or wired) keyboard

Some individuals can operate an external number pad (like [this](https://www.amazon.co.uk/Satechi®-Bluetooth-Wireless-Notebook-Compatible/dp/B011AO91GI/ref=sr_1_46?ie=UTF8&qid=1525248689&sr=8-46&keywords=bluetooth+pad)) - where one or more fingers can operate the arrow keys. This can be placed in the correct place - and mounted if required.

To use this, pair with your device (iPhone, iPad or other device using pasco). Make sure your numlock setting is on so you can use the arrow keys. The arrows allows you to go up,down, left and right through the language of your vocabulary

* * *

### A non-native Communicator

Some people may understand one language but need to communicate to others in a different language. Pasco allows you to do this by changing the voice of the cue (the voice that the pasco user would hear) - and the main voice (the voice that others would hear). There are two ways you can achieve this with pasco

1.  Using the in-built Text to speech engine - and changing the language
2.  Recording your own cue/main voice audio recordings

* * *

Editing
-------

pasco has some simple and advanced editing available. We will first look at the simple - within app way of editing. To Edit within the app navigate to the tree or part of the tree you want to access (hint: enabling the navigation tool helps this) and then hit the **Top right Edit icon (looks a little like a pencil and pad)**. Once in this mode tap on the item you want to edit. A white box will appear with small markers. If you want to edit the text (the label) - just tap in the white area and with the on-screen keyboard edit the text as you wish.

If you want to add a new item above or below this item - simply hit the plus symbol either above or below the item

If you want to change the recorded cue or main recording - you can do this by tapping on the spanner symbol next to the item you want to change. Then in the next window select which the recording is for (Main, Cue or Both) and press and hold the red "Record" button. **Release** the button when you are finished recording.

* * *

Advanced editing
----------------

In the config it's possible to import and export your own language tree. This is simply a text file. There are two ways you can make this:

1.  Within [MindNode](https://mindnode.com). A mindmap editor. Create your list then export to Markdown and import this file
2.  Within a plain text editor (e.g. Notepad). Simply indent lines using the tab key under each heading. You can look at an example [here](https://gist.githubusercontent.com/willwade/c4b96b99c1788b168f4b244f99f82baf/raw/0943dbaad21c4d72ba40ed4f8aeeaee7967bfb75/PlainTextTreeExample.txt)

Copy and paste the file (either the markdown file - or the indented text file) into the **Tree** in the Config.