// Modal wiring — native <dialog> gives us the focus trap, Escape handling,
// backdrop and focus-return for free. Guards let this file load on pages
// that have no modals (like the portfolio) without throwing.

function wireModal(buttonId, dialogId) {
  var button = document.getElementById(buttonId);
  var dialog = document.getElementById(dialogId);
  if (!button || !dialog) return;
  button.addEventListener("click", function () {
    dialog.showModal();
    var closeButton = dialog.querySelector(".close");
    if (closeButton) closeButton.focus();
  });
  // Click the dimmed backdrop (the dialog element itself) or the × to close.
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog || event.target.closest(".close")) dialog.close();
  });
}

wireModal("topBtn", "topModal");
wireModal("bottomBtn", "bottomModal");
