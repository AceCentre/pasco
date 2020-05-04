import waitForEvent from "./waitForEvent";

document.addEventListener = jest.fn((_, cb) => cb());

describe("waitForEvent", () => {
  beforeEach(() => {
    document.addEventListener.mockClear();
  });

  it("throws an error if called without an event", () => {
    expect(waitForEvent).toThrow(
      "You need to specify event string to wait for"
    );
  });

  it("calls addEventListener with the event name", async () => {
    const EVENT = "EVENT";

    const documentAddEventListenerSpy = jest.spyOn(
      document,
      "addEventListener"
    );

    await waitForEvent(EVENT);

    expect(documentAddEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(documentAddEventListenerSpy).toHaveBeenLastCalledWith(
      EVENT,
      expect.anything(),
      expect.anything()
    );
  });

  it("calls addEventListener with the once property set", async () => {
    const EVENT = "EVENT";

    const documentAddEventListenerSpy = jest.spyOn(
      document,
      "addEventListener"
    );

    await waitForEvent(EVENT);

    expect(documentAddEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(documentAddEventListenerSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      {
        once: true,
      }
    );
  });
});
