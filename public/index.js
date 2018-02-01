

var textArea = document.getElementById("textArea");
var sendButton = document.getElementById("sendButton");
var tableBody = document.getElementById("table_body");
var patientsSelection = document.getElementById("patients_selection");

const db = firebase.database();
const patientsRef = db.ref("patients");
const recordsRef = db.ref("datarecords");

window.onload = function () {
    var limit = 1000;    //increase number of dataPoints by increasing the limit
    var y = 0;
    var data = [];
    var dataSeries = { type: "line", color: "red" };
    var myDataPoints = [];
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
    recordsRef.once("value")
    .then(function(snapshot) {
        var key = snapshot.key; // "ada"
        snapshot.forEach(function(data) { // = corresponding patient ie. patient2
            if (data.key == patientKey) {
                sampleECG = data.val();
                var limit = 1000;    //increase number of dataPoints by increasing the limit
                var y = 0;
                var data = [];
                var dataSeries = { type: "line", color: "red" };
                var myDataPoints = [];
                var myArray = sampleECG.split(" ").map(function (item) {
                    return parseFloat(item);
                });

                var time = 0;
                var voltage = 0;

                for (var i = 0; i < myArray.length; i++) {
                    if (i % 2 == 0) {
                        time = myArray[i];
                    }
                    else if (i % 2 == 1) {
                        voltage = myArray[i];
                        myDataPoints.push({
                            x: time,
                            y: voltage
                        });
                    }
                }

                dataSeries.dataPoints = myDataPoints;
                data.push(dataSeries);

                //Better to construct options first and then pass it as a parameter
                var options = {
                    zoomEnabled: true,
                    animationEnabled: true,
                    title: {
                        text: "ECG"
                    },
                    axisX: {
                        labelAngle: 30,
                        title: "Time (seconds)"
                    },
                    axisY: {
                        includeZero: false,
                        title: "Voltage (microVolts)"
                    },
                    data: data  // random data
                };

                $("#chartContainer").CanvasJSChart(options).render();
            }
        });
    });

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
