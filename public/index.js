/**
 * @author Noah-Vincenz Noeh <noah-vincenz.noeh@kcl.ac.uk>
 */

//imported libraries
var lpf = require('lpf'); //library for low-pass filtering
var KalmanFilter = require('kalmanjs').default; //library for kalman filtering
var dsp = require('dsp.js'); //library for digital signal processing

//variables
var textArea = document.getElementById("textArea"); //text area a for writing a message to patients
var sendButton = document.getElementById("sendButton"); //button to send the message
var tableBody = document.getElementById("table_body");
var patientsSelection = document.getElementById("patients_selection"); //drop down list
var xAxisStripLinesArray = [];
var yAxisStripLinesArray = [];

var pcgArrayData = [];  //raw PCG signal data
var pcgYArrayData = []; //raw PCG y values
var xyArrayData = []; //raw ECG signal data
var yArrayData = []; //raw ECG y values
var lpfArray = []; //filtered ECG datapoints
var qBegArray = []; //array containing all the start points of all QRS complexes (ie. beginning of Q)
var sEndArray = []; //array containing all the end points of all QRS complexes (ie. end of S)
//var pEndArray = [];
//var tBegArray = [];
var xyArraySpikes = [];
var sNoiseArray = []; //array that keeps x coordinates of the s noises over the specified PCG threshold
var shannArr = []; //containing Shannon energy data points
var newSNoiseArray = []; //array to get rid of adjacent S points and output only the most central one
var maxArray = []; //array containing all maxima retrieved from the filtered ECG signal

//setting up firebase references
const db = firebase.database();
const patientsRef = db.ref("patients");
const storage = firebase.storage();


/**
 * This function gets called when the window first loads. It changes the data that is currently shown to show the data of the patient 'Henry'
 */
window.onload = function () {
    changeDataShown("Henry Croft");
    addStripLines();
}

/**
 * This function gets called when select item changes; the table is updated with the selected patient's data.
 * @param {string} strUser - The name of the patient that the data should be changed to.
 */
global.changeDataShown = function(strUser) {
    // ensure that data does not get appended when the selected patient changes
    emptyArrays();

    if ($('#my_table tr').length == 2) {
        document.getElementById("my_table").deleteRow(1); //we only want one row
    }

    //retrieve the corresponding data from the database reference, ie. patients in this case
    patientsRef.orderByChild("name").equalTo(strUser).on("value", function(snapshot) {

        snapshot.forEach(function(data) { // = corresponding patient ie. patient2
            //update graphs to show the data of the corresponding patient
            updateGraphs(data.key);
            var id;
            var name;
            var dob;
            var weight;
            data.forEach(function(value) { // each value for entry: id, name, dob, weight

                var key = value.key; // =id, name, weight etc.
                var val = value.val(); // =patient1, Bob, 93kg etc.

                if (key == "id") {
                    id = val;
                } else if (key == "name") {
                    name = val;
                } else if (key == "dob") {
                    dob = val;
                } else if (key == "weight"){
                    weight = val;
                }

            });
            // setting the table cell values
            var str = "<tr><td>"+id+"</td><td>"+name+"</td><td>"+dob+"</td><td>"+weight+"</td></tr>";
            $("#table_body").append(str);

        });


    });
}

/**
 * Update the graphs to visualise the recordings of the selected patient.
 * 1. Look in storageref for 'patientkey'.txt file.
 * 2. Download file.
 * 3. Read file and convert into array of values.
 * 4. Draw graphs.
 * @param {string} patientKey - The id of the currently selected patient (ie. patient1).
 */
