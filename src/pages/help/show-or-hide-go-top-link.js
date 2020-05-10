const GO_TO_TOP_ID = "move-top-link";

function showOrHideGoTopLink() {
  const goToTopButton = document.querySelector(`#${GO_TO_TOP_ID}`);
  const scrollYPosition = window.scrollY || 0;

  if (goToTopButton == undefined) {
    throw new Error(`Couldnt find "#${GO_TO_TOP_ID}"`);
  }

  if (scrollYPosition > 500) {
    goToTopButton.classList.remove("hidden");
  } else {
    goToTopButton.classList.add("hidden");
  }
}

export default showOrHideGoTopLink;
