import showOrHideGoToTopLink from "./show-or-hide-go-top-link";
import { getByText } from "@testing-library/dom";
import "@testing-library/jest-dom/extend-expect";

describe("showOrHideGoToTopLink", () => {
  it("Throws an error if it cant find the go to top link", () => {
    expect(showOrHideGoToTopLink).toThrow('Couldnt find "#move-top-link"');
  });

  it("Adds hidden class if scroll position is under 500", () => {
    // Arrange
    document.body.innerHTML = '<a id="move-top-link">Go to top link</a>';
    window.scrollY = 1;

    // Act
    showOrHideGoToTopLink();

    // Assert
    const link = getByText(document, "Go to top link");
    expect(link).toHaveClass("hidden");
  });

  it("Removes hidden class if scroll position is under 500", () => {
    // Arrange
    document.body.innerHTML =
      '<a id="move-top-link" class="hidden">Go to top link</a>';
    window.scrollY = 501;

    // Act
    showOrHideGoToTopLink();

    // Assert
    const link = getByText(document, "Go to top link");
    expect(link).not.toHaveClass("hidden");
  });

  it("Adds hidden class if scroll position isnt defined", () => {
    // Arrange
    document.body.innerHTML = '<a id="move-top-link">Go to top link</a>';
    window.scrollY = undefined;

    // Act
    showOrHideGoToTopLink();

    // Assert
    const link = getByText(document, "Go to top link");
    expect(link).toHaveClass("hidden");
  });
});
