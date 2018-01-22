

var textArea = document.getElementById("textArea");
var sendButton = document.getElementById("sendButton");
var tableBody = document.getElementById("table_body");
var patientsSelection = document.getElementById("patients_selection");

const db = firebase.database();
const patientsRef = db.ref("patients");

function changeDataShown(strUser) {
    alert("changing data shown");
    //var tableRef = document.getElementById('my_table');//.getElementsByTagName('table_body');
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

            $("#my_table").append(str);

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
