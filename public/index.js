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
    //var pathReference = storageRef.child('ECGdata/'+patientKey+'.txt');
    var pathReference = storageRef.child(patientKey+'.txt');


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
                    //This replaces multiple spaces in the text file by a single space character
                    var modifiedString = reduceWhitespaces(allText)

                    //now we can split the string by single whitespace
                    words = modifiedString.split(" ")

                    var time = 0;

                    //loop through lines and add each datapoint to array, which will be used for the graphs later on.
                    //start at index i = 4, as up to that is just description of the file
                    for (var i = 3; i < words.length - 1; i++) {
                          if (i % 3 == 1) { //ie. 4, 7, 10 - these are all ECG values
                              xyArrayData.push({
                                  x: time,
                                  y: parseFloat(words[i]).toFixed(4)*1
                              })
                              yArrayData.push(parseFloat(words[i]).toFixed(4)*1)
                          }
                          if (i % 3 == 2) { //ie. 5, 8, 11 - these are all PCG values
                              pcgArrayData.push({
                                  x: time,
                                  y: parseFloat(words[i]).toFixed(4)*1*100000
                              })
                              pcgYArrayData.push(parseFloat(words[i]).toFixed(4)*1*100000)
                              time += 0.005
                              time = parseFloat(time.toFixed(3))
                          }


                    }
                    console.log('xyArrayData');
                    console.log(xyArrayData);
                    console.log('yArrayData');
                    console.log(yArrayData);
                    console.log('pcgArrayData')
                    console.log(pcgArrayData)
                    console.log('pcgYArrayData')
                    console.log(pcgYArrayData)


                    //ECG heart rate calculation
                    heartRateCalculation();

                    //low pass filter
                    drawGraph(lowPassFilter(yArrayData), 2, "Low Pass Filter");

                    //for high pass filter uncomment below
                    /*
                    var copyOfArr = new Float64Array(yArrayData.length);
                    for (var i = 0; i < yArrayData.length-1; ++i) {
                        copyOfArr[i] = yArrayData[i];
                    }

                    var filter = new dsp.IIRFilter(dsp.HIGHPASS, 1, 1, 200);
                    filter.process(copyOfArr)
                    drawGraph(copyOfArr, 2, "High Pass Filter");
                    */


                    ECGSignalProcessing(0.005);

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
    for (var i = 0; i < 40; i = i + 0.04) {
            xAxisStripLinesArray.push({value:i,thickness:0.125, color:"#FF0000"});
    }
    for (var i = 0; i < 40; i = i + 0.2) {
            xAxisStripLinesArray.push({value:i,thickness:0.375, color:"#FF0000"});
    }
    for (var i = -5; i < 5; i = i + 0.1) {
            yAxisStripLinesArray.push({value:i,thickness:0.125, color:"#FF0000"});
    }
    for (var i = -5; i < 5; i = i + 0.5) {
            yAxisStripLinesArray.push({value:i,thickness:0.375, color:"#FF0000"});
    }
}