function updateGraphs(patientKey) {

    // Create a reference with an initial file path and name
    var storageRef = storage.ref();
    var pathReference = storageRef.child('ECGdata/'+patientKey+'.txt');

    pathReference.getDownloadURL().then(function(url) {
        // 'url' is the download URL

        // This can be downloaded directly by making use of XMLHttpRequest:
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'text';
        xhr.send();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {  // Makes sure the document is ready to parse.
                if (xhr.status === 200) {  // Makes sure the file has been found.
                    allText = xhr.responseText;
                    lines = xhr.responseText.split("\n"); // Will separate each line into an array
                    var time = 0;

                    //loop through lines and add each datapoint to array, which will be used for the graphs later on.
                    //start at index i = 4, as up to that is just description of the file.
                    for (var i = 4; i < lines.length - 1; i++) {
                          xyArrayData.push({
                              x: time,
                              y: parseFloat(lines[i])*1
                          });
                          yArrayData.push(lines[i]*1);
                          time += 0.01;
                          time = parseFloat(time.toFixed(3));
                    }
                    console.log('xyArrayData');
                    console.log(xyArrayData);

                    //ECG heart rate calculation
                    heartRateCalculation();

                    //low pass filter
                    drawGraph(lowPassFilter(yArrayData), 2, "Low Pass Filter");

                    ECGSignalProcessing();

                    drawGraph(yArrayData, 1, "ECG");

                    //Kalman filter
                    drawGraph(kalmanFilter(yArrayData, 0.01, 3), 3, "Kalman Filter");

                    showPCG(patientKey);
                }
            }
        };

        xhr.send(null);

    }).catch(function(error) {
      // Handle any errors
    });
}

/**
 * Add strip lines to the ECG graphs. ECG paper speed is ordinarily 25 mm/sec. Therefore:
 * 1) 1 mm (thin lines) = 0.04 sec & 5 mm (bold lines) = 0.2 sec
 * 2) 1 mm (thin lines) = 0.1 mV & 5 mm (bold lines) = 0.5 mV
 */
function addStripLines(){
    for (var i = 0; i < 30; i = i + 0.04) {
            xAxisStripLinesArray.push({value:i,thickness:0.125, color:"#FF0000"});
    }
    for (var i = 0; i < 30; i = i + 0.2) {
            xAxisStripLinesArray.push({value:i,thickness:0.375, color:"#FF0000"});
    }
    for (var i = -5; i < 5; i = i + 0.1) {
            yAxisStripLinesArray.push({value:i,thickness:0.125, color:"#FF0000"});
    }
    for (var i = -5; i < 5; i = i + 0.5) {
            yAxisStripLinesArray.push({value:i,thickness:0.375, color:"#FF0000"});
    }
}

/**
 * Add new option to selection drop down when a new child is added on the database.
 */
patientsRef.on("child_added", function(snapshot) {
    // this will need to change for when app is deployed
    var opt = document.createElement("option");
    opt.innerHTML = snapshot.val().name;
    opt.value = snapshot.val().name;
    patientsSelection.appendChild(opt);
});

/**
 * Retrieve the name of the currently selected patient. This gets called when selected item changes and when send button is pressed.
 * @return {string} The name of the current patient selected.
 */
global.getSelectedUser = function() {
    var e = document.getElementById("patients_selection");
    var strUser = e.options[e.selectedIndex].text;
    return strUser;
}

/**
 * Store message from the text area in the database and add an alert to confirm that the message has been stored.
 */
global.submitText = function(recipient) {
  db.ref("messages/" + recipient + " " + getDate()).set(textArea.value);
  window.alert("Message has been stored on the database!")
}

/**
 * Add new patient data to the database.
 */
function writePatientsData(patientId, patientName, patientDob, patientWeight) {
    db.ref('patients/' + patientId).set({
      "id": patientId,
      "name": patientName,
      "dob": patientDob,
      "weight": patientWeight
    });
}

/**
 * Retrieve the current date in the format 'day-month-year'.
 * @return {string} The current date in the specified format.
 */
function getDate() {
   var now     = new Date();
   var year    = now.getFullYear();
   var month   = now.getMonth()+1;
   var day     = now.getDate();
   var dateTime = day + '-' + month + "-" + year;
   return dateTime;
}

/**
 * Show and process PCG.
 * @param {string} patientKey - The id of the currently selected patient.
 */
