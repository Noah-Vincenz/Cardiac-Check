

var textArea = document.getElementById("textArea");
var sendButton = document.getElementById("sendButton");
var tableBody = document.getElementById("table_body");
var patientsSelection = document.getElementById("patients_selection");

const db = firebase.database();
const patientsRef = db.ref("patients");

window.onload = function () {
    var limit = 30;    //increase number of dataPoints by increasing the limit
    var y = 0;
    var data = [];
    var dataSeries = { type: "line", color: "red" };
    var dataPoints = [];
    for (var i = 0; i < limit; i += 0.1) {
        y = Math.round(Math.random() * 5);
        dataPoints.push({
            x: i,
            y: y
        });
    }
    dataSeries.dataPoints = dataPoints;
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

    $("#chartContainer").CanvasJSChart(options);
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


function testF() {
  alert("TestF");
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

function showAlert() {

  window.alert("Message")


}
