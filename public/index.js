var slayer = require('slayer');
var lpf = require('lpf');
var KalmanFilter = require('kalmanjs').default;

var textArea = document.getElementById("textArea");
var sendButton = document.getElementById("sendButton");
var tableBody = document.getElementById("table_body");
var patientsSelection = document.getElementById("patients_selection");
var xAxisStripLinesArray = [];
var yAxisStripLinesArray = [];

var xyArrayData = [];
var yArrayData = [];
var lpfArray = [];
var qBegArray = []; //array of where Q begins
var sEndArray = []; //array of where S ends



const db = firebase.database();
const patientsRef = db.ref("patients");
const recordsRef = db.ref("datarecords");
const storage = firebase.storage();



window.onload = function () {
    changeDataShown("Henry");
    addStripLines();
}

// this is called when select item changes; the table is updated with the selected patient's data
global.changeDataShown = function(strUser) {
    emptyArrays();
    //we only want one row
    if ($('#my_table tr').length == 2) {
        document.getElementById("my_table").deleteRow(1);
    }
    patientsRef.orderByChild("name").equalTo(strUser).on("value", function(snapshot) { // patients
        snapshot.forEach(function(data) { // = corresponding patient ie. patient2
            updateGraph(data.key);
            var id;
            var name;
            var dob;
            var weight;
            data.forEach(function(value) { // each value for entry: id, name, dob, weight

                var val = value.val(); // =Bob, 93kg etc.
                var key = value.key; // =id, name etc.

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
            var str = "<tr><td>"+id+"</td><td>"+name+"</td><td>"+dob+"</td><td>"+weight+"</td></tr>";
            $("#table_body").append(str);


        });


    });
    doSignalProcessing(strUser);
}

function updateGraph(patientKey) {
    /**
    1. look in storageref for patientkey.txt file
    2. download file
    3. read file and convert into array of values
    4. draw graph
    */
    var limit = 100000;    //increase number of dataPoints by increasing the limit
    var y = 0;
    var data = [];
    var dataSeries = { type: "line", color: "black" };
    var myDataPoints = [];
    // Create a reference with an initial file path and name
    var storageRef = storage.ref();
    var pathReference = storageRef.child('ECGdata/'+patientKey+'.txt');

    pathReference.getDownloadURL().then(function(url) {
        // `url` is the download URL for 'images/stars.jpg'

        // This can be downloaded directly:
        var xhr = new XMLHttpRequest();
        /*
        xhr.responseType = 'blob';
        xhr.onload = function(event) {
          var blob = xhr.response;
          alert("sdsd");
        };
        */
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
                          myDataPoints.push({
                              x: time,
                              y: parseFloat(lines[i])*1
                          });
                          time += 0.01;
                          time = parseFloat(time.toFixed(3));
                    }
                    dataSeries.dataPoints = myDataPoints;
                    data.push(dataSeries);
                    var chart = new CanvasJS.Chart("chartContainer", {
                        zoomEnabled: true,
                        animationEnabled: true,
                        title: {
                            text: "ECG"
                        },
                        axisX: {
                            labelAngle: 30,
                            title: "Time (seconds)",
                            stripLines:xAxisStripLinesArray,
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
                        data: data  // random data
                    });
                    chart.render();
                }
            }
        };

        xhr.send(null);

    }).catch(function(error) {
      // Handle any errors
    });

}
function addStripLines(){
    for(var i=0; i<30; i=i+0.04){
            xAxisStripLinesArray.push({value:i,thickness:0.125, color:"#FF0000"});
    }
    for(var i=0; i<30; i=i+0.2){
            xAxisStripLinesArray.push({value:i,thickness:0.375, color:"#FF0000"});
    }
    for(var i=-5; i<5; i=i+0.1){
            yAxisStripLinesArray.push({value:i,thickness:0.125, color:"#FF0000"});
    }
    for(var i= -5; i< 5; i=i+0.5){
            yAxisStripLinesArray.push({value:i,thickness:0.375, color:"#FF0000"});
    }
}

