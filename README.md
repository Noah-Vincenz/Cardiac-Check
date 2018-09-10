# A web portal and mobile app system for the remote monitoring of patients with heart failure

The system proposed in this project can be used for the remote monitoring of patients with heart failure. It also includes the analysis of the heart signals.

## Aims and Objectives

The aim of this project is to design and implement a system for the remote monitoring of a patient that suffers from heart failure. This will simplify the way patients record heart measurements and check on their health, which will enable them to learn about their condition by looking at their statistics visualised in the user interface of the mobile application. The recordings will also be stored on a storage service in the back-end of the system, which will then be used to visualise the heart data on a web portal. This will allow clinicians to effectively analyse the recordings and directly message patients in case of emergency. The web portal will process the heart signals by applying different methods and algorithms to detect any cardiac abnormalities. Furthermore, healthcare institutions will be able to conduct valuable research from the data that has been supplied through the back-end, which can considerably reduce the number of heart failure cases in the future. This project, therefore, aims to solve a real-world problem by making a significant impact in the healthcare industry and thus potentially saving lives in the future.

## Screenshots of the UI
### Mobile App
1. Splash Screen:<br/>
<img width="371" alt="screen shot 2018-09-05 at 18 33 13" src="https://user-images.githubusercontent.com/16804823/45110940-91acae00-b13b-11e8-869c-3781c59e6ffb.png"><br/><br/>
2. Login Screen:<br/>
<img width="371" alt="screen shot 2018-09-05 at 12 29 27" src="https://user-images.githubusercontent.com/16804823/45087882-b5560100-b107-11e8-8895-9daa30b6d57f.png"><br/><br/>
3. Main Recordings Screen:<br/>
<img width="371" alt="screen shot 2018-09-02 at 16 58 38" src="https://user-images.githubusercontent.com/16804823/45087887-b7b85b00-b107-11e8-8489-42b209295f5e.png"><br/><br/>
4. Messages Screen:<br/>
<img width="370" alt="screen shot 2018-09-05 at 12 31 00" src="https://user-images.githubusercontent.com/16804823/45087894-bbe47880-b107-11e8-9484-5caf062593bb.png"><br/><br/>

### Web Portal
<img width="1440" alt="screen shot 2018-09-02 at 17 03 14" src="https://user-images.githubusercontent.com/16804823/45087899-bf77ff80-b107-11e8-89d6-8380f49ee50b.png"><br/><br/>

## Using the Applications

These instructions will need to be taken in order to run the mobile application and the web portal. First of all, the project zip folder needs to be decompressed. This can be done by simply double-clicking the file. This will fully decompress the file and create a folder named *CardiacCheck* in the current working directory. Inside *CardiacCheck* are two folders: *mobApp* and *webPortal*.

### Web Portal

#### Running the Web Application

In order to run the web portal the folder *CardiacCheck/webPortal/public* must be opened. This contains a file called *index.html*. This can be opened on any web browser, but it was developed using Chrome, which logs useful details of the signal processing to the console, such as the positions of each R-Peak. If Google Chrome is used then Chrome's [same origin policy](https://en.wikipedia.org/wiki/Same-origin_policy) needs to be disabled first. This is done by opening the terminal and typing the following command (Note that no Google Chrome instance can be open at this time).

For OSC the following command needs to be run:
```
open -a Google\ Chrome --args --disable-web-security --user-data-dir
```

For Windows/Linux the following command needs to be run:
```
google-chrome --disable-web-security
```
The html file can now be opened to run it locally with Google Chrome. The Google Chrome console can be opened by pressing *Cmd+Opt+J* on OSC and *Ctrl+Shift+J* on Windows/Linux when the browser is active.

#### Testing the R-Peak algorithm

The  *CardiacCheck/webPortal/public* folder contains a folder called *RPeakAlgorithmTesting*. This should be opened and again this folder contains a file called *index.html*, which can be opened in the same way as the other *index.html* file above. This html file simply uses the R-Peak detection algorithm and reads the .txt files inside the folder to plot a single graph and log the R-Peaks of that signal to the console (on Google Chrome). The default .txt file that is being tested is *100.txt*, but this can be changed to any .txt file included in that directory by changing line 21 (*rawFile.open("GET", "100.txt", true);*) of the *index.js* file. 

#### Modifying the source code
 
 The index.js file in *CardiacCheck/webPortal/public* relies on [npm](https://www.npmjs.com). If any of the files in this directory are modified then these changes need to be added in order to become visible. This requires Node.js and npm to be installed on the machine. The following steps need to be taken to install them:
 
 1) Download the Windows installer from the [Node.js website](https://nodejs.org/en/)
 2) Run the installer (opening the downloaded file from step 1)
 3) Follow the prompts in the installer
 4) Restart your computer
 
 Now whenever the source code is modified then ...
 ```
 npm run build
 ```
 ... must be called in the terminal in the *CardiacCheck/webPortal/public* directory for the changes to be added and to become present.
 
 #### Testing the Web Application
 
This also requires Node.js and npm to be installed on the machine, so the steps above need to be taken first. Following this, in *CardiacCheck/webPortal/public* call the following commands on the terminal:
 ```
 npm install -g jasmine
 jasmine
 ```
 This will install jasmine and run the tests located inside the spec folder and print out the results.

### Mobile Application

#### Running the Mobile Application

The mobile application was build on XCode implemented in Swift 3. In order to run the application XCode needs to be installed on the machine. This can only be download for MacOS and the download link can be retrieved on [Apple's website](https://developer.apple.com/download/). This also requires the downloader to have an Apple ID. Once XCode has been successfully installed, *CardiacCheck/mobApp* can be opened, which contains a file called *mobApp.xcworkspace*. This is the file that needs to be opened using XCode to run or test the application. Once in XCode, the application can be either tested or run by navigating to the Product menu > Run or Product menu > Test (Note that an iPhone iOS simulator should be selected).

## Authors

* **Noah-Vincenz Noeh**
