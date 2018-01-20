

var textArea = document.getElementById("textArea");
var sendButton = document.getElementById("sendButton");

const db = firebase.database();
const patientsRef = db.ref("patients");


patientsRef.on("child_added", function(snapshot) {
  alert(snapshot.val());
  //updateStarCount(postElement, snapshot.val());
});

/*
patientsRef.on("child_added", snap => {

  window.alert("Message");
  alert(snap.val());
  var id = snap.child("id").val();
  var name = snap.child("name").val();
  var name = snap.child("dob").val();
  var name = snap.child("weight").val();

  $("#table_body").append(<tr><td> + id + </td><td> + name + </td><td> + dob + </td><td> + weight + </td></tr>);


});
*/

/*
patientsRef.on("child_added", function(snapshot, prevChildKey) {
  window.alert("Message");

  var id = snap.child("id").val();
  var name = snap.child("name").val();
  var name = snap.child("dob").val();
  var name = snap.child("weight").val();

  $("#table_body").append(<tr><td> + id + </td><td> + name + </td><td> + dob + </td><td> + weight + </td></tr>);

});
*/
/*
patientsRef.on("child_changed", snap => {

  window.alert("Message");
  var id = snap.child("id").val();
  var name = snap.child("name").val();
  var name = snap.child("dob").val();
  var name = snap.child("weight").val();

  $("#table_body").append(<tr><td> + id + </td><td> + name + </td><td> + dob + </td><td> + weight + </td></tr>);


});

patientsRef.on("child_removed", snap => {

  window.alert("Message");
  var id = snap.child("id").val();
  var name = snap.child("name").val();
  var name = snap.child("dob").val();
  var name = snap.child("weight").val();

  $("#table_body").append(<tr><td> + id + </td><td> + name + </td><td> + dob + </td><td> + weight + </td></tr>);


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