function showPCG(patientKey) {
            var storageRef = storage.ref();
            var pathReference = storageRef.child('PCGdata/'+patientKey+'.txt');
            pathReference.getDownloadURL().then(function(url) {
                // This can be downloaded directly:
                var xhr = new XMLHttpRequest();

                xhr.open('GET', url);

                xhr.responseType = 'text';
                xhr.send();
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {  // Makes sure the document is ready to parse.
                        if (xhr.status === 200) {  // Makes sure it's found the file.
                            allText = xhr.responseText;
                            lines = xhr.responseText.split("\n"); // Will separate each line into an array

                            var time = 0;
                            for (var i = 4; i < lines.length - 1; i++) {
                                pcgArrayData.push({
                                    x: time,
                                    y: parseFloat(lines[i])*1
                                });
                                pcgYArrayData.push(parseFloat(lines[i])*1);
                                time += 0.003;
                                time = parseFloat(time.toFixed(3));
                            }
                            console.log('pcgArrayData');
                            console.log(pcgArrayData);
                            drawGraph(pcgArrayData, 4, "PCG");

                            //Fast Fourier Transform
                            var newArr = [];
                            //8192 because it has to be a power of 2
                            for (var i = 0; i < 8192; ++i) {
                                newArr.push(pcgArrayData[i].y);
                            }
                            var fft = new dsp.FFT(8192, 334);
                            fft.forward(newArr);
                            var spectrum = fft.spectrum;
                            drawGraph(spectrum, 7, "Fast Fourier Transform");


                            //Kalman filter
                            var kalmanArray = kalmanFilter(pcgYArrayData, 5000, 1000);
                            drawGraph(kalmanArray, 5, "Kalman Filter")


                            //Shannon energy
                            for (var i = 0; i < kalmanArray.length; ++i) { //using kalman filtered PCG signal for noise reduction
                                var inp;
                                if (Math.pow(kalmanArray[i], 2) == 0) {
                                  // since log of 0 is undefined
                                  inp = 0;
                                }
                                else {
                                  inp = Math.pow(0-kalmanArray[i], 2) * Math.log(Math.pow(kalmanArray[i], 2)) / 1000000;
                                }
                                shannArr.push(inp);
                            }
                            console.log("Shannon Energy");
                            console.log(shannArr);
                            //making a copy of the shannonEnergy output as we want to sort the array, but not affect the original array
                            var newArray = shannArr.slice();
                            newArray.sort(function(a,b) { return a - b;});
                            //array for the maxima of the shannon array
                            var newMax = [];
                            //we want to have the same number of maxima as the number of R peaks in the raw ECG data
                            for (var i = newArray.length - 1; newMax.length < xyArraySpikes.length; --i) {
                              newMax.push(newArray[i]);
                            }
                            //computing average of the peaks (potentially S1's) to get a threshold for the peak detection of s1 and s2
                            var sum = 0;
                            for (var i = 0; i < newMax.length; ++i) {
                              sum += newMax[i];
                            }
                            var avg = sum / newMax.length;
                            //the threshold is usually sufficient as 1/3 of the average of the maxima
                            var threshold = avg / 3;
                            console.log("Shannon threshold")
                            console.log(threshold)
                            sNoiseArray = [];
                            //looping through the shannon array data to find values above the threshold; these are added to the sNoiseArray
                            for (var i = 0; i < shannArr.length; ++i) {
                                if (shannArr[i] >= threshold) {
                                    sNoiseArray.push(i);
                                }
                            }
                            console.log("SNoises");
                            console.log(sNoiseArray);

                            //cleaning up peaks within 0.05 seconds (they are likely to belong to the same peak)
                            newSNoiseArray = [];

                            //instead of having multiple crosses marking an S point we want just one mark
                            for (var i = 0; i < sNoiseArray.length; ++i) {
                              var tmpArray = [];
                              tmpArray.push(sNoiseArray[i]);
                              var index = i;
                              var sNoiseToCompare = sNoiseArray[index];
                              while (sNoiseArray[index+1] * 0.003 < ((sNoiseToCompare * 0.003) + 0.05)) {
                                  tmpArray.push(sNoiseArray[index + 1]);
                                  sNoiseToCompare = sNoiseArray[index + 1];
                                  ++index;
                              }
                              if (tmpArray.length != 1) {
                                newSNoiseArray.push(tmpArray[Math.round(tmpArray.length / 2)]);
                              }
                              else {
                                newSNoiseArray.push(tmpArray[0]);
                              }
                              i += tmpArray.length;

                            }
                            console.log('newSNoiseArray');
                            console.log(newSNoiseArray);
                            drawGraph(shannArr, 6, "Shannon Energy");

                        }
                    }
                };

                xhr.send(null);

            }).catch(function(error) {
              // Handle any errors
            });
}

/**
 * Calculate the patient's heartrate.
 */
