// Portfolio slide navigation: arrows, dots, and a vertical-wheel shim for
// desktop mice. Scroll-snap still owns the actual snapping.
(function () {
  var box = document.getElementById("slides");
  if (!box) return;
  var slides = Array.prototype.slice.call(box.querySelectorAll(".slide"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".slide-dots button"));
  var prev = document.querySelector(".slide-nav.prev");
  var next = document.querySelector(".slide-nav.next");
  var smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;

  function current() {
    return Math.max(0, Math.min(slides.length - 1, Math.round(box.scrollLeft / box.clientWidth)));
  }
  function go(index) {
    box.scrollTo({ left: index * box.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }
  function markDots() {
    var i = current();
    dots.forEach(function (dot, j) { dot.setAttribute("aria-current", j === i ? "true" : "false"); });
  }

  if (prev) prev.addEventListener("click", function () { go(current() - 1); });
  if (next) next.addEventListener("click", function () { go(current() + 1); });
  dots.forEach(function (dot, i) { dot.addEventListener("click", function () { go(i); }); });
  box.addEventListener("scroll", markDots, { passive: true });

  // Desktop wheel mice emit vertical deltas; steer them sideways.
  box.addEventListener("wheel", function (event) {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      box.scrollLeft += event.deltaY;
    }
  }, { passive: false });

  // Arrow keys work when the strip itself has focus.
  box.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") { event.preventDefault(); go(current() + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(current() - 1); }
  });
})();
