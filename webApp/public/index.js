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
var xyArraySpikes = []; //array containing all real R-peaks
var sNoiseArray = []; //array that keeps x coordinates of the s noises over the specified PCG threshold
var shannArr = []; //containing Shannon energy data points
var newSNoiseArray = []; //array to get rid of adjacent S points and output only the most central one
var interval = 0.000 //time interval at which samples are taken

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
 * Add strip lines to the ECG graphs. ECG paper speed is ordinarily 25 mm/sec. Therefore:
 * 1) 1 mm (thin lines) = 0.04 sec & 5 mm (bold lines) = 0.2 sec
 * 2) 1 mm (thin lines) = 0.1 mV & 5 mm (bold lines) = 0.5 mV
 */
function addStripLines(){
    for (var i = 0; i < 40; i += 0.04) {
            xAxisStripLinesArray.push({value:i, thickness:0.125, color:"#FF0000"});
    }
    for (var i = 0; i < 40; i += 0.2) {
            xAxisStripLinesArray.push({value:i, thickness:0.375, color:"#FF0000"});
    }
    for (var i = -5; i < 5; i += 0.1) {
            yAxisStripLinesArray.push({value:i, thickness:0.125, color:"#FF0000"});
    }
    for (var i = -5; i < 5; i += 0.5) {
            yAxisStripLinesArray.push({value:i, thickness:0.375, color:"#FF0000"});
    }
}

/**
 * Update the graphs to visualise the recordings of the selected patient.
 * 1. Look in storageref for 'patientkey'.txt file.
 * 2. Download file.
 * 3. Read file and convert into array of values.
 * 4. Draw graphs and do signal processing.
 * @param {string} patientKey - The id of the currently selected patient (ie. patient1).
 */
function updateGraphs(patientKey) {

    // Create a reference with an initial file path and name
    var storageRef = storage.ref();
    var pathReference = storageRef.child(patientKey+'.txt');

    pathReference.getDownloadURL().then(function(url) {
        // 'url' is the download URL

        // can be downloaded directly by making use of an XMLHttpRequest:
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'text';
        xhr.send();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {  // Makes sure the document is ready to parse.
                if (xhr.status === 200) {  // Makes sure the file has been found.
                    allText = xhr.responseText;
                    //This replaces multiple spaces in the text file by a single space character
                    var modifiedString = reduceWhitespaces(allText);

                    //now we can split the string by single whitespace
                    words = modifiedString.split(" ");

                    var time = 0.000;
                    interval = parseFloat((parseFloat(words[6]) - parseFloat(words[3])).toFixed(3)); //detects the sampling rate of the recording

                    //loop through lines and add each datapoint to array, which will be used for the graphs later on.
                    //start at index i = 4, as up to that is just description of the file
                    for (var i = 3; i < words.length - 1; i++) {
                          if (i % 3 == 1) { //ie. 4, 7, 10 - these are all ECG values
                              xyArrayData.push({
                                  x: time,
                                  y: parseFloat(words[i]).toFixed(4)*1
                              });
                              yArrayData.push(parseFloat(words[i]).toFixed(4)*1);
                          }
                          if (i % 3 == 2) { //ie. 5, 8, 11 - these are all PCG values
                              pcgArrayData.push({
                                  x: time,
                                  y: parseFloat(words[i]).toFixed(4)*1*100000
                              });
                              pcgYArrayData.push(parseFloat(words[i]).toFixed(4)*1*100000);
                              time = parseFloat((time + interval).toFixed(3)); //increment the current time by the specified interval
                          }

                    }
                    console.log('xyArrayData');
                    console.log(xyArrayData);
                    console.log('yArrayData');
                    console.log(yArrayData);
                    console.log('pcgArrayData');
                    console.log(pcgArrayData);
                    console.log('pcgYArrayData');
                    console.log(pcgYArrayData);

                    //THE FOLLOWING MUST BE CALLED INSIDE OF THIS FUNCTION BECAUSE OF ITS ASYNCHRONOUS NATURE
                    heartRateCalculation();
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
                    drawGraph(yArrayData, 1, "ECG"); //ECG
                    ECGSignalProcessing(interval);
                    drawGraph(pcgArrayData, 2, "PCG");
                    processPCG(patientKey, interval); //PCG
                    fastFourierTransform(); //FFT
                    drawGraph(lowPassFilter(yArrayData), 4, "Filtered ECG - Low Pass Filter"); //lowPassFilter
                }
            }
        };

        xhr.send(null);

    }).catch(function(error) {
        // Handle any errors
    });
}

