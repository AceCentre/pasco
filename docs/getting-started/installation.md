# ⚙️ Installation

> The easiest way to get up-and-running is with the [iOS app](https://itunes.apple.com/us/app/pasco/id1317265884?ls=1&mt=8), as it has all the features available. Alternatively have a play with the version online [here](http://app.pasco.chat) - just note features like splitting the audio channels or recording sound recordings aren't supported. 

## What platforms are supported?

pasco is a web app currently. This is great as we can support a range of platforms and develop ideas relatively quickly. The downside though is that some features that rely on the operating system need to still be developed specifically. So here are the features and quick overview that which features work where:


| Feature        | iOS           | Web  |
| ------------------------------------------------------------ |:----:| ----:|
| Cue / Main voice splitting between headphone and speaker     | ✅   |  ❎  |
| Import/Export of Vocab tree                                  | ✅   |  ✅  |
| Offline support                                              | ✅   |  ✅  |
| In-App Editing                                               | ✅   |  ✅  |
| In-App Voice Recording                                       | ✅   |  ❎  |
| Adjustable font size and Colour Themes                       | ✅   |  ✅   |
| Switch Access (1-4)					                       | ✅   |  ✅   |
| On-Screen navigation tool, Resizable and Draggable           | ✅   |  ✅   |


## Device requirements

So for the full-feature verison of pasco look at using it on a iOS device (iPhone, iPod Touch, iPad). 

### Switch interface 

If you need switch scanning you will also need a compatible switch interface. Pasco is designed to work natively with switch interface boxes that support space and enter - or arrow keys. This includes: [Pretorian Applicator and iSwitch](https://www.pretorianuk.com/assistive-technology-for-ipad), [Origin Instruments Tapio](http://www.orin.com/access/tapio/), [Ablenet's Blue2 switch](https://www.ablenetinc.com/technology/computer-tablet-access/blue2-bluetooth-switch) and the [Tecla](https://gettecla.com). For all these switch interfaces you need to put it into a mode that supports pressing 'space' and 'enter' keys. 

You can use other switch interfaces designed to work purely with Apple's own switch scanning system such as the [hook+](https://www.ablenetinc.com/downloads/dl/file/id/663/product/515/hook_product_info.pdf). Using these gives you the advantage of being able to use the entire device for scanning - and pasco's own features - **BUT** you need to be aware of how to create a switch recipe and the user having the ability of changing to this recipe when they are ready. Follow [this guide if you wish to do this](/tips-n-tricks/ios-switch-scanning.html). 

### Speakers / Headphones for cue / main 

If you wish to use a second speaker - we recommend right now to use a wired headphone - and just the device's own internal speaker. 

::: tip 
Want a nice simple speaker that you can put in the headrest of a chair? Look for ['Pillow' speakers](https://www.amazon.co.uk/s?k=pillow+speaker&ref=nb_sb_noss_1)
:::


## Setup

When you first load pasco you will see a quick setup screen. It should look a little like this

![Setup screen](../img/screenshots/startup.png)


::: warning 
Depending on which device you are using these screens may look slightly different - and depending on whether you have your screen in potrtait or landscape. But all the same options should be available. 
:::

### What do all these options mean? 

For a full guide on all of the configuration options [read this guide](/advanced/configuration-options.html). The options seen on this screen are seen below:

* **Locale** Which language are you wanting the app to be setup in? Changing this will change the language of all the menu items and configuration buttons.  
* **Choose an example tree** "Trees" are what other communication apps call "Pagesets" or "Gridsets" or similar. We call them "Trees" in pasco because it defines how language is navigated - like an ever expanding network of branches. Here we have some example trees to get you started. Choose one to see some examples of pasco. 
* **Automatic Scanning or Manual**. Choose **Manual** if you want to try it out without a switch - or if you wish to try it with two or more switches. If you want to use it with one switch select **Automatic scanning**. When you do this, make sure your switch is set to **Enter** 
* **Cue Voice** is the voice to hear the auditory cue. Typically a user may hear what they can select right now with a cue (sometimes called **Private voice**). You can choose the voice, the rate, pitch and volume of this voice. You can try an example of the settings by pressing the **Green play** button
* **Main Voice** is the voice that others will hear - typically the communication partner. Sometimes people amplify this using a secondary speaker. In other software this has typically been called the **Public Voice**. 

## Play/**Start** screen 

Once you have pressed the Green "Start" button at the bottom of the quick setup screen - or you click on the small "Play" icon anywhere else in the app you should see a screen a little like this below. 

![Play screen](../img/screenshots/play.png)

The screen has two main components. The grey **navigation bar** at the top where you can access "Configuration", "Help" and "Edit" options, and the main **language display** area. 


Let's now give you a quick overview of the parts of the screen.

### The navigation menu

![Navigation Menu](../img/screenshots/nav-menu.png)

The navigation menu (**see left**) is a small 4-way directional navigational tool to allow a communication partner to navigate the currently loaded language tree. Pressing up - moves up in the current branch, down - moves down and left will move into the next branch - if available - or select the current item. Right will go back a level - if there is a level to go to. 

::: tip 
Although originally designed for the communication partner we have found some clients who have a small thumb movement to be able to use this 
:::

#### To Resize and Move the navigational menu

Simply press and hold and then release. It can take a little while to work out the timing. When you release you are looking for a dotted line to appear around the cursor (see **right** above). By dragging the corners you can resize the menu - larger or smaller. Want to get it back to the default size? Hit the **reset** button in the middle when in this resizing mode.

To move the menu press and hold on it as above and simply drag it to somewhere you need it on-screen
 
### The Edit button

![Edit Button](../img/screenshots/edit-button.png)

Pressing the **edit button** (the small pencil icon in the grey bar at the top of the screen) gives you access to a language editor. 

::: tip Want to stop someone accessing these buttons? 
Check out **Guided Access** on iOS. Its a really neat built-in way to hide elements on the screen and lock a user into a app. Read about how to set it up [here](https://support.apple.com/en-us/HT202612). 
:::


When in edit mode - select an item in your language and press the small green plus signs to add an item or the red minus sign to remove an item. Simply write your message. If you want a different cue for the item simply type it in brackets. E.g. If you wanted the main message to be ``hello, how are you?`` but the cue to be ``hi`` you could write in your box ``hello, how are you?(hi)``

::: warning You can't view cues or advanced meta-data commands in edit mode 
We want to make pasco as simple to use as possible. By providing some other means to view the cue would make this messy. So right now you can just listen for the cue - and edit if you don't like what you hear
:::

[![Image from Gyazo](https://i.gyazo.com/8a9dccac31914e1d745e9ce85f99e74a.gif)](https://gyazo.com/8a9dccac31914e1d745e9ce85f99e74a)

Note it can be difficult to navigate to somewhere else in your tree on iOS - so do have the Navigation menu available to you when using this mode - it really helps!

As well as adding or removing phrases you can also add or remove recorded messages on iOS. To do this - select an item and you should see a small "spanner" item at the top right of the dotted area around the word/phrase selected. Tap this and you can now press the record button to add your own recorded main or cue voice. 

<a href="https://gyazo.com/66b921ac472ef785f87b537392d7cc75"><video alt="Video from Gyazo" width="472" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/66b921ac472ef785f87b537392d7cc75.mp4" type="video/mp4" /></video></a>



---

👍 You've successfully installed and setup pasco!

😞 Got a problem? Dang! See our [troubleshooting](/getting-started/contributing.md) guide. 
