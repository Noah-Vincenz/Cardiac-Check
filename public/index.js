//import firebase from 'firebase'
//import 'firebase/storage'
//import "firebase/storage";

var textArea = document.getElementById("textArea");
var sendButton = document.getElementById("sendButton");
var tableBody = document.getElementById("table_body");
var patientsSelection = document.getElementById("patients_selection");
var xAxisStripLinesArray = [];
var yAxisStripLinesArray = [];

const db = firebase.database();
const patientsRef = db.ref("patients");
const recordsRef = db.ref("datarecords");
const storage = firebase.storage();


window.onload = function () {
    changeDataShown("Henry");
}

// this is called when select item changes; the table is updated with the selected patient's data
function changeDataShown(strUser) {
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
                              y: parseFloat(lines[i])
                          });
                          time += 0.01;
                          time = parseFloat(time.toFixed(3));
                    }
                    dataSeries.dataPoints = myDataPoints;
                    data.push(dataSeries);
                    console.log(data[0]); //object
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
                    addStripLines();
                    chart.render();

/*

                    //Better to construct options first and then pass it as a parameter
                    var options = {
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
                            title: "Voltage (microVolts)",
                            stripLines:yAxisStripLinesArray,
                            gridThickness: 0,
                            gridColor:"#FF0000",
                            lineColor:"#FF0000",
                            tickColor:"#FF0000",
                            labelFontColor:"#FF0000",
                            labelFontSize: 00
                        },
                        data: data  // random data
                    };

                    addStripLines();
                    alert(data.length); //1
                    console.log(data[0]);
                    $("#chartContainer").CanvasJSChart(options).render();
                    */
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
            xAxisStripLinesArray.push({value:i,thickness:0.5, color:"#FF0000"});
    }
    for(var i=0; i<30; i=i+0.2){
            xAxisStripLinesArray.push({value:i,thickness:1.5, color:"#FF0000"});
    }
    for(var i=-5; i<5; i=i+0.1){
            yAxisStripLinesArray.push({value:i,thickness:0.5, color:"#FF0000"});
    }
    for(var i= -5; i< 5; i=i+0.5){
            yAxisStripLinesArray.push({value:i,thickness:1.5, color:"#FF0000"});
    }
}

patientsRef.on("child_added", function(snapshot) {
    var opt = document.createElement("option");
    opt.innerHTML = snapshot.val().name;
    opt.value = snapshot.val().name;
    patientsSelection.appendChild(opt);
});

// gets called when Select item changes and when send button is pressed
function getSelectedUser() {
    var e = document.getElementById("patients_selection");
    var strUser = e.options[e.selectedIndex].text;
    return strUser;
}

function submitText(recipient) {

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