function reduceWhitespaces(stringToManipulate) {
  //This replaces multiple spaces in the text file by a single space character
  return stringToManipulate.replace(/\s+/g, ' ')
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

    drawGraph(pcgArrayData, 4, "PCG");


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
    var newArray = sortArray(shannArr.slice())
    //array for the maxima of the shannon array
    var newMax = [];
    //we want to have the same number of maxima as the number of R peaks in the raw ECG data
    for (var i = newArray.length - 1; newMax.length < xyArraySpikes.length; --i) {
        newMax.push(newArray[i]);
    }
    //computing average of the peaks (potentially S1's) to get a threshold for the peak detection of s1 and s2
    var avg = getAverage(newMax)
    //the threshold is usually sufficient as 1/4 of the average of the maxima
    var threshold = avg / 4;
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

    //cleaning up peaks within 0.25 seconds (they are likely to belong to the same peak)
    newSNoiseArray = [];

    //instead of having multiple crosses marking an S point we want just one mark
    for (var i = 0; i < sNoiseArray.length; ++i) {
          var tmpArray = [];
          tmpArray.push(sNoiseArray[i]);
          var index = i;
          var sNoiseToCompare = sNoiseArray[index];
          while (sNoiseArray[index+1] * 0.005 < ((sNoiseToCompare * 0.005) + 0.25)) {
              tmpArray.push(sNoiseArray[index + 1]);
              sNoiseToCompare = sNoiseArray[index + 1];
              ++index;
          }

          //find the largest element of the group of the SNoises
          var tmpArray2 = [] //need to get the y values from the shannonEnergy array, as the tmpArray only contains the index of the datapoint
          for (var j = 0; j < tmpArray.length; ++j) {
              tmpArray2[j] = shannArr[tmpArray[j]]
          }

          var max = Math.max(...tmpArray2)
          var maxIndex = tmpArray2.indexOf(max);

          //add the largest element to the final array
          if (tmpArray.length != 1) {
              newSNoiseArray.push(tmpArray[maxIndex]);
          }
          else {
              newSNoiseArray.push(tmpArray[0]);
          }
          i += tmpArray.length - 1;

    }
    console.log('newSNoiseArray');
    console.log(newSNoiseArray);

    drawGraph(shannArr, 6, "Shannon Energy");


    //Fast Fourier Transform
    var newArr = new Float64Array(4096); //4096 for full range, 256 for first two sounds
    //4096 because it has to be a power of 2
    for (var i = 0; i < 4096; ++i) {
        newArr[i] = pcgYArrayData[i]
    }
    var mean = getAverage(newArr)

    for (var i = 0; i < 4096; ++i) { //removing the mean from each datapoint in order to remove DC component
        newArr[i] -= mean
    }
    var fft = new dsp.FFT(4096, 200);
    fft.forward(newArr);
    var spectrum = fft.spectrum;
    drawGraph(spectrum, 7, "Fast Fourier Transform");

    /*
    var copyOfArr = new Float64Array(yArrayData.length);
    for (var i = 0; i < yArrayData.length-1; ++i) {
        copyOfArr[i] = yArrayData[i];
    }

    var filter = new dsp.IIRFilter(dsp.HIGHPASS, 1, 1, 200);
    filter.process(copyOfArr)
    drawGraph(copyOfArr, 2, "High Pass Filter");
    */


}

/**
 * Sort an array in ascending order.
 * @param {array} arrayIn - The array to be sorted.
 * @return {array} The sorted array.
 */
function sortArray(arrayIn) {
    return arrayIn.sort(function(a,b) { return a - b;});
}

/**
 * Calculate the patient's heartrate.
 */
function heartRateCalculation() {
    //peak detection & bpm for raw ECG

    //retrieving the 15 largest y values in the data array & making a copy of yArrayData array
    var arrayOfMaxes = retrieveLargestDatapoints(yArrayData.slice())

    //taking the average of all values in the array of maxima
    var avg = getAverage(arrayOfMaxes)
    var squareOfAvg = avg * avg
    //threshold above which R peaks should be detected: 1/3 of the square of the average
    var threshold = squareOfAvg / 3

    //array containing the square of the signal
    var squaredArray = squareArray(xyArrayData)

    var arrayOfValuesGreaterThanThreshold = []
    for (var i = 0; i < squaredArray.length; ++i) {
        var val = squaredArray[i].y
        if (val > threshold) {
            arrayOfValuesGreaterThanThreshold.push({
                x: (squaredArray[i].x.toFixed(3))/1, // dividing by 1 otherwise strings will be stored
                y: val.toFixed(3)/1
            })
        }
    }

    //now need to get rid of the values that belong to the same R peak but are not the maximum of that peak
    xyArraySpikes = getRidOfSamePeakPoints(arrayOfValuesGreaterThanThreshold)
    console.log('xyArray spikes');
    console.log(xyArraySpikes);
    //beats per minute can now be calculated using the number of peaks in the 30 second period
    var bpm = calculateBPM(xyArraySpikes, xyArrayData[xyArrayData.length - 1].x)
    console.log(bpm+'bpm');
    document.getElementById("heartRateParagraph").innerHTML = "Heart Rate: " + Math.round(bpm) + "bpm";

}

