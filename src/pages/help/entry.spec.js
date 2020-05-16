jest.mock("./show-or-hide-go-top-link");

import entry from "./entry";
import scrollListenerMock from "./show-or-hide-go-top-link";
import { getAllByRole } from "@testing-library/dom";

describe("entry", () => {
  beforeEach(() => {
    const body = `
        <img id="configs-single-switch" />
        <img id="configs-two-switch" />
        <img id="configs-arrow-keys" />
        <img id="configs-auditory-cues" />
        <img id="recording-audio" />
        <img id="advanced-editing" />
        <div id="table-of-contents"></div>
    `;

    document.body.innerHTML = body;
  });

  it("loads the images correctly", async () => {
    // Arrange
    const singleSwitch = document.getElementById("configs-single-switch");
    const twoSwitch = document.getElementById("configs-two-switch");
    const arrowKeys = document.getElementById("configs-arrow-keys");
    const audioCues = document.getElementById("configs-auditory-cues");
    const recordingAudio = document.getElementById("recording-audio");
    const advancedEditing = document.getElementById("advanced-editing");

    // Act
    await entry();

    // Assert
    expect(singleSwitch.src).toStrictEqual(
      expect.stringContaining("configs-single-switch.gif")
    );
    expect(twoSwitch.src).toStrictEqual(
      expect.stringContaining("configs-two-switch.gif")
    );
    expect(arrowKeys.src).toStrictEqual(
      expect.stringContaining("configs-arrow-keys.gif")
    );
    expect(audioCues.src).toStrictEqual(
      expect.stringContaining("configs-auditory-cues.gif")
    );
    expect(recordingAudio.src).toStrictEqual(
      expect.stringContaining("recording-audio.gif")
    );
    expect(advancedEditing.src).toStrictEqual(
      expect.stringContaining("advanced-editing.gif")
    );
  });

  it("listens for the scroll event", async () => {
    // Arrange
    await entry();

    // Act
    document.dispatchEvent(new CustomEvent("scroll"));

    // Assert
    expect(scrollListenerMock).toBeCalledTimes(1);
  });

  it("puts a list in the table of contents", async () => {
    await entry();

    const tableOfContents = document.getElementById("table-of-contents");

    const lists = getAllByRole(tableOfContents, "list");

    expect(lists[0].tagName).toStrictEqual("OL");
  });
});
