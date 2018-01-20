

var textArea = document.getElementById("textArea");
var sendButton = document.getElementById("sendButton");
var tableBody = document.getElementById("table_body");


const db = firebase.database();
const patientsRef = db.ref("patients");

patientsRef.on("child_added", function(snapshot) {
    alert(snapshot.val().name);
    var sel = document.getElementById("patientsSelection");
    var opt = document.createElement("option");
    opt.innerHTML = snapshot.val().name;
    opt.value = snapshot.val().name;
    sel.appendChild(opt);
    /*
    snapshot.forEach(function(child) {
      //alert(snapshot.val());
      alert(child.val());
      alert(snapshot.val().name);
      console.log(child.key+": "+child.val());
    });
    */

});
/*
  var cuisines = ["Chinese","Indian"];
  var sel = document.getElementById('CuisineList');
  for(var i = 0; i < cuisines.length; i++) {
      var opt = document.createElement('option');
      opt.innerHTML = cuisines[i];
      opt.value = cuisines[i];
      sel.appendChild(opt);
}


function retrievePatientData(patient) {

}
*/
/*
patientsRef.on("child_added", function(snapshot) {
  alert(snapshot.val());
  var id = snapshot.child("id").val();
  var name = snapshot.child("name").val();
  var dob = snapshot.child("dob").val();
  var weight = snapshot.child("weight").val();
  var tableRef = document.getElementById('my_table');//.getElementsByTagName('table_body');


  // Insert a row in the table at row index 0
  var newRow = tableRef.insertRow(0);
  alert(snapshot.val());

  // Insert a cell in the row at index 0
  var newCell = newRow.insertCell(0);

  // Append a text node to the cell
  var newText = document.createTextNode('New top row');

  newCell.appendChild(newText);
  //$("#table_body").append(<tr><td> + id + </td></tr>);

    //<td> + name + </td><td> + dob + </td><td> + weight + </td></tr>);

  alert(snapshot.val());


  //updateStarCount(postElement, snapshot.val());
});
*/

function submitText(recipient) {

  //alert("submittingText")
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
    //alert("submittingText")
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

/* FOR LISTENING TO CHANGES

var starCountRef = firebase.database().ref('posts/' + postId + '/starCount');
starCountRef.on('value', function(snapshot) {
  updateStarCount(postElement, snapshot.val());
});

*/