function heartRateCalculation() {
    //peak detection & bpm for raw ECG

    //making a copy of yArrayData array
    var newArr = yArrayData.slice()

    var arrayOfMaxes = []
    var sum = 0
    //retrieving the 15 largest y values in the data array
    for (var i = 0; i < 15; ++i) {
        var max = Math.max(...newArr)
        arrayOfMaxes.push(max)
        sum += max
        var indexOfMax = newArr.indexOf(max)
        if (indexOfMax > -1) {
            newArr.splice(indexOfMax, 1)
        }
    }

    //taking the average of all values in the array of maxima
    var avg = sum / arrayOfMaxes.length
    var squareOfAvg = avg * avg
    //threshold above which R peaks should be detected: 1/3 of the square of the average
    var threshold = squareOfAvg / 3

    //array containing the square of the signal
    var squaredArray = []
    for (var i = 0; i < xyArrayData.length; ++i) {
        if (xyArrayData[i].y > 0) { //otherwise negative values over 1 get added, as the square of a negative becomes positive
            squaredArray.push({
                x: xyArrayData[i].x,
                y: xyArrayData[i].y * xyArrayData[i].y
            })
        }
    }

    var arrayOfValuesGreaterThanThreshold = []
    for (var i = 0; i < squaredArray.length; ++i) {
        var val = squaredArray[i].y
        if (val > threshold) {
            arrayOfValuesGreaterThanThreshold.push({
                x: (squaredArray[i].x.toFixed(2))/1, // dividing by 1 otherwise strings will be stored
                y: val.toFixed(3)/1
            })
        }
    }

    //now need to get rid of the values that belong to the same R peak but are not the maximum of that peak
    var maximaArray = []
    var i = 0
    while (i <= arrayOfValuesGreaterThanThreshold.length - 1) {
        var tmpArray = []
        tmpArray.push(arrayOfValuesGreaterThanThreshold[i])
        var index = i

        while (index < arrayOfValuesGreaterThanThreshold.length - 1 && arrayOfValuesGreaterThanThreshold[index+1].x == (arrayOfValuesGreaterThanThreshold[index].x + 0.01).toFixed(2) && arrayOfValuesGreaterThanThreshold[index+1].y >= arrayOfValuesGreaterThanThreshold[index].y) {
            tmpArray.push(arrayOfValuesGreaterThanThreshold[index+1])
            index += 1
        }


        maximaArray.push({
            x: arrayOfValuesGreaterThanThreshold[index].x,
            y: Math.sqrt(arrayOfValuesGreaterThanThreshold[index].y)
        })

        while (index < arrayOfValuesGreaterThanThreshold.length - 1 && arrayOfValuesGreaterThanThreshold[index+1].x == (arrayOfValuesGreaterThanThreshold[index].x + 0.01).toFixed(2) && arrayOfValuesGreaterThanThreshold[index+1].y <= arrayOfValuesGreaterThanThreshold[index].y) {
            tmpArray.push(arrayOfValuesGreaterThanThreshold[index+1])
            index += 1
        }


        //now we are at the next S peak and want to go up from there again -> so go forward in outer for loop
        i += tmpArray.length
    }

    xyArraySpikes = maximaArray
    console.log('xyArray spikes');
    console.log(xyArraySpikes);
    //beats per minute can now be calculated using the number of peaks in the 30 second period
    var bpm = (maximaArray.length / 3 * 6)
    console.log(bpm+'bpm');
    document.getElementById("heartRateParagraph").innerHTML = "Heart Rate: " + bpm + "bpm";

}

/**
 * Do the ECG signal processing.
 */