patientsRef.on("child_added", function(snapshot) {
    // this will need to change for when app is deployed
    var opt = document.createElement("option");
    opt.innerHTML = snapshot.val().name;
    opt.value = snapshot.val().name;
    patientsSelection.appendChild(opt);
});

// gets called when Select item changes and when send button is pressed, returns name of the current patient selected
global.getSelectedUser = function() {
    var e = document.getElementById("patients_selection");
    var strUser = e.options[e.selectedIndex].text;
    return strUser;
}

global.submitText = function(recipient) {

  writeMessagesData(recipient, textArea.value)
  window.alert("Message has been stored on the database!")

}

function writePatientsData(patientId, patientName, patientDob, patientWeight) {
    db.ref('patients/' + patientId).set({
      "id": patientId,
      "name": patientName,
      "dob": patientDob,
      "weight": patientWeight
    });
}

function writeMessagesData(recipientId, messageContent) {
    db.ref("messages/" + recipientId + " " + getDate()).set(messageContent);
}

function getDate() {
   var now     = new Date();
   var year    = now.getFullYear();
   var month   = now.getMonth()+1;
   var day     = now.getDate();

   var dateTime = day + '-' + month + "-" + year;
    return dateTime;
}

//SIGNAL PROCESSING


function doSignalProcessing(patientName) {
  patientsRef.orderByChild("name").equalTo(patientName).on("value", function(snapshot) { // patients
      snapshot.forEach(function(data) { // = corresponding patient ie. patient2
          var storageRef = storage.ref();
          var pathReference = storageRef.child('ECGdata/'+data.key+'.txt');
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


                          // to keep track of S for T detection
                          var time = 0;
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
                          lowPassFilter();
                          featureExtraction();








                          //Kalman filter
                          var kalmanFilter = new KalmanFilter({R: 0.01, Q: 3});
                          var dataConstantKalman = yArrayData.map(function(v) {
                              return kalmanFilter.filter(v);
                          });
                          var kalmanArray = dataConstantKalman;
                          console.log("Kalman");
                          console.log(kalmanArray);
                          drawGraph(kalmanArray, 3, "Kalman Filter")


                          //Fourier transform

                          // Input is 1+0i 2+0i 3+0i 4+0i
                          var input = new Float32Array([]);
                          input = yArrayData;
                          var output = new Float32Array(input.length);
                          var dftArray = computeDft(input, output);
                          console.log("Discrete Fourier");
                          console.log(dftArray);
                          drawGraph(dftArray[0], 4, "Discrete Fourier Transform Real");
                          drawGraph(dftArray[1], 5, "Discrete Fourier Transform Image");


                          // input and output must be exactly the same length, must both have an even
                          // number of elements, and must both be Float32Arrays.

                      }
                  }
              };

              xhr.send(null);

          }).catch(function(error) {
            // Handle any errors
          });
       });
    });


}

