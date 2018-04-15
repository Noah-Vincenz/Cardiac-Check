# A web portal and mobile app system for the remote monitoring of patients with heart failure

The system proposed in this project can be used for the remote monitoring of patients with heart failure. It also includes the analysis of the heart signals.

## Using the Applications

These instructions will need to be taken in order to run the mobile application and the web portal. First of all, the project zip folder needs to be unzipped. This decompressed folder can then be opened.

### Web Portal

#### Running the Web Application

In order to run the web portal the folder .../.../Web_Portal must be opened. This contains a folder called public and the public folder contains a file called *index.html*. This can be opened on with any web browser, but has been developed using Chrome, which gives logs useful details of the signal processing to the console, such as the positions of each R-Peak. The Google Chrome console can be opened by pressing *Cmd+Opt+J* on OSC and *Ctrl+Shift+J* on Windows/Linux when the browser is opened. If Google Chrome is used then Chrome's [same origin policy](https://en.wikipedia.org/wiki/Same-origin_policy) needs to be disabled. This is done by opening the terminal and typing the following (Note that no Google Chrome instance can be open at this time).

For OSC the following command needs to be run:
```
open -a Google\ Chrome --args --disable-web-security --user-data-dir
```

For Windows/Linux the following command needs to be run:
```
google-chrome --disable-web-security
```
The html file can now be opened with Google Chrome.

#### Testing the R-Peak algorithm

The public folder contains a file called RPeakAlgorithmTesting. This again contains a file called index.html which can be opened in the same way as the other index.html file above. This html file simply uses the R-Peak detection algorithm to plot a single graph and log the R-Peaks to the console (via Google Chrome) in the html web page. The default .txt file that is being tested is *100.txt*, but this can be changed to any .txt file included in that directory by changing line 21 (*rawFile.open("GET", "100.txt", true);*) of the index.js file. 

#### Modifying the source code
 
 The index.js file in  .../.../Web_Portal/public relies on [npm](https://www.npmjs.com). If any of the files in this directory are modified then this changes the to be added in order to become visible. This requires Node.js and npm to be installed on the machine. The following steps need to be taken to install them:
 
 - 1) Download the Windows installer from the [Node.js website](https://nodejs.org/en/)
 - 2) Run the installer (opening the downloaded file from step 1)
 - 3) Follow the prompts in the installer
 - 4) Restart your computer
 
 Now whenever the source code is modified then ...
 ```
 npm run build
 ```
 ... must be called in the .../.../Web_Portal/public directory for the changes to be added and to become present.

### Mobile Application

#### Running the Web Application

The mobile application was build on XCode implemented in Swift 3. In order to run the application XCode needs to be installed on the machine. This can only be download for MacOS and the download link can be retrieved on [Apple's website](https://developer.apple.com/download/). This also requires the downloader to have an Apple ID. Once XCode has been successfully installed, .../.../Mobile_App/mobApp.xcworkspace can be opened using XCode. Once in XCode, the application can be either tested or run by navigating to the Product menu > Run or Product menu > Test (Note that an iPhone iOS simulator should be selected).


## Authors

* **Noah-Vincenz Noeh**