function ECGSignalProcessing() {
  var sArray = [];
  var tArray = [];
  maxArray = [];

  //using the low pass filter data to detect all maxima
  for (var i = 1; i < lpfArray.length - 2; ++i) {
      var currentIndex = 0;
      if (lpfArray[i-1] <= lpfArray[i] && lpfArray[i+1] <= lpfArray[i] && lpfArray[i-2] <= lpfArray[i] && lpfArray[i+2] <= lpfArray[i] && lpfArray[i-2] <= lpfArray[i-1] && lpfArray[i+2] <= lpfArray[i+1] && (lpfArray[i-2] + 5 < lpfArray[i] || lpfArray[i+2] + 5 < lpfArray[i])) {
          if (lpfArray[i+1] != lpfArray[i]) { //if there is two equal height maxima then we take the second one
              maxArray.push({
                  x: i,
                  y: lpfArray[i]
              });
          }
      }
  }
  //cleaning up array so that the last and first maxima are not used: This is done because we do not know at which part of the ECG cycle the signal starts (P, Q, R, S or T)

  //getting first 3 elements of maxArray
  var arrFirstThree = [];
  for (var i = 0; i < 3; ++i) {
    arrFirstThree[i] = xyArrayData[maxArray[i].x].y;
  }

  var arrLastThree = [];
  arrLastThree[0] = xyArrayData[maxArray[maxArray.length - 3].x].y;
  arrLastThree[1] = xyArrayData[maxArray[maxArray.length - 2].x].y;
  arrLastThree[2] = xyArrayData[maxArray[maxArray.length - 1].x].y;

  //detect how the signal is starting (what part of the ECG cycle?) and adjust the arrays so that signal always start with the P wave
  if (Math.max(...arrFirstThree) == arrFirstThree[0]) {

    //first max is an R
    if (Math.max(...arrLastThree) == arrLastThree[0]) {
      maxArray.splice(0, 2);
      maxArray.splice(maxArray.length - 1, 1);
    } else if (Math.max(...arrLastThree) == arrLastThree[1]) {
      maxArray.splice(0, 2);
      maxArray.splice(maxArray.length - 3, 3);
    } else {
      maxArray.splice(0, 2);
      maxArray.splice(maxArray.length - 2, 2);
    }

  } else if (Math.max(...arrFirstThree) == arrFirstThree[1]) {

    //first max is a P
    if (Math.max(...arrLastThree) == arrLastThree[0]) {
      maxArray.splice(0, 3);
      maxArray.splice(maxArray.length - 1, 1);
    } else if (Math.max(...arrLastThree) == arrLastThree[1]) {
      maxArray.splice(0, 3);
      maxArray.splice(maxArray.length - 3, 3);

    } else {
      maxArray.splice(0, 3);
      maxArray.splice(maxArray.length - 2, 2);
    }
  } else {

    //first max is a T
    if (Math.max(...arrLastThree) == arrLastThree[0]) {
      maxArray.splice(0, 1);
      maxArray.splice(maxArray.length - 1, 1);
    } else if (Math.max(...arrLastThree) == arrLastThree[1]) {
      maxArray.splice(0, 1);
      maxArray.splice(maxArray.length - 3, 3);
    } else {
      maxArray.splice(0, 1);
      maxArray.splice(maxArray.length - 2, 2);
    }
  }

  console.log('maxArray');
  console.log(maxArray);
  var pBegArray = [];
  var tEndArray = [];
  var rPeaks = [];


  for (var i = 0; i < maxArray.length; ++i) { //0 is P, 1, R, 2 is T
      if (i%3 == 0) {
          //maximum is a P
          //do PR Interval using qBegArray and xyArray - this works only because lpfArray shifts the P peaks to the right of where they are in original data


          //this is for Pend detection
          /*
          var tmpTime = maxArray[i].x;
          var currentSmallest = xyArrayData[tmpTime];
          while(currentSmallest.y > xyArrayData[tmpTime+1].y + 0.01) {
              currentSmallest = xyArrayData[tmpTime+1];
              tmpTime += 1;
          }
          pEndArray.push(currentSmallest.x);
          */


          //this is for Pbeg detection
          //need to go all the way up to the peak of P first as the data is fetched from lpfArray peaks, which are shifted to the right of the original peaks
          tmpTime = maxArray[i].x;
          var currentLargest = xyArrayData[tmpTime];
          while(currentLargest.y <= xyArrayData[tmpTime-1].y) {
              currentLargest = xyArrayData[tmpTime-1];
              tmpTime -= 1;
          }
          //now we can move left from the peak in order to find the beginning of P
          currentSmallest = currentLargest;
          while(currentSmallest.y > xyArrayData[tmpTime-1].y + 0.01) {
              currentSmallest = xyArrayData[tmpTime-1];
              tmpTime -= 1;
          }

          pBegArray.push(currentSmallest.x);
      } else if (i%3 == 2) {
          //maximum is a T


          //this is for tBeg detection
          /*
          var tmpTime = maxArray[i].x;
          var currentLargest = xyArrayData[tmpTime];
          while(currentLargest.y <= xyArrayData[tmpTime-1].y) {
              currentLargest = xyArrayData[tmpTime-1];
              tmpTime -= 1;
          }
          //now we can move left from the peak in order to find the beginning of T
          var currentSmallest = currentLargest;
          while(currentSmallest.y > xyArrayData[tmpTime-1].y + 0.01) {
              currentSmallest = xyArrayData[tmpTime-1];
              tmpTime -= 1;
          }
          tBegArray.push(currentSmallest.x)
          */

          //this is for tEnd detection
          tmpTime = maxArray[i].x;
          currentSmallest = xyArrayData[tmpTime];
          while(currentSmallest.y > xyArrayData[tmpTime+1].y + 0.01) {
              currentSmallest = xyArrayData[tmpTime+1];
              tmpTime += 1;
          }
          tEndArray.push(currentSmallest.x);

      }
      else {
        //maximum is an R
        tmpTime = maxArray[i].x;
        var currentLargest = xyArrayData[tmpTime];
        while(currentLargest.y <= xyArrayData[tmpTime-1].y) {
            currentLargest = xyArrayData[tmpTime-1];
            tmpTime -= 1;
        }
        rPeaks.push(currentLargest.x);


      }
  }
  //doing qBeg and sEnd detection for QRS complex and RRInterval detection
  var rrIntervalsSum = 0;
  var rrIntervalsArray = [];
  var qrsIntervalsSum = 0;
  var qrsIntervalAvg;
  var tmpTime;
  console.log("rPeaks");
  console.log(rPeaks);
  for (var i = 0; i < rPeaks.length; ++i) {

      if (i < rPeaks.length - 1) {
          var newRRInterval = rPeaks[i+1] - rPeaks[i];
          rrIntervalsSum += newRRInterval;
          rrIntervalsArray.push(newRRInterval);
      }
      tmpTime = Math.round(rPeaks[i] * 100); //currently time of spike

      var currentQBeg = xyArrayData[tmpTime];
      while (xyArrayData[tmpTime-1].y < currentQBeg.y) {

          currentQBeg = xyArrayData[tmpTime-1];
          tmpTime -= 1;
      }

      //found local min Q, now need to find beginning of QRS interval
      while (xyArrayData[tmpTime-1].y > currentQBeg.y + 0.02) {
          currentQBeg = xyArrayData[tmpTime-1];
          tmpTime -= 1;
      }

      tmpTime =  Math.round(rPeaks[i] * 100); //currently time of spike
      var currentSEnd = xyArrayData[tmpTime];
      while (xyArrayData[tmpTime+1].y < currentSEnd.y) {
          currentSEnd = xyArrayData[tmpTime+1];
          tmpTime += 1;
      }

      //found local min S, now need to find end of QRS interval
      while (xyArrayData[tmpTime+1].y > currentSEnd.y + 0.02) {
          currentSEnd = xyArrayData[tmpTime+1];
          tmpTime += 1;
      }
      //uncomment the following to check for QRS anomalies
      /*
      console.log("sEND: " + currentSEnd.x);
      console.log("qBEG: " + currentQBeg.x);
      console.log(Math.round(currentSEnd.x*1000 - currentQBeg.x*1000));
      */
      qrsIntervalsSum += Math.round(currentSEnd.x*1000 - currentQBeg.x*1000);
      qBegArray.push(currentQBeg);
      sEndArray.push(currentSEnd);

  }

  var avgRRInterval = rrIntervalsSum / rrIntervalsArray.length;
  console.log("RR INTERVAL AVG: " + avgRRInterval * 1000);
  document.getElementById("RRIntervalParagraph").innerHTML = "R-R interval: " + Math.round(avgRRInterval * 1000) + " ms";
  var rrIntervalsDiff = (Math.max(...rrIntervalsArray) - Math.min(...rrIntervalsArray))*1000;
  console.log('RR Max - Min: ' + rrIntervalsDiff);
  document.getElementById("HRV").innerHTML = "Heart Rate Variability (difference between max and min NN): " + Math.round(rrIntervalsDiff) + " ms";
  console.log("QRS COMPLEX AVG: " + qrsIntervalsSum / rPeaks.length);
  document.getElementById("QRSComplexParagraph").innerHTML = "Q-R-S complex: " + Math.round(qrsIntervalsSum / rPeaks.length) + " ms";


  //for SDNN
  var newArr = [];
  var newArrSum = 0;
  for (var i = 0; i < rrIntervalsArray.length; ++i) {
      newArrSum += Math.pow((rrIntervalsArray[i]*1000 - avgRRInterval*1000), 2);
  }
  var newArrAvg = newArrSum / rrIntervalsArray.length;
  var SDNNval = Math.sqrt(newArrAvg);
  document.getElementById("SDNN").innerHTML = "SDNN: " + Math.round(SDNNval) + " ms";

  //for RMSSD
  var newArr2 = [];
  var newArrSum2 = 0;
  for (var i = 0; i < rrIntervalsArray.length - 1; ++i) {
      newArrSum2 += Math.pow((rrIntervalsArray[i]*1000 - rrIntervalsArray[i+1]*1000), 2);
  }
  var newArrAvg2 = newArrSum2 / rrIntervalsArray.length - 1;
  var RMSSDval = Math.sqrt(newArrAvg2);
  document.getElementById("RMSSD").innerHTML = "RMSSD: " + Math.round(RMSSDval) + " ms";

  console.log('pBegArray: ');
  console.log(pBegArray);
  console.log('tEndArray: ');
  console.log(tEndArray);
  var prIntervalsSum = 0;
  var qtIntervalsSum = 0;
  var stIntervalsSum = 0;
  var prSegmentsSum = 0;
  var stSegmentsSum = 0;
  for (var i = 0; i < qBegArray.length; ++i) {
      prIntervalsSum += (qBegArray[i].x - pBegArray[i]).toFixed(3) * 1;
  }
  for (var i = 0; i < tEndArray.length; ++i) {
      qtIntervalsSum += (tEndArray[i] - qBegArray[i].x).toFixed(3) * 1;
      stIntervalsSum += (tEndArray[i] - sEndArray[i].x).toFixed(3) * 1;
  }
  /*
  for (var i = 0; i < pEndArray.length; ++i) {
      prSegmentsSum += (qBegArray[i].x - pEndArray[i]).toFixed(3) * 1;
  }
  for (var i = 0; i < tBegArray.length; ++i) {
      stSegmentsSum += (tBegArray[i] - sEndArray[i].x).toFixed(3) * 1;
  }
  */

  var prIntervalsAvg = (prIntervalsSum / qBegArray.length).toFixed(3) * 1000;
  var qtIntervalsAvg = Math.round(qtIntervalsSum / qBegArray.length * 1000);
  var stIntervalsAvg = Math.round(stIntervalsSum / tEndArray.length * 1000);
  //var prSegmentsAvg = Math.round(prSegmentsSum / pEndArray.length * 1000);
  //var stSegmentsAvg = Math.round(stSegmentsSum / tBegArray.length * 1000);


  console.log('prIntervalsAvg');
  console.log(prIntervalsAvg);
  console.log('qtIntervalsAvg');
  console.log(qtIntervalsAvg);
  console.log('stIntervalsAvg');
  console.log(stIntervalsAvg);
  //console.log('stSegmentsAvg');
  //console.log(stSegmentsAvg);
  //console.log('prSegmentsAvg');
  //console.log(prSegmentsAvg);
  document.getElementById("PRIntervalParagraph").innerHTML = "P-R interval: " + prIntervalsAvg + " ms";
  document.getElementById("QTIntervalParagraph").innerHTML = "Q-T interval: " + qtIntervalsAvg + " ms";
  document.getElementById("STIntervalParagraph").innerHTML = "S-T interval: " + stIntervalsAvg + " ms";
  //document.getElementById("STSegmentParagraph").innerHTML = "S-T segment: " + stSegmentsAvg + " ms";
  //document.getElementById("PRSegmentParagraph").innerHTML = "P-R segment: " + prSegmentsAvg + " ms";
}

