<p align="center">
  <img src="https://github.com/AceCentre/pasco/raw/master/cordova/model/icon.png" width="150" alt="pasco icon">
</p>


# pasco (Phrase Auditory Scanning COmmunicator)

pasco is a development project by the [Ace Centre](https://acecentre.org.uk) to create a AAC app to support people who require auditory scanning only. This may be with one or several Text to Speech (TTS) languages or recorded speech. The app supports auditory cues in a headphone and main speech out of the main speaker of a device. Currently only these features are supported in iOS - other platforms are due to be supported in the future. 

## Getting Started

You can try out a limited version of pasco on the web at [app.pasco.chat](https://app.pasco.chat). Alternatively download the iOS app [here](https://itunes.apple.com/us/app/pasco/id1317265884?ls=1&mt=8).

To learn more about pasco, [Read pasco documentation](https://app.pasco.chat/docs/).


### Differences between versions


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
| Webhook support (e.g. IFTT, Zapier)                          | ✅   |  ✅   |
| (Beta) Scroll-wheel navigation mode                          | ✅   |  ✅   |
| Offline voices                                               | ✅   |  ❎   |


## Developing 

### Prerequisites

* [Node](https://nodejs.org)
* [Bower](https://bower.io)

If developing the iOS build you will also need:

* A mac
* XCode 


### Installing

```
npm install
bower install
```

To test the web build: 
```
npm run dev
```

To build the iOS build - First time:

```
npm install 
bower install
npm run build-prod
npm run cordova-dist
cd cordova
cordova platform add ios
cordova build
```

To build the iOS build - Additional times:

```
npm install 
bower install
npm run build-prod
npm run cordova-dist
cd cordova
cordova build
```


### Having problems building?

Try this:

```
npm install --upgrade cordova@latest
npm install --upgrade cordova-ios@latest
npm install --upgrade ios-deploy
npm install cordova-icon 
```

### Notes

* configuration file is at `html/config.json`. modes are `auto` and `switch`.
* the app detects a number of keystrokes. To get it to work with 1 or more switches the app needs a switch box that sends these keystrokes:

```
ArrowUp or W -> Previous # on switch mode
ArrowDown or S -> Next # on switch mode
ArrowRight or D -> Go into or select
ArrowLeft or A -> Go out
```

## Built With

* [FontAwesome](http://fontawesome.com) - For some of the icons
* [Responsive Voice](https://responsivevoice.org/) - The web framework used for TTS on the web


## Contributing

We would 💛 your contributions. Please feel free to fork the project and we would to see your Pull Requests. Take a look at the [issue queue](https://github.com/acecentre/pasco/issues) if you want something to get started on. If GitHub isn't your thing and you want to give us feedback - [drop us a line](https://acecentre.org.uk/contact/)


## Authors

* **Will Wade** - *Initial work, and Project Lead* - [WillWade - GitHub](https://github.com/willwade)
* **Hossein Amin** - *Most of the hard programming work* - [HoseeinAmin - GitHub](https://github.com/hosseinamin)

## License

This project is licensed under the GNU GPL v3 - see the [LICENSE.txt](https://github.com/AceCentre/pasco/blob/master/LICENCE.txt) file for details

## Acknowledgments

* A massive thanks to our Clients who have inspired the need for this
* [Paul Pickford](https://www.youtube.com/watch?v=8lxpvI3lk8w&feature=youtu.be) who has helped fund the project through his eBay Sales 
* Francis, Alli and Students at [Lancasterian School](http://www.lancasterian.manchester.sch.uk) who have helped test the project and give really useful feedback  