function featureExtraction() {
  //peak detection & bpm for raw ECG
  var sl = slayer();
  //otherwise there is two too many spikes detected in the raw ECG data for patient3
  sl.config.minPeakDistance = 40;
  sl
  .y(item => item.y)
  .fromArray(xyArrayData)
  .then(spikes => {
        console.log('xyArray spikes');
        console.log(spikes);    // [ { x: 4, y: 12 }, { x: 12, y: 25 } ]
        //taking the average no of peaks in 10 seconds over the 30 second time period
        var bpm = (spikes.length / 3) * 6;
        console.log(bpm+'bpm');
        document.getElementById("heartRateParagraph").innerHTML = "Heart Rate: " + bpm + "bpm";
        var rrIntervalsSum = 0;
        var qrsIntervalsSum = 0;
        var qrsIntervalAvg;
        var tmpTime;
        for (var i = 0; i < spikes.length; ++i) {
            if (i < spikes.length - 1) {
                rrIntervalsSum += spikes[i+1].x - spikes[i].x;

                tmpTime = spikes[i].x; //currently time of spike
                var currentQBeg = xyArrayData[tmpTime];
                while (xyArrayData[tmpTime-1].y < currentQBeg.y) {
                    currentQBeg = xyArrayData[tmpTime-1];
                    tmpTime -= 1;
                }
                //found local min Q, now need to find beginning of QRS interval
                while (xyArrayData[tmpTime-1].y > currentQBeg.y) {
                    currentQBeg = xyArrayData[tmpTime-1];
                    tmpTime -= 1;
                }

                tmpTime = spikes[i].x; //currently time of spike
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

                //console.log('Q: '+currentQBeg.x);
                //console.log('S: '+currentSEnd.x);
                //currentQBeg == Q
                //currentSEnd == S
                qrsIntervalsSum += Math.round(currentSEnd.x*1000 - currentQBeg.x*1000);
                qBegArray.push(currentQBeg);
                sEndArray.push(currentSEnd);

            } else {

                tmpTime = spikes[i].x; //currently time of spike
                var currentQBeg = xyArrayData[tmpTime];
                while (xyArrayData[tmpTime-1].y < currentQBeg.y) {
                    currentQBeg = xyArrayData[tmpTime-1];
                    tmpTime -= 1;
                }
                //found local min Q, now need to find beginning of QRS interval
                while (xyArrayData[tmpTime-1].y > currentQBeg.y) {
                    currentQBeg = xyArrayData[tmpTime-1];
                    tmpTime -= 1;
                }


                tmpTime = spikes[i].x; //currently time of spike
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

                //console.log('Q: '+currentQBeg.x);
                //console.log('S: '+currentSEnd.x);
                //currentQBeg == Q
                //currentSEnd == S
                qrsIntervalsSum += Math.round(currentSEnd.x*1000 - currentQBeg.x*1000);
                qBegArray.push(currentQBeg);
                sEndArray.push(currentSEnd);
            }
        }



        console.log("RR INTERVAL AVG: " + rrIntervalsSum / spikes.length);
        document.getElementById("RRIntervalParagraph").innerHTML = "R-R interval: " + Math.round(rrIntervalsSum / spikes.length) + " ms";
        console.log("QRS INTERVAL AVG: " + qrsIntervalsSum / spikes.length);
        document.getElementById("QRSIntervalParagraph").innerHTML = "Q-R-S interval: " + Math.round(qrsIntervalsSum / spikes.length) + " ms";

        doTDetection();


  });
}