/**
 * Retrieve the 15 largest elements wihin a one dimensional array of numbers.
 * @param {array} arrayIn - The array of numbers to be used.
 * @return {array} The array containing the 15 largest elements.
 */
function retrieveLargestDatapoints(arrayIn) {
    var returnArray = []
    for (var i = 0; i < 15; ++i) {
        var max = Math.max(...arrayIn)
        returnArray.push(max)
        var indexOfMax = arrayIn.indexOf(max)
        if (indexOfMax > -1) {
            arrayIn.splice(indexOfMax, 1)
        }
    }
    return returnArray
}

/**
 * Calculate the average of a one dimensional array of numbers.
 * @param {array} arrayIn - The array of numbers to be used.
 * @return {number} The average of the elements in the array that was passed in as parameter.
 */
function getAverage(arrayIn) {
    var sum = 0;
    for (var i = 0; i < arrayIn.length; ++i) {
        sum += arrayIn[i]
    }
    return sum / arrayIn.length
}

/**
 * Calculate the beats per minute (bpm) based on the array of maxima and the length of the recording.
 * @param {array} maximaArray - The array of maxima (xyArraySpikes).
 * @param {number} lengthOfRecording - The length of the recording in seconds.
 * @return {number} The number of spikes per minute or the number of beats per minute.
 */
function calculateBPM(maximaArray, lengthOfRecording) {
    var spikesPerTenSeconds = maximaArray.length / lengthOfRecording * 10
    return spikesPerTenSeconds * 6
}

/**
 * Square the y values of the array passed in as parameter.
 * @param {array} arrayToBeSquared - The array that should be squared.
 * @return {array} The squared array.
 */
function squareArray(arrayToBeSquared) {
    var returnArray = []
    for (var i = 0; i < arrayToBeSquared.length; ++i) {
        if (arrayToBeSquared[i].y > 0) { //otherwise negative values over 1 get added, as the square of a negative becomes positive
            returnArray.push({
                x: arrayToBeSquared[i].x,
                y: arrayToBeSquared[i].y * arrayToBeSquared[i].y
            })
        } //else the value will no be an r peak, as a negative or 0 amplitude, so this case can be neglected
    }
    return returnArray
}

/**
 * Get rid of all the points that belong to the same R-peak and use only their maximum.
 * @param {array} arrayIn - The array that should be used to find the single maxima.
 * @return {array} The final array including all final R-peaks.
 */
function getRidOfSamePeakPoints(arrayIn) {
    var maximaArray = []
    var tmpArray = []
    for (var i = 0; i < arrayIn.length; ++i) {
            if (i != arrayIn.length - 1 && parseFloat(arrayIn[i+1].x.toFixed(3)) == parseFloat((arrayIn[i].x + 0.005).toFixed(3))) {

                    tmpArray.push(arrayIn[i])

            } else if (i == arrayIn.length - 1 && tmpArray.length == 0) {

                    maximaArray.push({
                        x: arrayIn[i].x,
                        y: Math.sqrt(arrayIn[i].y)
                    })

            } else {

                    tmpArray.push(arrayIn[i])
                    var maxDatapoint = tmpArray[0]
                    for (var j = 1; j < tmpArray.length; ++j) {
                      if (tmpArray[j].y > maxDatapoint.y) {
                        maxDatapoint = tmpArray[j]
                      }
                    }
                    //add max from tmpArray
                    maximaArray.push({
                        x: maxDatapoint.x,
                        y: Math.sqrt(maxDatapoint.y)
                    })
                    tmpArray = []

            }
    }
    return maximaArray
}



/**
 * Do the ECG signal processing.
 * @param {number} gradientValue - The value that is used to detect Q, S and the P and T wave.
 */
