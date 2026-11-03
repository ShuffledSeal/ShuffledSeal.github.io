// Modal wiring. Guards let this file load on pages that have no modals
// (like the portfolio) without throwing.

var openModal = null;
var modalTrigger = null;

function showModal(id, trigger) {
  hideModal();
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = "block";
  openModal = el;
  modalTrigger = trigger || null;
  var closeButton = el.querySelector(".close");
  if (closeButton) closeButton.focus();
}

function hideModal() {
  if (!openModal) return;
  openModal.style.display = "none";
  openModal = null;
  if (modalTrigger) { modalTrigger.focus(); modalTrigger = null; }
}

var topBtn = document.getElementById("topBtn");
var bottomBtn = document.getElementById("bottomBtn");

if (topBtn) topBtn.addEventListener("click", function () { showModal("topModal", topBtn); });
if (bottomBtn) bottomBtn.addEventListener("click", function () { showModal("bottomModal", bottomBtn); });

// Click the dimmed backdrop or a × button to close.
document.addEventListener("click", function (event) {
  if (!openModal) return;
  if (event.target === openModal || event.target.closest(".close")) hideModal();
});

// Escape closes the open modal.
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") hideModal();
});