function doTDetection() {
  //T detection from sArray for ST interval, QT
  var sArray = [];
  var tArray = [];
  var maxArray = [];
  /*
  sl = slayer();
  sl.fromArray(lpfArray).then(spikes => {
        console.log('lpf spikes');
        console.log(spikes);    // [ { x: 4, y: 12 }, { x: 12, y: 25 } ]
  });
  */
  for (var i = 1; i < lpfArray.length - 2; ++i) {
      //var currentMax = lpfArray[0];
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
  console.log('maxArray');
  console.log(maxArray);
  var pBegArray = [];
  var tEndArray = [];
  for (var i = 0; i < maxArray.length; ++i) { //0 is P, 1, R, 2 is T
      //console.log('1');
      if (i%3 == 0) {
          //maximum is a P
          //do PR Interval using qBegArray and xyArray - this works only because lpfArray shifts the P peaks to the right of where they are in original data


          //need to go all the way up to the peak of P first as the data is fetched from lpfArray peaks, which are shifted to the right of the original peaks
          var tmpTime = maxArray[i].x;
          var currentLargest = xyArrayData[tmpTime];
          while(currentLargest.y <= xyArrayData[tmpTime-1].y) {
              currentLargest = xyArrayData[tmpTime-1];
              tmpTime -= 1;
          }

          //now we can move left from the peak in order to find the beginning of P
          var currentSmallest = currentLargest;
          while(currentSmallest.y > xyArrayData[tmpTime-1].y + 0.01) {
              currentSmallest = xyArrayData[tmpTime-1];
              tmpTime -= 1;
              //console.log('dsfs');
          }

          pBegArray.push(currentSmallest.x);
      } else if (i%3 == 2) { //i%2==0
          //maximum is a T
          var tmpTime = maxArray[i].x;
          var currentSmallest = xyArrayData[tmpTime];
          while(currentSmallest.y > xyArrayData[tmpTime+1].y + 0.01) {
              currentSmallest = xyArrayData[tmpTime+1];
              tmpTime += 1;
              //console.log('dsfs');
          }
          tEndArray.push(currentSmallest.x);

      }
  }
  console.log('pBegArray: ');
  console.log(pBegArray);
  console.log('tEndArray: ');
  console.log(tEndArray);
  var prIntervalsSum = 0;
  var qtIntervalsSum = 0;
  var stIntervalsSum = 0;
  for (var i = 0; i < pBegArray.length; ++i) {
      prIntervalsSum += (qBegArray[i].x - pBegArray[i]).toFixed(3) * 1;
  }
  for (var i = 0; i < tEndArray.length; ++i) {
      qtIntervalsSum += (tEndArray[i] - qBegArray[i].x).toFixed(3) * 1;
      stIntervalsSum += (tEndArray[i] - sEndArray[i].x).toFixed(3) * 1;

  }
  var prIntervalsAvg = (prIntervalsSum / qBegArray.length).toFixed(3) * 1000;
  var qtIntervalsAvg = Math.round(qtIntervalsSum / qBegArray.length * 1000);
  var stIntervalsAvg = Math.round(stIntervalsSum / tEndArray.length * 1000);
  console.log('prIntervalsAvg');
  console.log(prIntervalsAvg);
  console.log('qtIntervalsAvg');
  console.log(qtIntervalsAvg);
  console.log('stIntervalsAvg');
  console.log(stIntervalsAvg);
  document.getElementById("PRIntervalParagraph").innerHTML = "P-R interval: " + prIntervalsAvg + " ms";
  document.getElementById("QTIntervalParagraph").innerHTML = "Q-T interval: " + qtIntervalsAvg + " ms";
  document.getElementById("STIntervalParagraph").innerHTML = "S-T interval: " + stIntervalsAvg + " ms";



}

function lowPassFilter() {
  //low pass filter
  var lpfPreArrayData = [];
  for (var i = 0; i < yArrayData.length; ++i) {
      lpfPreArrayData[i] = yArrayData[i] * 1000;
  }
  lpf.smoothing = 0.1;
  lpfArray = lpf.smoothArray(lpfPreArrayData);
  console.log("Low Pass");
  console.log(lpfArray);
  drawGraph(lpfArray, 2, "Low Pass Filter");
}



/*
 * Nayuki DFT: https://www.nayuki.io/res/how-to-implement-the-discrete-fourier-transform/dft.js
 * Computes the discrete Fourier transform (DFT) of the given complex vector.
 * 'inreal' and 'inimag' are each an array of n floating-point numbers.
 * Returns an array of two arrays - outreal and outimag, each of length n.
 */
function computeDft(inreal, inimag) {
	var n = inreal.length;
	var outreal = new Array(n);
	var outimag = new Array(n);
	for (var k = 0; k < n; k++) {  // For each output element
		var sumreal = 0;
		var sumimag = 0;
		for (var t = 0; t < n; t++) {  // For each input element
			var angle = 2 * Math.PI * t * k / n;
			sumreal +=  inreal[t] * Math.cos(angle) + inimag[t] * Math.sin(angle);
			sumimag += -inreal[t] * Math.sin(angle) + inimag[t] * Math.cos(angle);
		}
		outreal[k] = sumreal;
		outimag[k] = sumimag;
	}
	return [outreal, outimag];
}


function drawGraph(arrayIn, chartContainerNumber, titleIn) {
  var limit = 100000;    //increase number of dataPoints by increasing the limit
  var y = 0;
  var data = [];
  var dataSeries = { type: "line", color: "black" };
  var myDataPoints = [];
  var time = 0;
  for (var i = 0; i < arrayIn.length; i++) {
        if (chartContainerNumber==2) {
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
      data: data  // random data
  });
  if(chartContainerNumber == 4 || chartContainerNumber == 5) {
      chart.axisX.stripLines = null;
      chart.axisY.stripLines = null;
  }
  chart.render();

}

function emptyArrays() {
    xyArrayData = [];
    yArrayData = [];
    lpfArray = [];
    qBegArray = [];
    sEndArray = [];
}
