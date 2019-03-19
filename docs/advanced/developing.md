# Developing pasco

pasco is a [cordova](http://cordova.apache.org) app. The logic is largely in javascript with some custom work built for iOS. 

## Getting started with development

To get you up and running this should get you to the point where you can work on the normal web version:

	git clone https://github.com/AceCentre/pasco.git
	npm install
	bower install
	npm run dev

For the iOS version you will need to be on a mac with XCode. Here are the commands to get going with this:

	npm run cordova-dist
	cd cordova
	cordova platform add ios
	cordova run

You should find the xcode project in ```cordova\platforms\ios\pasco.xcodeproj```


### Having problems at this stage?


	npm install --upgrade cordova@latest
	npm install --upgrade cordova-ios@latest
	npm install --upgrade ios-deploy
	npm install cordova-icon 

## How is the project structured?

i.e. what goes where.

## 