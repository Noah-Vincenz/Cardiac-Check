/**
 * @author Noah-Vincenz Noeh <noah-vincenz.noeh@kcl.ac.uk>
 */

var xyArrayData = []; //raw ECG signal data
var yArrayData = []; //raw ECG signal data
var xyArraySpikes = [];
var maxArray = []; //array containing all maxima retrieved from the filtered ECG signal

/**
 * This function gets called when the window first loads. It changes the data that is currently shown to show the data of the patient 'Henry'
 */
window.onload = function () {
    updateGraphs()
}

function updateGraphs(patientKey) {


                    var rawFile = new XMLHttpRequest();
                    rawFile.open("GET", "100.txt", true);
                    rawFile.onreadystatechange = function () {
                        if(rawFile.readyState === 4)  {
                            if(rawFile.status === 200 || rawFile.status == 0) {
                                var allText = rawFile.responseText;
                                //This replaces multiple spaces in the text file by a single space character
                                var modifiedString = reduceWhitespaces(allText)

                                //now we can split the string by single whitespace
                                words = modifiedString.split(" ")

                                var time = 0.000;

                                //loop through lines and add each datapoint to array, which will be used for the graphs later on.
                                //start at index i = 4, as up to that is just description of the file
                                for (var i = 1; i < words.length; i++) {
                                      if (i % 2 == 0) { //ie. 4, 7, 10 - these are all ECG values
                                          xyArrayData.push({
                                              x: time,
                                              y: parseFloat(words[i]).toFixed(3)*1
                                          })
                                          yArrayData.push(parseFloat(words[i]).toFixed(3)*1)
                                      }
                                      else { //ie. 5, 8, 11 - these are all PCG values
                                          var x = words[i] // of format 0:00.000
                                          var y = words[i].split("")
                                          var timeString = y[2]+y[3]+y[4]+y[5]+y[6]+y[7]
                                          time = parseFloat(timeString)

                                      }
                                }
                                console.log('xyArrayData');
                                console.log(xyArrayData);
                                drawGraph(xyArrayData, 1, "ECG")

                                //ECG heart rate calculation
                                heartRateCalculation();

                            }
                        }
                    }
                    rawFile.send(null);

}


function reduceWhitespaces(stringToManipulate) {
  //This replaces multiple spaces in the text file by a single space character
  return stringToManipulate.replace(/\s+/g, ' ')
}


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
    for (var i = 0; i < xyArraySpikes.length; ++i) {
      console.log(xyArraySpikes[i].x)
    }

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
    console.log("arrayin")
    console.log(arrayIn)
    var maximaArray = []
    var tmpArray = []
    for (var i = 0; i < arrayIn.length; ++i) {
            if (i != arrayIn.length - 1 && parseFloat(arrayIn[i+1].x.toFixed(3)) <= parseFloat((arrayIn[i].x + 0.003).toFixed(3))) {

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
                    console.log(tmpArray)
                    console.log("\n")
                    tmpArray = []

            }
    }
    return maximaArray
}

function drawGraph(arrayIn, chartContainerNumber, titleIn) {
  var limit = 100000;    //increase number of dataPoints by increasing the limit
  var y = 0;
  var data = [];
  var dataSeries = { type: "line", color: "black" };
  var myDataPoints = arrayIn;

  console.log("myDataPoints")
  console.log(myDataPoints)
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
  chart.render();
}