/**
 * Apply the Kalman Filter for the signal that is passed in as a parameter using the specified R and Q values.
 * @param {array} arrayIn - The array that contains the data to be filtered.
 * @param {number} rIn - The specified value for R for the filter.
 * @param {number} qIn - The specified value for Q for the filter.
 * @return {array} The filtered array.
 */
function kalmanFilter(arrayIn, rIn, qIn) {
    var kfilter = new KalmanFilter({R: rIn, Q: qIn});
    var dataConstantKalman = arrayIn.map(function(v) {
        return kfilter.filter(v);
    });
    var kalmanArray = dataConstantKalman;
    return kalmanArray;
}

/**
 * Apply the low pass filter for the signal that is passed in as a parameter.
 * @param {array} arrayIn - The array that contains the data to be filtered.
 * @return {array} The filtered array.
 */
function lowPassFilter(arrayIn) {
    var lpfPreArrayData = [];
    for (var i = 0; i < arrayIn.length; ++i) {
        lpfPreArrayData[i] = arrayIn[i] * 1000;
    }
    lpf.smoothing = 0.1;
    lpfArray = lpf.smoothArray(lpfPreArrayData);
    console.log("Low Pass");
    console.log(lpfArray);
    return lpfArray;
}

/**
 * Draw the graph for the data that is passed in as a parameter. This graph is created using a CanvasJS.Chart and inserted in the html chart container specified with the specified title.
 * @param {array} arrayIn - The array that contains the data to be plotted.
 * @param {number} chartContainerNumber - The html container in which the chart should be inserted.
 * @param {string} titleIn - The title of the chart.
 */
