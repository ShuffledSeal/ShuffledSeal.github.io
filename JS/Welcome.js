// Get the modal
let modal;

// Get the button that opens the modal
var topBtn = document.getElementById("topBtn");

// Get the button that opens the modal
var bottomBtn = document.getElementById("bottomBtn");



// When the user clicks the button, open the modal 
topBtn.onclick = function() {
  modal = document.getElementById("topModal");
  modal.style.display = "block";
}

bottomBtn.onclick = function() {
    modal = document.getElementById("bottomModal");
    modal.style.display = "block";
  }
  

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}