function ECGSignalProcessing(gradientValue) {
    var sArray = [];
    var tArray = [];
    maxArray = [];

    //detect p's, r's and t's
    //not using the first and last spike as this might cause to problems in case the recording does not end with T wave for example
    var rrIntervalsSum = 0;
    var rrIntervalsArray = [];
    var qrsIntervalsSum = 0;
    var prIntervalsSum = 0;
    var qtIntervalsSum = 0;
    var stIntervalsSum = 0;
    var prSegmentsSum = 0;
    var stSegmentsSum = 0;

    for (var i = 1; i < xyArraySpikes.length - 2; ++i) {
        //find T:
        /*
        Find T:
        1) find sEnd
        --2)-find-tBeg--
        3) find T
        4) find tEnd
        */
        var newRRInterval = xyArraySpikes[i+1].x - xyArraySpikes[i].x;
        rrIntervalsSum += newRRInterval;
        rrIntervalsArray.push(newRRInterval);

        tmpTime = Math.round(xyArraySpikes[i].x / 0.005); //currently time of spike
        var currentSEnd = xyArrayData[tmpTime];
        while (xyArrayData[tmpTime+1].y <= currentSEnd.y) {
            currentSEnd = xyArrayData[tmpTime+1];
            tmpTime += 1;
        }
        //found local min S, now need to find end of QRS interval

        while (xyArrayData[tmpTime+1].y > currentSEnd.y && xyArrayData[tmpTime+1].y >= currentSEnd.y + gradientValue) {
            currentSEnd = xyArrayData[tmpTime+1];
            tmpTime += 1;
        }
        //console.log(currentSEnd)
        //found sEnd


        //find T peak by finding next local max in lpfArray from sEnd
        var currentTPeak = lpfArray[tmpTime]

        while (lpfArray[tmpTime+1] <= currentTPeak) {
            currentTPeak = lpfArray[tmpTime+1];
            tmpTime += 1;
        }

        while (lpfArray[tmpTime+1] >= currentTPeak) {
            currentTPeak = lpfArray[tmpTime+1];
            tmpTime += 1;
        }
        //console.log(currentTPeak)
        //found TPeak in lpfArray, now need to loop left to find it in raw data array, as low pass filter shifts peaks to the right

        var copyOfCurrentTime = tmpTime
        var currentTPeak = xyArrayData[copyOfCurrentTime]
        while (xyArrayData[copyOfCurrentTime-1].y >= currentTPeak.y) {
            currentTPeak = xyArrayData[copyOfCurrentTime-1];
            copyOfCurrentTime -= 1;
        }

        //console.log(currentTPeak)
        //found real TPeak

        //find tEnd
        var currentTEnd = xyArrayData[tmpTime]
        while (xyArrayData[tmpTime+1].y < currentTEnd.y - gradientValue) {
            currentTEnd = xyArrayData[tmpTime+1];
            tmpTime += 1;
        }
        //found tEnd


        /*
        Find P:
        1) find qBeg
        --2)-find-pEnd--
        3) find P
        4) find pBeg
        */

        tmpTime = Math.round(xyArraySpikes[i].x / 0.005); //currently time of spike
        var currentQBeg = xyArrayData[tmpTime];
        while (xyArrayData[tmpTime-1].y <= currentQBeg.y) {
            currentQBeg = xyArrayData[tmpTime-1];
            tmpTime -= 1;
        }
        //found local min Q, now need to find start of QRS interval

        while (xyArrayData[tmpTime-1].y > currentQBeg.y && xyArrayData[tmpTime-1].y >= currentQBeg.y + gradientValue) {
            currentQBeg = xyArrayData[tmpTime-1];
            tmpTime -= 1;
        }
        //found qBeg

        //find P peak
        var currentPPeak = lpfArray[tmpTime]

        while (lpfArray[tmpTime-1] >= currentPPeak) {
            currentPPeak = lpfArray[tmpTime-1];
            tmpTime -= 1;
        }
        //found PPeak in lpfArray, now need to loop left to find it in raw data array

        var currentPPeak = xyArrayData[tmpTime]
        while (xyArrayData[tmpTime-1].y >= currentPPeak.y) {
            currentPPeak = xyArrayData[tmpTime-1];
            tmpTime -= 1;
        }
        //found real PPeak

        //find pBeg
        var currentPBeg = xyArrayData[tmpTime]
        while (xyArrayData[tmpTime-1].y < currentPBeg.y) {
            currentPBeg = xyArrayData[tmpTime-1];
            tmpTime -= 1;
        }
        //found pBeg

        //uncomment the following to check for QRS anomalies
        /*
        console.log("sEND: " + currentSEnd.x);
        console.log("qBEG: " + currentQBeg.x);
        console.log(Math.round(currentSEnd.x*1000 - currentQBeg.x*1000));
        */

        console.log("Pbeg: " + currentPBeg.x)
        console.log("PPeak: " + currentPPeak.x)
        console.log("QBeg: " + currentQBeg.x)
        console.log("SEnd: " + currentSEnd.x)
        console.log("TPeak: " + currentTPeak.x)
        console.log("TEnd: " + currentTEnd.x)



        qrsIntervalsSum += Math.round(currentSEnd.x*1000 - currentQBeg.x*1000);
        prIntervalsSum += (currentQBeg.x - currentPBeg.x).toFixed(3) * 1;
        qtIntervalsSum += (currentTEnd.x - currentQBeg.x).toFixed(3) * 1;
        stIntervalsSum += (currentTEnd.x - currentSEnd.x).toFixed(3) * 1;
        /*
        prSegmentsSum += (currentPBeg.x - currentPEnd.x).toFixed(3) * 1;
        stSegmentsSum += (currentTBeg.x - currentSEnd.x).toFixed(3) * 1;
        */

    }
    var avgRRInterval = rrIntervalsSum / rrIntervalsArray.length;
    var rrIntervalsDiff = (Math.max(...rrIntervalsArray) - Math.min(...rrIntervalsArray))*1000;
    var prIntervalsAvg = (prIntervalsSum / (xyArraySpikes.length - 2)).toFixed(3) * 1000;
    var qtIntervalsAvg = Math.round(qtIntervalsSum / (xyArraySpikes.length - 2) * 1000);
    var stIntervalsAvg = Math.round(stIntervalsSum / (xyArraySpikes.length - 2) * 1000);
    //var prSegmentsAvg = Math.round(prSegmentsSum / pEndArray.length * 1000);
    //var stSegmentsAvg = Math.round(stSegmentsSum / tBegArray.length * 1000);
    console.log('rrIntervalsAvg');
    console.log(avgRRInterval * 1000);
    console.log('RR Max - Min:')
    console.log(rrIntervalsDiff)
    console.log('qrsComplexAvg')
    console.log(qrsIntervalsSum / (xyArraySpikes.length - 2))
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

    document.getElementById("RRIntervalParagraph").innerHTML = "R-R interval: " + Math.round(avgRRInterval * 1000) + " ms";
    document.getElementById("HRV").innerHTML = "Heart Rate Variability (difference between max and min NN): " + Math.round(rrIntervalsDiff) + " ms";
    document.getElementById("QRSComplexParagraph").innerHTML = "Q-R-S complex: " + Math.round(qrsIntervalsSum / (xyArraySpikes.length - 2)) + " ms";
    document.getElementById("PRIntervalParagraph").innerHTML = "P-R interval: " + prIntervalsAvg + " ms";
    document.getElementById("QTIntervalParagraph").innerHTML = "Q-T interval: " + qtIntervalsAvg + " ms";
    document.getElementById("STIntervalParagraph").innerHTML = "S-T interval: " + stIntervalsAvg + " ms";
    //document.getElementById("STSegmentParagraph").innerHTML = "S-T segment: " + stSegmentsAvg + " ms";
    //document.getElementById("PRSegmentParagraph").innerHTML = "P-R segment: " + prSegmentsAvg + " ms";


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
            time += 0.005;
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
                    y: parseFloat(arrayIn[i])/1000
                });
            }
            time += 0.005;
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
          chart.options.data[0].dataPoints[newSNoiseArray[i]] = { x: newSNoiseArray[i] * 0.005, y: yIn,  indexLabel: "S", markerType: "cross", markerColor: "red", markerSize: 5 };
      }
  }

  if (chartContainerNumber == 7) {
      chart.options.axisX.title = "Frequency";
      chart.options.axisY.title = "FFT Magnitude";
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