function drawGraph(arrayIn, chartContainerNumber, titleIn) {
  var limit = 100000;    //increase number of dataPoints by increasing the limit
  var y = 0;
  var data = [];
  var dataSeries = { type: "line", color: "black" };
  var myDataPoints = [];
  var time = 0;
  for (var i = 0; i < arrayIn.length; i++) {
        if (chartContainerNumber <= 3) { //ECG
            if (chartContainerNumber == 2) {
                myDataPoints.push({
                    x: time,
                    y: parseFloat(arrayIn[i])/1000
                });
            }
            else {
                myDataPoints.push({
                    x: time,
                    y: parseFloat(arrayIn[i])*1
                });
            }
            time += 0.01;
            time = parseFloat(time.toFixed(3));
        }
        else { //PCG
            if (chartContainerNumber == 4) {
                myDataPoints.push({
                    x: time,
                    y: arrayIn[i].y/1000
                });
            }
            else {
                myDataPoints.push({
                    x: time,
                    y: arrayIn[i]/1000
                });
            }
            time += 0.003;
            time = parseFloat(time.toFixed(3));
        }
  }
  dataSeries.dataPoints = myDataPoints;
  data.push(dataSeries);
  var chart = new CanvasJS.Chart("chartContainer"+chartContainerNumber.toString(), {
      zoomEnabled: true,
      animationEnabled: true,
      title: {
          text: titleIn
      },
      axisX: {
          labelAngle: 30,
          title: "Time (seconds)",
          stripLines: xAxisStripLinesArray,
          gridThickness: 0,
          gridColor:"#FF0000",
          lineColor:"#FF0000",
          tickColor:"#FF0000",
          labelFontColor:"#FF0000",
      },
      axisY: {
          includeZero: false,
          labelAngle: 30,
          title: "Voltage (mV)",
          stripLines:yAxisStripLinesArray,
          gridThickness: 0,
          gridColor:"#FF0000",
          lineColor:"#FF0000",
          tickColor:"#FF0000",
          labelFontColor:"#FF0000",
      },
      data: data
  });

  if(chartContainerNumber > 3) {
      chart.options.axisY.title = "Amplitude";
      chart.options.axisX.stripLines = [];
      chart.options.axisY.stripLines = [];
  }

  //adding sNoises as crosses for the Shannon chart
  if (chartContainerNumber == 6) {
      chart.options.axisY.title = "Energy Amplitude";
      for (var i = 0; i < newSNoiseArray.length; ++i) {
          var yIn = shannArr[newSNoiseArray[i]] / 1000;
          chart.options.data[0].dataPoints[newSNoiseArray[i]] = { x: newSNoiseArray[i] * 0.003, y: yIn,  indexLabel: "S", markerType: "cross", markerColor: "red", markerSize: 5 };
      }
  }

  if (chartContainerNumber == 7) {
      chart.options.axisX.title = "Frequency";
  }
  chart.render();
}

/**
 * Empty the arrays in this method so that when the selected patient changes new data does not get appended to the existing data but the existing data gets replaced.
 */
function emptyArrays() {
    textArea.value = "";
    xyArrayData = [];
    pcgArrayData = [];
    pcgYArrayData = [];
    yArrayData = [];
    lpfArray = [];
    qBegArray = [];
    sEndArray = [];
    xyArraySpikes = [];
    sNoiseArray = [];
    shannArr = [];
    newSNoiseArray = [];
    //tBegArray = [];
    //pEndArray = [];
    maxArray = [];
}
