document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.venue-card').forEach(card => {
    if (card.dataset.available === "false") {
      card.classList.add("unavailable");
    }
  });
});

function toggleFavorite(element) {
  element.classList.toggle("active");
}
