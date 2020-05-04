/** Waits for a dom event to happen before continueing, means you can using async await */

const waitForEvent = (eventString) => {
  if (!eventString)
    throw new Error("You need to specify event string to wait for");

  return new Promise((res) => {
    document.addEventListener(
      eventString,
      () => {
        res();
      },
      { once: true }
    );
  });
};

export default waitForEvent;
