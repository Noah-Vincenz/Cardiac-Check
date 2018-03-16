var slayer = require('slayer');
var lpf = require('lpf');
var KalmanFilter = require('kalmanjs').default;
var dsp = require('dsp.js');

var textArea = document.getElementById("textArea");
var sendButton = document.getElementById("sendButton");
var tableBody = document.getElementById("table_body");
var patientsSelection = document.getElementById("patients_selection");
var xAxisStripLinesArray = [];
var yAxisStripLinesArray = [];

var xyArrayData = [];
var pcgArrayData = [];
var pcgYArrayData = [];
var yArrayData = [];
var lpfArray = [];
var qBegArray = []; //array of where Q begins
var sEndArray = []; //array of where S ends
var xyArraySpikes = [];
var sNoiseArray = [];
var shannArr = [];
var newSNoiseArray = []; //array to get rid of adjacent S points and output only the middle one




const db = firebase.database();
const patientsRef = db.ref("patients");
//const recordsRef = db.ref("datarecords");
const storage = firebase.storage();



window.onload = function () {
    changeDataShown("Henry Croft");
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
    //showPCG(strUser);
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
                          lowPassFilter(1);
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

                          showPCG(patientName);

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

function showPCG(patientName) {
    patientsRef.orderByChild("name").equalTo(patientName).on("value", function(snapshot) { // patients
        snapshot.forEach(function(data) { // = corresponding patient ie. patient2
            var storageRef = storage.ref();
            var pathReference = storageRef.child('PCGdata/'+data.key+'.txt');
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


                            drawGraph(pcgArrayData, 6, "PCG");


                            var newArr = [];
                            for (var i = 0; i < 8192; ++i) {
                                newArr.push(pcgArrayData[i].y);
                            }
                            var dft = new dsp.DFT(8192, 334);
                            //var fft = new FFT(2048, 44100);
                            dft.forward(newArr);
                            var spectrum = dft.spectrum;
                            console.log('Spectrum');
                            console.log(spectrum);
                            console.log(newArr.length);




                            var fft = new dsp.FFT(8192, 334);
                            //var fft = new FFT(2048, 44100);
                            fft.forward(newArr);
                            var spectrum2 = fft.spectrum;

                            drawGraph(spectrum2, 9, "Fast Fourier Transform");

                            //Kalman filter


                            var kalmanFilter = new KalmanFilter({R: 5000, Q: 1000});
                            var dataConstantKalman = pcgYArrayData.map(function(v) {
                                return kalmanFilter.filter(v);
                            });
                            var kalmanArray = dataConstantKalman;
                            drawGraph(kalmanArray, 7, "Kalman Filter")


                            //computing Shannon energy
                            for (var i = 0; i < kalmanArray.length; ++i) {
                                var inp;
                                if (Math.pow(kalmanArray[i], 2) == 0) {
                                  inp = 0;
                                }
                                else {
                                  inp = Math.pow(0-kalmanArray[i], 2) * Math.log(Math.pow(kalmanArray[i], 2)) / 1000000;
                                }
                                shannArr.push(inp);
                            }
                            console.log("SHANN");
                            console.log(shannArr);


                            var newArray = shannArr.slice();
                            console.log("HERER");
                            console.log(newArray);
                            newArray.sort(function(a,b) { return a - b;});
                            var newMax = [];
                            for (var i = newArray.length - 1; newMax.length < xyArraySpikes.length; --i) {
                              newMax.push(newArray[i]);
                            }
                            console.log(newMax);
                            //computing average of S1s to have a threshold for the peak detection of s1 and s2 as 1/3 of the avg
                            var sum = 0;
                            for (var i = 0; i < newMax.length; ++i) {
                              sum += newMax[i];
                            }
                            var avg = sum / newMax.length;
                            var threshold = avg / 3;
                            console.log(avg);
                            console.log("THRESH")
                            console.log(threshold)
                            //array that keeps x coordinates of the noises over the specified threshold
                            sNoiseArray = [];
                            for (var i = 0; i < shannArr.length; ++i) {
                                if (shannArr[i] >= threshold) {
                                    sNoiseArray.push(i);
                                }
                            }
                            console.log("SNoises");
                            console.log(sNoiseArray);

                            //cleaning up peaks within 0.05 seconds (they belong to the same peak)
                            newSNoiseArray = [];

                            for (var i = 0; i < sNoiseArray.length; ++i) {
                              var tmpArray = [];
                              tmpArray.push(sNoiseArray[i]);
                              var index = i;
                              var sNoiseToCompare = sNoiseArray[index];
                              while (sNoiseArray[index+1] * 0.003 < ((sNoiseToCompare * 0.003) + 0.05)) {
                                  console.log("IN HERE")
                                  tmpArray.push(sNoiseArray[index + 1]);
                                  sNoiseToCompare = sNoiseArray[index + 1];
                                  ++index;
                              }
                              console.log(tmpArray.length);
                              if (tmpArray.length != 1) {
                                console.log(tmpArray[Math.round(tmpArray.length / 2)]);
                                newSNoiseArray.push(tmpArray[Math.round(tmpArray.length / 2)]);
                              }
                              else {
                                console.log(tmpArray[0]);
                                newSNoiseArray.push(tmpArray[0]);
                              }
                              i += tmpArray.length;

                            }
                            console.log('newSNoiseArray');

                            console.log(newSNoiseArray);
                            //drawGraph(newSNoiseArray, 8, "Shannon Energy");

                            drawGraph(shannArr, 8, "Shannon Energy");






                            var filter = new dsp.IIRFilter(dsp.HIGHPASS, 150, 334);
                            console.log(newArr);
                            filter.process(newArr);
                            console.log('HHHH');
                            console.log(newArr);

                            console.log(filter.spectrum);
                            //lowPassFilter(2);


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
        xyArraySpikes = spikes;
        console.log(spikes);    // [ { x: 4, y: 12 }, { x: 12, y: 25 } ]
        //taking the average no of peaks in 10 seconds over the 30 second time period
        var bpm = (spikes.length / 3) * 6;
        console.log(bpm+'bpm');
        document.getElementById("heartRateParagraph").innerHTML = "Heart Rate: " + bpm + "bpm";
        var rrIntervalsSum = 0;
        var rrIntervalsArray = [];
        var qrsIntervalsSum = 0;
        var qrsIntervalAvg;
        var tmpTime;
        for (var i = 0; i < spikes.length; ++i) {
            if (i < spikes.length - 1) {
                var newRRInterval = spikes[i+1].x - spikes[i].x;
                rrIntervalsSum += newRRInterval;
                rrIntervalsArray.push(newRRInterval);
                tmpTime = spikes[i].x; //currently time of spike
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
                //console.log('q: ' + currentQBeg.x*1000);
                //console.log('s: ' + currentSEnd.x*1000);
                //console.log('QRS: ' + Math.round(currentSEnd.x*1000 - currentQBeg.x*1000));
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
                //console.log('q: ' + currentQBeg.x*1000);
                //console.log('s: ' + currentSEnd.x*1000);
                //console.log('QRS: ' + Math.round(currentSEnd.x*1000 - currentQBeg.x*1000));
                //console.log('QRS: '+ Math.round(currentSEnd.x*1000 - currentQBeg.x*1000));
                qrsIntervalsSum += Math.round(currentSEnd.x*1000 - currentQBeg.x*1000);
                qBegArray.push(currentQBeg);
                sEndArray.push(currentSEnd);
            }
        }


        // PR AND ST segment
        //https://www.mathsisfun.com/data/standard-deviation-formulas.html


        console.log("RR INTERVAL AVG: " + rrIntervalsSum / spikes.length * 10);
        document.getElementById("RRIntervalParagraph").innerHTML = "R-R interval: " + Math.round(rrIntervalsSum / spikes.length) * 10 + " ms";
        var rrIntervalsDiff = (Math.max(...rrIntervalsArray) - Math.min(...rrIntervalsArray))*10;
        console.log('RR Max - Min: ' + rrIntervalsDiff);

        //for SDNN
        var avgRRInterval = rrIntervalsSum / rrIntervalsArray.length;
        var newArr = [];
        var newArrSum = 0;
        for (var i = 0; i < rrIntervalsArray.length; ++i) {
            newArrSum += Math.pow((rrIntervalsArray[i] - avgRRInterval), 2);
        }
        var newArrAvg = newArrSum / rrIntervalsArray.length;
        var SDNNval = Math.sqrt(newArrAvg);
        document.getElementById("SDNN").innerHTML = "SDNN: " + SDNNval.toFixed(2) + " ms";

        //for RMSSD
        var newArr2 = [];
        var newArrSum2 = 0;
        for (var i = 0; i < rrIntervalsArray.length - 1; ++i) {
            newArrSum2 += Math.pow((rrIntervalsArray[i] - rrIntervalsArray[i+1]), 2);
        }
        var newArrAvg2 = newArrSum2 / rrIntervalsArray.length - 1;
        var RMSSDval = Math.sqrt(newArrAvg2);
        document.getElementById("RMSSD").innerHTML = "RMSSD: " + RMSSDval.toFixed(2) + " ms";




        document.getElementById("HRV").innerHTML = "Heart Rate Variability (difference between max and min NN): " + rrIntervalsDiff + " ms";
        console.log("QRS COMPLEX AVG: " + qrsIntervalsSum / spikes.length);
        document.getElementById("QRSComplexParagraph").innerHTML = "Q-R-S complex: " + Math.round(qrsIntervalsSum / spikes.length) + " ms";

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
  for (var i = 0; i < qBegArray.length; ++i) {
      prIntervalsSum += (qBegArray[i].x - pBegArray[i]).toFixed(3) * 1;
      //var x = (qBegArray[i].x - pBegArray[i]).toFixed(3) * 1;
      //console.log('P: ' + pBegArray[i]);
      //console.log('R: ' + qBegArray[i].x);
      //console.log('PR: '+x);
  }
  for (var i = 0; i < tEndArray.length; ++i) {
      //var x = (tEndArray[i] - qBegArray[i].x).toFixed(3) * 1;
      //console.log('QT: '+x);
      qtIntervalsSum += (tEndArray[i] - qBegArray[i].x).toFixed(3) * 1;
      //var x =  (tEndArray[i] - sEndArray[i].x).toFixed(3) * 1;
      //console.log('S: '+sEndArray[i].x);
      //console.log('T: '+tEndArray[i]);
      //console.log('ST: '+x);
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

  //TODO: add PR and ST segments!!



}

function lowPassFilter(signalType) {
  //low pass filter
  var lpfPreArrayData = [];
  if (signalType == 1) { //ECG
      for (var i = 0; i < yArrayData.length; ++i) {
          lpfPreArrayData[i] = yArrayData[i] * 1000;
      }
      lpf.smoothing = 0.1;
      lpfArray = lpf.smoothArray(lpfPreArrayData);
      console.log("Low Pass");
      console.log(lpfArray);
      drawGraph(lpfArray, 2, "Low Pass Filter");
  }
  else { //PCG
      for (var i = 0; i < pcgYArrayData.length; ++i) {
          lpfPreArrayData[i] = pcgYArrayData[i];
      }
      lpf.smoothing = 0.05;
      lpfArray = lpf.smoothArray(lpfPreArrayData);
      console.log("Low Pass");
      console.log(lpfArray);
      drawGraph(lpfArray, 10, "Low Pass Filter");
  }
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
  if (chartContainerNumber==7 || chartContainerNumber==8) {
    console.log('arrayIn');
    console.log(arrayIn);
    console.log(arrayIn[0]);
    console.log(arrayIn[1]);
  }
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
            time += 0.01;
            time = parseFloat(time.toFixed(3));
        }
        else if (chartContainerNumber==6 || chartContainerNumber==7 || chartContainerNumber==8 || chartContainerNumber==9 || chartContainerNumber==10) { //PCG
            //console.log(arrayIn[i]);
            //console.log(parseFloat(arrayIn[i])/1000*1);
            if (chartContainerNumber==7 || chartContainerNumber==8 || chartContainerNumber==9 || chartContainerNumber==10) {
              myDataPoints.push({
                  x: time,
                  y: arrayIn[i]/1000
              });
            }
            else {
              myDataPoints.push({
                  x: time,
                  y: arrayIn[i].y/1000
              });
            }
            time += 0.003;
            time = parseFloat(time.toFixed(3));
        }
        else {
            myDataPoints.push({
                x: time,
                y: parseFloat(arrayIn[i])*1
            });
            time += 0.01;
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
  if(chartContainerNumber == 4 || chartContainerNumber == 5) {
      chart.options.axisX.stripLines = [];
      chart.options.axisY.stripLines = [];
  }
  if (chartContainerNumber >= 6) {
      chart.options.axisY.title = "Amplitude";
      chart.options.axisX.stripLines = [];
      chart.options.axisY.stripLines = [];
  }

  //adding sNoises
  if (chartContainerNumber == 8) {
      console.log("Ya");
      console.log(chart.options.data[0].dataPoints);
      chart.options.axisY.title = "Energy Amplitude";
      chart.options.axisX.stripLines = [];
      chart.options.axisY.stripLines = [];
      for (var i = 0; i < newSNoiseArray.length; ++i) {
          var yIn = shannArr[newSNoiseArray[i]] / 1000;
          chart.options.data[0].dataPoints[newSNoiseArray[i]] = { x: newSNoiseArray[i] * 0.003, y: yIn,  indexLabel: "S", markerType: "cross", markerColor: "red", markerSize: 5 };
      }
  }
  if (chartContainerNumber == 9) {
      chart.options.axisX.title = "Frequency";
  }
  chart.render();

}

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