/**
 * Reduce multiple whitespaces in a string to become single whitespaces. This is used for reading the .txt file containing the recordings.
 * @param {string} stringToManipulate - The string that should be used to reduce its whitespaces - this is usually the complete .txt as a string.
 * @return {string} The modified string.
 */
function reduceWhitespaces(stringToManipulate) {
  //This replaces multiple spaces in the text file by a single space character
  return stringToManipulate.replace(/\s+/g, ' ');
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
 * @param {string} recipient - The string specifying the name of the recipient.
 */
global.submitText = function(recipient) {
  //only if the text area is not empty
    if(textArea.value != "") {
        db.ref("messages/" + recipient + " " + getDate()).set(textArea.value);
        window.alert("Message has been stored on the database!");
    }
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
   var dateTime = day + "-" + month + "-" + year;
   return dateTime;
}

/**
 * Process the PCG signal.
 * @param {string} patientKey - The id of the currently selected patient.
 * @param {number} intervalValue - The time interval at which samples are taken (in seconds).
 */
function processPCG(patientKey, intervalValue) {

    //Kalman filter
    var kalmanArray = kalmanFilter(pcgYArrayData, 5000, 1000);
    drawGraph(kalmanArray, 5, "Filtered PCG - Kalman Filter");

    //Shannon energy
    produceShannonEnergy(kalmanArray);
    console.log("Shannon Energy");
    console.log(shannArr);
    //making a copy of the shannonEnergy output as we want to sort the array, but not affect the original array
    var newArray = sortArray(shannArr.slice());
    //array for the maxima of the shannon array
    var newMax = [];
    //we want to have the same number of maxima as the number of R peaks in the raw ECG data
    for (var i = newArray.length - 1; newMax.length < xyArraySpikes.length; --i) {
        newMax.push(newArray[i]);
    }
    //computing average of the peaks (potentially S1's) to get a threshold for the peak detection of s1 and s2
    var avg = getAverage(newMax);
    //the threshold is usually sufficient as 1/4 of the average of the maxima
    var threshold = avg / 4;
    console.log("Shannon threshold");
    console.log(threshold);
    sNoiseArray = [];
    //looping through the shannon array data to find values above the threshold; these are added to the sNoiseArray
    for (var i = 0; i < shannArr.length; ++i) {
        if (shannArr[i] >= threshold) {
            sNoiseArray.push(i);
        }
    }

    //cleaning up peaks within 0.25 seconds (they are likely to belong to the same peak / noise)
    newSNoiseArray = cleanUpSNoiseArray(sNoiseArray)
    console.log('newSNoiseArray');
    console.log(newSNoiseArray);

    //draw the Shannon Energy graph, marking the S sounds that have been detected
    drawGraph(shannArr, 6, "Shannon Energy");
}

/**
 * Produce Shannon's energy of the signal array that is passed in as parameter.
 * @param {array} arrayIn - The array that should be manipulated and used to produce Shannon's energy.
 */
function produceShannonEnergy(arrayIn) {
    for (var i = 0; i < arrayIn.length; ++i) { //using kalman filtered PCG signal for noise reduction
        var shannVal;
        if (Math.pow(arrayIn[i], 2) == 0) {
            // since log of 0 is undefined
            shannVal = 0;
        }
        else {
            shannVal = Math.pow(0 - arrayIn[i], 2) * Math.log(Math.pow(arrayIn[i], 2)) / 1000000;
        }
        shannArr.push(shannVal);
    }
}

/**
 * Reduce the input array to only contain one mark for each sound. Instead of having multiple crosses marking an S point we want just one mark: the maximum.
 * @param {array} arrayIn - The array that contains all values in the Shannon's energy array that are above the specified threshold.
 * @return {array} The final array containing all detected S sounds.
 */
function cleanUpSNoiseArray(arrayIn) {
    var arrayToReturn = [];
    for (var i = 0; i < arrayIn.length; ++i) {
          var tmpArray = [];
          tmpArray.push(arrayIn[i]);
          var index = i;
          var sNoiseToCompare = arrayIn[index];
          while (arrayIn[index+1] * interval < ((sNoiseToCompare * interval) + 0.25)) {
              tmpArray.push(arrayIn[index + 1]);
              sNoiseToCompare = arrayIn[index + 1];
              ++index;
          }

          //find the largest element of the group of the SNoises
          var tmpArray2 = []; //need to get the y values from the shannonEnergy array, as the tmpArray only contains the index of the datapoint
          for (var j = 0; j < tmpArray.length; ++j) {
              tmpArray2[j] = shannArr[tmpArray[j]];
          }

          var max = Math.max(...tmpArray2);
          var maxIndex = tmpArray2.indexOf(max);

          //add the largest element to the final array
          if (tmpArray.length != 1) {
              arrayToReturn.push(tmpArray[maxIndex]);
          }
          else {
              arrayToReturn.push(tmpArray[0]);
          }
          i += tmpArray.length - 1;

    }
    return arrayToReturn;
}

/**
 * Produce the FFT of the pcgYArrayData array. This output is then plotted in a graph.
 */
function fastFourierTransform() {
    var newArr = new Float64Array(4096); //4096 for full range, 256 for first two sounds
    //4096 because it has to be a power of 2
    for (var i = 0; i < 4096; ++i) {
        newArr[i] = pcgYArrayData[i];
    }
    var mean = getAverage(newArr);

    for (var i = 0; i < 4096; ++i) { //removing the mean from each datapoint in order to remove DC component
        newArr[i] -= mean;
    }
    var fft = new dsp.FFT(4096, 200);
    fft.forward(newArr);
    var spectrum = fft.spectrum;
    console.log("Fourier");
    console.log(spectrum);
    drawGraph(spectrum, 3, "Fast Fourier Transform");
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

    //retrieving the 25 largest y values in the data array & making a copy of yArrayData array
    var arrayOfMaxes = retrieveLargestDatapoints(yArrayData.slice());

    //taking the average of all values in the array of maxima
    var avg = getAverage(arrayOfMaxes);

    var squareOfAvg = avg * avg;

    //threshold above which R peaks should be detected: 1/4 of the square of the average
    var threshold = squareOfAvg / 4;

    //array containing the square of the signal
    var squaredArray = squareArray(xyArrayData);

    var arrayOfValuesGreaterThanThreshold = [];
    for (var i = 0; i < squaredArray.length; ++i) {
        var val = squaredArray[i].y;
        if (val > threshold) {
            arrayOfValuesGreaterThanThreshold.push({
                x: squaredArray[i].x, // dividing by 1 otherwise strings will be stored
                y: val.toFixed(3)/1
            });
        }
    }

    //now need to get rid of the values that belong to the same R peak but are not the maximum of that peak
    xyArraySpikes = getRidOfSamePeakPoints(arrayOfValuesGreaterThanThreshold, interval);
    console.log('xyArray spikes');
    console.log(xyArraySpikes);
    //beats per minute can now be calculated using the number of peaks in the 30 second period
    var bpm = calculateBPM(xyArraySpikes, xyArrayData[xyArrayData.length - 1].x);
    console.log(bpm+'bpm');
    document.getElementById("heartRateParagraph").innerHTML = "Heart Rate: " + Math.round(bpm) + "bpm";

}

/**
 * Retrieve the 25 largest elements wihin a one dimensional array of numbers.
 * @param {array} arrayIn - The array of numbers to be used.
 * @return {array} The array containing the 25 largest elements.
 */
function retrieveLargestDatapoints(arrayIn) {
    var returnArray = [];
    for (var i = 0; i < 25; ++i) {
        var max = Math.max(...arrayIn);
        returnArray.push(max);
        var indexOfMax = arrayIn.indexOf(max);
        if (indexOfMax > -1) {
            arrayIn.splice(indexOfMax, 1);
        }
    }
    return returnArray;
}

/**
 * Calculate the average of a one dimensional array of numbers.
 * @param {array} arrayIn - The array of numbers to be used.
 * @return {number} The average of the elements in the array that was passed in as parameter.
 */
function getAverage(arrayIn) {
    var sum = 0;
    for (var i = 0; i < arrayIn.length; ++i) {
        sum += arrayIn[i];
    }
    return sum / arrayIn.length;
}

/**
 * Calculate the beats per minute (bpm) based on the array of maxima and the length of the recording.
 * @param {array} maximaArray - The array of maxima (xyArraySpikes).
 * @param {number} lengthOfRecording - The length of the recording in seconds.
 * @return {number} The number of spikes per minute or the number of beats per minute.
 */
function calculateBPM(maximaArray, lengthOfRecording) {
    var spikesPerTenSeconds = maximaArray.length / lengthOfRecording * 10;
    return spikesPerTenSeconds * 6;
}

/**
 * Square the y values of the array passed in as parameter.
 * @param {array} arrayToBeSquared - The array that should be squared.
 * @return {array} The squared array.
 */
function squareArray(arrayToBeSquared) {
    var returnArray = [];
    for (var i = 0; i < arrayToBeSquared.length; ++i) {
        if (arrayToBeSquared[i].y > 0) { //otherwise negative values over 1 get added, as the square of a negative becomes positive
            returnArray.push({
                x: arrayToBeSquared[i].x,
                y: arrayToBeSquared[i].y * arrayToBeSquared[i].y
            });
        } //else the value will no be an r peak, as a negative or 0 amplitude, so this case can be neglected
    }
    return returnArray;
}

/**
 * Get rid of all the points that belong to the same R-peak and use only their maximum.
 * @param {array} arrayIn - The array that should be used to find the single maxima.
 * @return {array} The final array including all final R-peaks.
 */
function getRidOfSamePeakPoints(arrayIn, intervalValue) {
    var maximaArray = [];
    var tmpArray = [];

    for (var i = 0; i < arrayIn.length; ++i) {
            //console.log(parseFloat(arrayIn[i+1].x))
            //console.log(parseFloat((arrayIn[i].x + intervalValue)))
            if (i != arrayIn.length - 1 && parseFloat(arrayIn[i+1].x) == parseFloat((arrayIn[i].x + intervalValue).toFixed(3))) {

                    tmpArray.push(arrayIn[i]);

            } else if (i == arrayIn.length - 1 && tmpArray.length == 0) {

                    maximaArray.push({
                        x: arrayIn[i].x,
                        y: Math.sqrt(arrayIn[i].y)
                    });

            } else {

                    tmpArray.push(arrayIn[i]);
                    var maxDatapoint = tmpArray[0];
                    for (var j = 1; j < tmpArray.length; ++j) {
                      if (tmpArray[j].y > maxDatapoint.y) {
                        maxDatapoint = tmpArray[j];
                      }
                    }

                    //add max from tmpArray
                    maximaArray.push({
                        x: maxDatapoint.x,
                        y: Math.sqrt(maxDatapoint.y)
                    });
                    tmpArray = [];
            }
    }
    return maximaArray;
}


/**
 * Do the ECG signal processing.
 * @param {number} intervalValue - The value that is used to detect Q, S and the P and T wave.
 */
function ECGSignalProcessing(intervalValue) {
    //detect q's and s's from the R-peaks
    //not using the first and last spike as this might cause to problems in case the recording does not end with T wave for example
    var rrIntervalsSum = 0;
    var rrIntervalsArray = [];
    var qrsIntervalsSum = 0;

    for (var i = 1; i < xyArraySpikes.length - 2; ++i) {

        var newRRInterval = xyArraySpikes[i+1].x - xyArraySpikes[i].x;
        rrIntervalsSum += newRRInterval;
        rrIntervalsArray.push(newRRInterval);

        tmpTime = Math.round(xyArraySpikes[i].x / intervalValue); //currently time of spike
        var currentSEnd = xyArrayData[tmpTime];
        while (xyArrayData[tmpTime+1].y <= currentSEnd.y) {
            currentSEnd = xyArrayData[tmpTime+1];
            tmpTime += 1;
        }
        //found local min S, now need to find end of QRS interval

        while (xyArrayData[tmpTime+1].y >= currentSEnd.y + intervalValue) {
            currentSEnd = xyArrayData[tmpTime+1];
            tmpTime += 1;
        }
        //console.log(currentSEnd)
        //found sEnd

        tmpTime = Math.round(xyArraySpikes[i].x / intervalValue); //currently time of spike
        var currentQBeg = xyArrayData[tmpTime];
        while (xyArrayData[tmpTime-1].y <= currentQBeg.y) {
            currentQBeg = xyArrayData[tmpTime-1];
            tmpTime -= 1;
        }
        //found local min Q, now need to find start of QRS interval

        while (xyArrayData[tmpTime-1].y >= currentQBeg.y + intervalValue) {
            currentQBeg = xyArrayData[tmpTime-1];
            tmpTime -= 1;
        }
        //found qBeg

        //This is for logging the QRS complex in the console - useful for checking if the algorithm works
        console.log("qBEG: " + currentQBeg.x);
        console.log("sEND: " + currentSEnd.x);
        console.log(Math.round(currentSEnd.x*1000 - currentQBeg.x*1000));

        qrsIntervalsSum += Math.round(currentSEnd.x*1000 - currentQBeg.x*1000);
    }
    var avgRRInterval = rrIntervalsSum / rrIntervalsArray.length;
    var rrIntervalsDiff = (Math.max(...rrIntervalsArray) - Math.min(...rrIntervalsArray))*1000;
    console.log('rrIntervalsAvg');
    console.log(avgRRInterval * 1000);
    console.log('RR Max - Min:');
    console.log(rrIntervalsDiff);
    console.log('qrsComplexAvg');
    console.log(qrsIntervalsSum / (xyArraySpikes.length - 2));

    document.getElementById("RRIntervalParagraph").innerHTML = "R-R interval: " + Math.round(avgRRInterval * 1000) + " ms";
    document.getElementById("HRV").innerHTML = "Heart Rate Variability (difference between max and min R-R): " + Math.round(rrIntervalsDiff) + " ms";
    document.getElementById("QRSComplexParagraph").innerHTML = "Q-R-S complex: " + Math.round(qrsIntervalsSum / (xyArraySpikes.length - 2)) + " ms";

    SDNN(rrIntervalsArray, avgRRInterval);
    RMSSD(rrIntervalsArray);

}

/**
 * Calculate the standard deviation of all NN / RR intervals.
 * @param {array} arrayIn - The array containing all NN intervals.
 * @param {number} avg - The average value of all NN intervals.
 */
function SDNN(arrayIn, avg) {
    var newArr = [];
    var newArrSum = 0;
    for (var i = 0; i < arrayIn.length; ++i) {
        newArrSum += Math.pow((arrayIn[i]*1000 - avg*1000), 2);
    }
    var newArrAvg = newArrSum / arrayIn.length;
    var SDNNval = Math.sqrt(newArrAvg);
    document.getElementById("SDNN").innerHTML = "SDNN: " + Math.round(SDNNval) + " ms";
}

/**
 * Calculate root mean square of successive differences between each R peak.
 * @param {array} arrayIn - The array containing all NN / RR intervals.
 */
function RMSSD(arrayIn) {
    var newArr = [];
    var newArrSum = 0;
    for (var i = 0; i < arrayIn.length - 1; ++i) {
        newArrSum += Math.pow((arrayIn[i]*1000 - arrayIn[i+1]*1000), 2);
    }
    var newArrAvg = newArrSum / arrayIn.length - 1;
    var RMSSDval = Math.sqrt(newArrAvg);
    document.getElementById("RMSSD").innerHTML = "RMSSD: " + Math.round(RMSSDval) + " ms";
}

/**
 * Apply the Kalman Filter for the signal that is passed in as a parameter using the specified R and Q values.
 * @param {array} arrayIn - The array that contains the data to be filtered.
 * @param {number} rIn - The specified value for R for the filter = process noise: how much noise is expected from the system itself?
 * @param {number} qIn - The specified value for Q for the filter = measurement noise: how much noise is caused by the measurements?
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
    lpf.smoothing = 0.1; //this value provides best results
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
          switch(chartContainerNumber) {
              case 1: //ECG
                  myDataPoints.push({
                      x: time,
                      y: parseFloat(arrayIn[i])*1
                  });
              break;
              case 2: //PCG
                  myDataPoints.push({
                      x: time,
                      y: arrayIn[i].y/1000
                  });
              break;
              case 3: //FFT
                  myDataPoints.push({
                      x: time / interval * 200 / arrayIn.length, //since the frequency of each (n) FFT plot is n * Fs / N, where Fs is the sample rate and N the size of the FFT array
                      y: parseFloat(arrayIn[i])/100
                  });
              break;
              default:
                  myDataPoints.push({
                      x: time,
                      y: parseFloat(arrayIn[i])/1000
                  });
          }
          time += interval;
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
          gridThickness: 0,
          gridColor:"#FF0000",
          lineColor:"#FF0000",
          tickColor:"#FF0000",
          labelFontColor:"#FF0000",
      },
      data: data
  });

  if(chartContainerNumber == 1 || chartContainerNumber == 4) { //ECG
      chart.options.axisX.stripLines = xAxisStripLinesArray;
      chart.options.axisY.stripLines = yAxisStripLinesArray;
  }

  if(chartContainerNumber == 2 || chartContainerNumber == 5) { //PCG
      chart.options.axisY.title = "Amplitude";
  }

  //adding sNoises as crosses for the Shannon chart
  if (chartContainerNumber == 6) { //Shannon
      chart.options.axisY.title = "Energy Amplitude";
      for (var i = 0; i < newSNoiseArray.length; ++i) {
          var yIn = shannArr[newSNoiseArray[i]] / 1000;
          chart.options.data[0].dataPoints[newSNoiseArray[i]] = { x: newSNoiseArray[i] * interval, y: yIn,  indexLabel: "S", markerType: "cross", markerColor: "red", markerSize: 5 };
      }
  }

  if (chartContainerNumber == 3) { //FFT
      chart.options.axisX.title = "Frequency (Hz)";
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
}
